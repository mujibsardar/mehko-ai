from typing import List, Dict, Any, Optional, Tuple
import re, math, unicodedata

NOISE_RE = re.compile(
    r"""^(?:page\s*\d+\s*of\s*\d+|page|of|\d{1,3}$|pdf|form|[-–—]+)$""",
    re.IGNORECASE | re.VERBOSE
)

def _join_line_words(blocks):
    """Group WORDs into merged LINEs before label matching."""
    merged = []
    lines_by_page_y = {}
    for b in blocks:
        page = b.get("Page", 1) - 1
        if b.get("BlockType") == "LINE":
            merged.append(b)
        elif b.get("BlockType") == "WORD":
            bb = b["Geometry"]["BoundingBox"]
            y_center = round(bb["Top"] + bb["Height"] / 2, 3)
            lines_by_page_y.setdefault((page, y_center), []).append(b)

    for (page, _), words in lines_by_page_y.items():
        words.sort(key=lambda w: w["Geometry"]["BoundingBox"]["Left"])
        text = " ".join(w["Text"] for w in words if w.get("Text"))
        bb0 = min(w["Geometry"]["BoundingBox"]["Left"] for w in words)
        bb1 = max(w["Geometry"]["BoundingBox"]["Left"] + w["Geometry"]["BoundingBox"]["Width"] for w in words)
        by0 = min(w["Geometry"]["BoundingBox"]["Top"] for w in words)
        by1 = max(w["Geometry"]["BoundingBox"]["Top"] + w["Geometry"]["BoundingBox"]["Height"] for w in words)
        merged.append({
            "BlockType": "LINE",
            "Page": words[0]["Page"],
            "Text": text,
            "Geometry": {"BoundingBox": {
                "Left": bb0,
                "Top": by0,
                "Width": bb1 - bb0,
                "Height": by1 - by0
            }}
        })
    return merged

def slugify(t: str) -> str:
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode("ascii")
    t = re.sub(r"[^a-zA-Z0-9]+", "-", t.strip()).strip("-").lower()
    return t or "field"

def _nearest_right_label(blocks, page_idx, field_rect, y_tol=0.03, min_dx=0.004, max_dx=0.35):
    blocks = _join_line_words(blocks)
    fx0, fy0, fx1, fy1 = field_rect
    fcy = (fy0 + fy1) / 2
    best = None
    for b in blocks:
        if b.get("BlockType") != "LINE": continue
        if (b.get("Page", 1) - 1) != page_idx: continue
        bb = b["Geometry"]["BoundingBox"]
        bx0, by0, bw, bh = bb["Left"], bb["Top"], bb["Width"], bb["Height"]
        bcy = by0 + bh / 2
        if abs(bcy - fcy) > y_tol: continue
        if bx0 < fx1: continue
        dx = bx0 - fx1
        if not (min_dx <= dx <= max_dx): continue
        txt = (b.get("Text") or "").strip()
        if not txt or NOISE_RE.match(txt): continue
        if txt.isupper() and not txt.endswith(":"): continue
        cand = (dx, len(txt), txt.endswith(":"), txt)
        if best is None or cand < best:
            best = cand
    return best[3] if best else None

def _nearest_label_left_or_above(blocks, page_idx, field_rect, max_dist=0.25, above_tol=0.12):
    blocks = _join_line_words(blocks)
    fx0, fy0, fx1, fy1 = field_rect
    fcx, fcy = (fx0 + fx1) / 2, (fy0 + fy1) / 2
    best = None
    for b in blocks:
        if b.get("BlockType") != "LINE": continue
        if (b.get("Page", 1) - 1) != page_idx: continue
        bb = b["Geometry"]["BoundingBox"]
        bx0, by0, bw, bh = bb["Left"], bb["Top"], bb["Width"], bb["Height"]
        bx1, by1 = bx0 + bw, by0 + bh
        bcx, bcy = bx0 + bw / 2, by0 + bh / 2
        txt = (b.get("Text") or "").strip()
        if not txt or NOISE_RE.match(txt) or len(txt.split()) > 10:
            continue
        left = (bx1 <= fx0) and not (by1 < fy0 or by0 > fy1)
        above = (by1 <= fy0) and ((fy0 - by1) <= above_tol)
        if not (left or above):
            continue
        d = ((bcx - fcx) ** 2 + (bcy - fcy) ** 2) ** 0.5
        if d > max_dist: continue
        if txt.isupper() and not txt.endswith(":"): continue
        cand = (d, not txt.endswith(":"), len(txt), txt)
        if best is None or cand < best:
            best = cand
    return best[3] if best else None

def _detect_section_headers(blocks, min_width=0.20):
    headers = []
    for b in blocks:
        if b.get("BlockType") != "LINE": continue
        txt = b.get("Text","").strip()
        if not txt or NOISE_RE.match(txt): continue
        if not (txt.isupper() and 3 <= len(txt) <= 20): continue
        bb = b["Geometry"]["BoundingBox"]
        if bb["Width"] < min_width: continue
        headers.append({"page": b.get("Page",1)-1, "y": bb["Top"], "text": txt})
    headers.sort(key=lambda h: (h["page"], h["y"]))
    return headers

def _closest_prev_header(headers, page, top_y):
    prev = [h for h in headers if h["page"]==page and h["y"]<=top_y]
    return prev[-1]["text"] if prev else None

def postprocess_fields(block_pages: List[Dict[str,Any]], fields: List[Dict[str,Any]]):
    blocks = []
    for i, p in enumerate(block_pages, start=1):
        for b in p.get("blocks", []):
            if "Page" not in b: b["Page"] = i
            blocks.append(b)

    headers = _detect_section_headers(blocks)
    used = {}
    out = []

    for f in fields:
        page = f["page"]
        rect = f["rect"]
        if max(rect) > 1:
            rel = [rect[0]/612.0, rect[1]/792.0, rect[2]/612.0, rect[3]/792.0]
        else:
            rel = rect

        name = (f.get("name") or "").strip()
        ftype = f.get("type")
        label = f.get("label")
        section = _closest_prev_header(headers, page, rel[1])

        if ftype == 2:
            label = _nearest_right_label(blocks, page, rel) or label
        else:
            label = _nearest_label_left_or_above(blocks, page, rel) or label

        if not name or name.startswith("undefined"):
            name = slugify(label) if label else name or "field"

        if section:
            name = f"{name}_{slugify(section)}"

        base = name
        n = used.get(base, 0)
        if n:
            name = f"{base}-{n+1}"
        used[base] = n+1

        out.append({**f, "name": name, "section": section, "label": label})
    return out
