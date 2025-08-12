import json
from typing import Dict, Any, List
from . import textract_utils as tx
from . import pdf_utils as pdfu
from . import mapping
from . import vision_refinement

class ExtractionError(Exception): pass

def extract_fields_pipeline(pdf_path: str) -> Dict[str, Any]:
    pdf_bytes = pdfu.pdf_read(pdf_path)
    widgets = pdfu.list_widgets(pdf_path)

    if len(pdf_bytes) > 4_500_000:
        imgs = pdfu.pdf_render_pages_to_png(pdf_path, dpi=300)
        pages = [{"blocks": tx.analyze_image_bytes(b).get("Blocks", [])} for b in imgs]
        return {"widgets": widgets, "textract": {"pages": pages}, "mode": "image", "pdf_path": pdf_path}

    try:
        r = tx.analyze_pdf_bytes(pdf_bytes)
        blocks = r.get("Blocks", [])
        if blocks:
            return {
                "widgets": widgets,
                "textract": {"pages": [{"blocks": blocks}]},
                "mode": "pdf",
                "pdf_path": pdf_path,
            }
    except Exception:
        pass

    imgs = pdfu.pdf_render_pages_to_png(pdf_path, dpi=300)
    pages = [{"blocks": tx.analyze_image_bytes(b).get("Blocks", [])} for b in imgs]
    return {"widgets": widgets, "textract": {"pages": pages}, "mode": "image", "pdf_path": pdf_path}

def map_labels_to_widgets(extraction: Dict[str,Any]) -> List[Dict[str,Any]]:
    """
    Use Textract text to label widgets (if any), then refine with Vision (optional).
    """
    widgets = extraction.get("widgets", [])
    pages = extraction.get("textract", {}).get("pages", [])
    if not widgets:
        return []

    # 1) Heuristic/postprocess pass (multiword join, colon preference, header filter)
    labeled = mapping.postprocess_fields(pages, widgets)

    # 2) Optional Vision refinement (USE_VISION=1)
    pdf_path = extraction.get("pdf_path")
    try:
        if pdf_path:
            labeled = vision_refinement.refine_labels_with_vision(pdf_path, labeled)
    except Exception:
        # Never block extraction on Vision errors
        pass

    return labeled

def fill_fields_and_save(pdf_path: str, answers: Dict[str, str], field_defs: List[Dict[str,Any]], out_path: str) -> str:
    """
    Fill PDF using provided answers.
      - If original has widgets that match names/ids, best-effort overlay (fast path).
      - Else overlay text at rects defined in field_defs.
    """
    overlays = []
    for f in field_defs:
        fid = f.get("name") or f.get("id")
        if not fid:
            continue
        val = answers.get(fid)
        if val is None:
            continue
        overlays.append({
            "page": f["page"],
            "rect": f["rect"],
            "text": str(val),
            "fontsize": 11,
            "align": "left",
        })
    return pdfu.overlay_texts(pdf_path, overlays, out_path)
