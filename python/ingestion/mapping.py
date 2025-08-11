from typing import List, Dict, Any, Optional, Tuple
import re, math, unicodedata

NOISE_RE = re.compile(
    r"""^(?:page\s*\d+\s*of\s*\d+|page|of|\d{1,3}$|pdf|form|[-–—]+)$""",
    re.IGNORECASE | re.VERBOSE
)

def _center(rect):  # [x0,y0,x1,y1]
    return ((rect[0]+rect[2])/2.0, (rect[1]+rect[3])/2.0)

def _is_left_or_above(label_bbox, field_bbox) -> bool:
    # Favor left first; else above
    return (label_bbox[2] <= field_bbox[0]) or (label_bbox[3] <= field_bbox[1])

def attach_labels_to_fields(textract_blocks: List[Dict[str,Any]],
                            fields: List[Dict[str,Any]],
                            page_width_height: Optional[Tuple[int,int]]=None,
                            max_dist: float = 150.0):
    """
    Given Textract blocks and a list of fields (with page & rect),
    assign a short nearby label for each field.
    """
    # Collect candidate text blocks with their bboxes per page
    by_page = {}
    for b in textract_blocks:
        if b.get("BlockType") in ("LINE","WORD"):
            page = b.get("Page", 1) - 1
            bbox = b.get("Geometry", {}).get("BoundingBox")
            if not bbox: 
                continue
            # Convert relative bbox [0..1] to absolute if page dims known; otherwise keep relative.
            by_page.setdefault(page, []).append({
                "text": b.get("Text","").strip(),
                "bbox": bbox,  # relative; good enough for proximity in same page
            })

    def bbox_distance(a, b):
        ac = (a["bbox"]["Left"] + a["bbox"]["Width"]/2, a["bbox"]["Top"] + a["bbox"]["Height"]/2)
        bc = (b[0]+b[2])/2, (b[1]+b[3])/2  # assume field rect already normalized to relative (0..1)
        return math.hypot(ac[0]-bc[0], ac[1]-bc[1])

    labeled = []
    for f in fields:
        page = f["page"]
        field_rect_abs = f["rect"]
        # Normalize to relative if no page dims; assume already relative if values <= 1
        if max(field_rect_abs) > 1 and page_width_height:
            w, h = page_width_height
            field_rect = [field_rect_abs[0]/w, field_rect_abs[1]/h,
                          field_rect_abs[2]/w, field_rect_abs[3]/h]
        else:
            field_rect = field_rect_abs

        candidates = []
        for t in by_page.get(page, []):
            if not t["text"]:
                continue
            if len(t["text"].split()) > 10:  # keep labels short-ish
                continue
            if not _is_left_or_above(
                [t["bbox"]["Left"], t["bbox"]["Top"],
                 t["bbox"]["Left"]+t["bbox"]["Width"],
                 t["bbox"]["Top"]+t["bbox"]["Height"]],
                field_rect
            ):
                continue
            d = bbox_distance(t, field_rect)
            candidates.append((d, t["text"]))

        candidates.sort(key=lambda x: x[0])
        label = candidates[0][1] if candidates else None
        labeled.append({**f, "label": label, "label_candidates": [c[1] for c in candidates[:5]]})
    return labeled

def slugify(t: str) -> str:
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode("ascii")
    t = re.sub(r"[^a-zA-Z0-9]+", "-", t.strip()).strip("-").lower()
    return t or "field"

def _nearest_right_label(blocks, page_idx, field_rect, y_tol=0.03, min_dx=0.004, max_dx=0.35):
    """Prefer LINE to the right on the same row band."""
    fx0, fy0, fx1, fy1 = field_rect
    fcy = (fy0 + fy1) / 2
    best = None
    for b in blocks:
        if b.get("BlockType") != "LINE":
            continue
        if (b.get("Page", 1) - 1) != page_idx:
            continue
        bb = b["Geometry"]["BoundingBox"]
        bx0, by0, bw, bh = bb["Left"], bb["Top"], bb["Width"], bb["Height"]
        bcy = by0 + bh / 2
        if abs(bcy - fcy) > y_tol:
            continue
        if bx0 < fx1:
            continue
        dx = bx0 - fx1
        if not (min_dx <= dx <= max_dx):
            continue
        txt = (b.get("Text") or "").strip()
        if not txt or NOISE_RE.match(txt):
            continue
        cand = (dx, len(txt), txt)
        if best is None or cand < best:
            best = cand
    return best[2] if best else None

def _nearest_label_left_or_above(blocks, page_idx, field_rect, max_dist=0.18, above_tol=0.09):
    """Prefer LEFT on same band; else ABOVE within window."""
    fx0, fy0, fx1, fy1 = field_rect
    fcx, fcy = (fx0 + fx1) / 2, (fy0 + fy1) / 2
    best = None
    for b in blocks:
        if b.get("BlockType") not in ("LINE", "WORD"):
            continue
        if (b.get("Page", 1) - 1) != page_idx:
            continue
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
        if d > max_dist:
            continue
        cand = (d, len(txt), txt)
        if best is None or cand < best:
            best = cand
    return best[2] if best else None

def _detect_section_headers(blocks, min_width=0.20):
    # return per-page list of headers: {page, y, text}
    headers = []
    for b in blocks:
        if b.get("BlockType") != "LINE": continue
        txt = b.get("Text","").strip()
        if not txt or NOISE_RE.match(txt): continue
        if not (txt.isupper() and 3 <= len(txt) <= 20): continue
        bb = b["Geometry"]["BoundingBox"]
        if bb["Width"] < min_width: continue
        headers.append({"page": b.get("Page",1)-1, "y": bb["Top"], "text": txt})
    # sort by page,y
    headers.sort(key=lambda h: (h["page"], h["y"]))
    return headers

def _closest_prev_header(headers, page, top_y):
    prev = [h for h in headers if h["page"]==page and h["y"]<=top_y]
    return prev[-1]["text"] if prev else None

def postprocess_fields(block_pages: List[Dict[str,Any]], fields: List[Dict[str,Any]]):
    # Flatten blocks
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
        # convert abs rect -> relative (rough heuristic if values >1)
        rect = f["rect"]
        if max(rect) > 1:
            # approximate using page size unknown; fall back to relative by normalizing to max extents in page
            # (Textract is relative, PyMuPDF overlay uses abs — we keep original rect for fill, and use relative for label search)
            rx0, ry0, rx1, ry1 = rect
            # assume typical US letter 612x792 to derive relative
            rel = [rx0/612.0, ry0/792.0, rx1/612.0, ry1/792.0]
        else:
            rel = rect

        name = (f.get("name") or "").strip()
        ftype = f.get("type")
        label = f.get("label")
        section = _closest_prev_header(headers, page, rel[1])  # by top y

        # Always recompute label using noise filter
        if ftype == 2:  # checkbox
            label = _nearest_right_label(blocks, page, rel) or label
        else:
            label = _nearest_label_left_or_above(blocks, page, rel) or label

        # If name is undefined, set from label
        if not name or name.startswith("undefined"):
            name = slugify(label) if label else name or "field"

        # Append section suffix
        if section:
            name = f"{name}_{slugify(section)}"

        # Dedupe
        base = name
        n = used.get(base, 0)
        if n:
            name = f"{base}-{n+1}"
        used[base] = n+1

        out.append({**f, "name": name, "section": section, "label": label})
    return out