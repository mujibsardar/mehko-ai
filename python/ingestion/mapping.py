from typing import List, Dict, Any, Optional, Tuple
import math

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
