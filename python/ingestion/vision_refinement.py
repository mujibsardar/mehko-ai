# python/ingestion/vision_refinement.py
import os, base64, time, re, json, unicodedata
from typing import List, Dict, Any
from dotenv import load_dotenv
from openai import OpenAI
import fitz  # PyMuPDF (only needed if you keep Vision fallback crops)

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ---------------- General helpers ----------------

def _normalize(s: str | None) -> str:
    return " ".join((s or "").strip().split())

NOISE_RE = re.compile(
    r"""^(?:page\s*\d+\s*of\s*\d+|page|of|\d{1,3}$|pdf|form|[-–—]+)$""",
    re.IGNORECASE | re.VERBOSE
)

# Short labels valid across many forms (so we don't treat them as truncations)
SHORT_OK = {"ZIP:", "CITY:", "UNIT:", "STATE:", "DOB:", "SSN:", "ID:"}

# Optional external whitelist:
# export LABEL_WHITELIST_PATH=/path/to/labels.json  # {"whitelist":[...], "short_ok":[...]}
LABEL_WHITELIST: set[str] = set()

def _load_label_config():
    path = os.getenv("LABEL_WHITELIST_PATH")
    if not path:
        return
    try:
        with open(path, "r") as f:
            cfg = json.load(f)
        LABEL_WHITELIST.update(cfg.get("whitelist", []))
        SHORT_OK.update(cfg.get("short_ok", []))
        print(f"[VISION] Loaded label config from {path}: "
              f"{len(LABEL_WHITELIST)} whitelist, {len(SHORT_OK)} short_ok")
    except Exception as e:
        print(f"[VISION] Could not load LABEL_WHITELIST_PATH={path}: {e}")

_load_label_config()

def _is_suspect(label: str | None) -> bool:
    t = _normalize(label)
    if not t:
        return True
    if t in LABEL_WHITELIST:
        return False
    if t.endswith(":"):
        core = t[:-1].strip()
        if len(core.split()) == 1 and t not in SHORT_OK:
            return True
    if len(t) < 6 and t not in SHORT_OK:
        return True
    if not t.endswith(":"):
        return True
    if "," in t or "." in t:
        return True
    if t.lower() in {"information", "name", "zip", "city", "page", "state", "value", "application"}:
        return True
    return False

# ---------------- Vision fallback (optional) ----------------

def _crop_for_label(pdf_path: str, page_idx: int, rect: List[float], ftype: int, dpi: int = 200) -> bytes:
    doc = fitz.open(pdf_path)
    pg = doc[page_idx]
    x0, y0, x1, y1 = rect
    if ftype == 2:  # checkbox -> label to the right
        ctx = fitz.Rect(x1 + 8, y0 - 12, x1 + 260, y1 + 12)
    else:  # text -> label to the left (slightly above)
        ctx = fitz.Rect(x0 - 320, y0 - 30, x0 + 24, y1 + 24)
    ctx = (ctx & pg.rect)
    pix = pg.get_pixmap(clip=ctx, dpi=dpi, alpha=False)
    return pix.tobytes("png")

def _ask_vision_label(img_png_bytes: bytes) -> str:
    b64 = base64.b64encode(img_png_bytes).decode("utf-8")
    prompt = "Return ONLY the printed label text for this form field (include the trailing colon if present)."
    for attempt in range(3):
        try:
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}
                    ],
                }],
                max_tokens=16,
            )
            out = (resp.choices[0].message.content or "").strip()
            if out and not out.endswith(":") and len(out.split()) <= 5:
                out += ":"
            return _normalize(out)
        except Exception as e:
            msg = str(e)
            if "rate_limit" in msg or "429" in msg:
                time.sleep(0.4 * (attempt + 1))
                continue
            raise
    return ""

def refine_labels_with_vision(pdf_path: str, fields: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if os.getenv("USE_VISION") != "1":
        return fields
    for f in fields:
        current = _normalize(f.get("label"))
        if current in LABEL_WHITELIST:
            continue
        if not _is_suspect(current):
            continue
        try:
            img = _crop_for_label(pdf_path, f["page"], f["rect"], f.get("type", 7))
            new_label = _ask_vision_label(img)
            if new_label:
                f["label"] = _normalize(new_label)
        except Exception as e:
            print(f"[VISION] skip {f.get('name')}: {e}")
    return fields

# ---------------- WORD-level spans (the new core idea) ----------------

def _group_words_into_lines(blocks: List[Dict[str, Any]]):
    lines = {}
    for b in blocks:
        if b.get("BlockType") != "WORD":
            continue
        page = (b.get("Page", 1) - 1)
        bb = b["Geometry"]["BoundingBox"]
        y_center = round(bb["Top"] + bb["Height"] / 2, 3)
        lines.setdefault((page, y_center), []).append(b)
    for key in list(lines.keys()):
        lines[key].sort(key=lambda w: w["Geometry"]["BoundingBox"]["Left"])
    return lines

def _label_spans_from_blocks(block_pages: List[Dict[str, Any]]):
    """
    Cut each text line at tokens that end with ':' to form distinct label spans,
    e.g., 'BUSINESS ADDRESS:', 'UNIT:', 'CITY:', 'ZIP CODE:' on the same row.
    """
    words = []
    for i, p in enumerate(block_pages, start=1):
        for b in p.get("blocks", []):
            if "Page" not in b: b["Page"] = i
            if b.get("BlockType") == "WORD":
                words.append(b)

    lines = _group_words_into_lines(words)
    spans_by_page: Dict[int, List[Dict[str, Any]]] = {}

    for (page, y), line_words in lines.items():
        spans = []
        seg_start = 0
        for i, w in enumerate(line_words):
            txt = w.get("Text") or ""
            if txt.endswith(":"):
                seg_words = line_words[seg_start:i+1]
                text = _normalize(" ".join(sw.get("Text","") for sw in seg_words))
                if not text or NOISE_RE.match(text):
                    seg_start = i + 1
                    continue
                left = min(sw["Geometry"]["BoundingBox"]["Left"] for sw in seg_words)
                right = max(sw["Geometry"]["BoundingBox"]["Left"] + sw["Geometry"]["BoundingBox"]["Width"] for sw in seg_words)
                top = min(sw["Geometry"]["BoundingBox"]["Top"] for sw in seg_words)
                bottom = max(sw["Geometry"]["BoundingBox"]["Top"] + sw["Geometry"]["BoundingBox"]["Height"] for sw in seg_words)
                spans.append({"text": text, "bbox": [left, top, right, bottom], "y_center": y})
                seg_start = i + 1
        if spans:
            spans_by_page.setdefault(page, []).extend(spans)

    return spans_by_page

def _assign_label_from_spans(spans: List[Dict[str, Any]], field_rect: List[float], ftype: int) -> str | None:
    fx0, fy0, fx1, fy1 = field_rect
    fcx, fcy = (fx0 + fx1) / 2, (fy0 + fy1) / 2

    row = [sp for sp in spans if abs(((sp["bbox"][1] + sp["bbox"][3]) / 2) - fcy) <= 0.03]

    best = None
    choice = None
    if ftype == 2:
        # checkbox: label to the RIGHT of the box
        for sp in row:
            sx0, sy0, sx1, sy1 = sp["bbox"]
            if sx0 >= fx1:
                dx = sx0 - fx1
                cand = (dx, -len(sp["text"]), sp["text"])
                if best is None or cand < best:
                    best = cand; choice = sp
    else:
        # text: label to the LEFT of the field
        for sp in row:
            sx0, sy0, sx1, sy1 = sp["bbox"]
            if sx1 <= fx0:
                dx = fx0 - sx1
                cand = (dx, -len(sp["text"]), sp["text"])
                if best is None or cand < best:
                    best = cand; choice = sp
        # fallback: just above
        if choice is None:
            best = None
            for sp in spans:
                sx0, sy0, sx1, sy1 = sp["bbox"]
                if sy1 <= fy0 and (fy0 - sy1) <= 0.08:
                    dy = fy0 - sy1
                    hx = abs(((sx0 + sx1) / 2) - fcx)
                    cand = (dy, hx, -len(sp["text"]), sp["text"])
                    if best is None or cand < best:
                        best = cand; choice = sp

    return choice["text"] if choice else None

# ---------------- Section headers ----------------

def _detect_section_headers(blocks, min_width=0.18):
    headers = []
    for b in blocks:
        if b.get("BlockType") != "LINE": continue
        txt = _normalize(b.get("Text"))
        if not txt or NOISE_RE.match(txt): continue
        if not (txt.isupper() and 3 <= len(txt) <= 20): continue
        bb = b["Geometry"]["BoundingBox"]
        if bb["Width"] < min_width: continue
        headers.append({"page": b.get("Page", 1) - 1, "y": bb["Top"], "text": txt})
    headers.sort(key=lambda h: (h["page"], h["y"]))
    return headers

def _closest_prev_header(headers, page, top_y):
    prev = [h for h in headers if h["page"] == page and h["y"] <= top_y]
    return prev[-1]["text"] if prev else None

def slugify(t: str) -> str:
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode("ascii")
    t = re.sub(r"[^a-zA-Z0-9]+", "-", t.strip()).strip("-").lower()
    return t or "field"

# ---------------- Main: postprocess_fields (NEW CORE) ----------------

def postprocess_fields(block_pages: List[Dict[str, Any]], fields: List[Dict[str, Any]]):
    """
    NEW CORE: derive labels by cutting each text line into labeled spans ending with ':'
    and assign spans to fields by row + left/right proximity. This fixes multi-label rows.
    """
    # Flatten blocks with page indexes normalized
    blocks = []
    for i, p in enumerate(block_pages, start=1):
        for b in p.get("blocks", []):
            if "Page" not in b: b["Page"] = i
            blocks.append(b)

    spans_by_page = _label_spans_from_blocks(block_pages)
    headers = _detect_section_headers(blocks)

    used: Dict[str, int] = {}
    out: List[Dict[str, Any]] = []

    for f in fields:
        page = f["page"]
        rect = f["rect"]

        # Use relative coords to match Textract WORD bboxes
        if max(rect) > 1:
            rel = [rect[0] / 612.0, rect[1] / 792.0, rect[2] / 612.0, rect[3] / 792.0]
        else:
            rel = rect

        name = (f.get("name") or "").strip()
        ftype = f.get("type") or 7
        label = f.get("label")

        # Section (if any)
        section = _closest_prev_header(headers, page, rel[1])

        # PRIMARY: label from spans (row cut by ':')
        label_from_spans = _assign_label_from_spans(spans_by_page.get(page, []), rel, ftype)
        if label_from_spans:
            label = label_from_spans

        # Stabilize name
        if not name or name.startswith("undefined"):
            name = slugify(label) if label else name or "field"
        if section:
            name = f"{name}_{slugify(section)}"

        base = name
        n = used.get(base, 0)
        if n:
            name = f"{base}-{n+1}"
        used[base] = n + 1

        out.append({**f, "name": name, "section": section, "label": label})

    return out
