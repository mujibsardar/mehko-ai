import json
from typing import Dict, Any, List
from . import textract_utils as tx
from . import pdf_utils as pdfu
from . import mapping

class ExtractionError(Exception): pass

def extract_fields_pipeline(pdf_path: str) -> Dict[str, Any]:
    """
    1) Try Textract on original PDF (may fail for some weird PDFs).
    2) If it fails with UnsupportedDocumentException, rasterize pages to PNG and analyze each image.
    3) If PDF has widgets (AcroForms), use them as field rects; else you can infer later.
    Returns:
      {
        "widgets": [{page,rect,name,type,value}],
        "textract": { "pages": [ {"blocks":[...]} ] }
      }
    """
    pdf_bytes = pdfu.pdf_read(pdf_path)

    # Step 0: widgets, if any (cheap and helpful even if Textract fails)
    widgets = pdfu.list_widgets(pdf_path)

    # Step 1: try Textract on PDF
    try:
        r = tx.analyze_pdf_bytes(pdf_bytes)
        blocks = r.get("Blocks", [])
        if blocks:
            return {"widgets": widgets, "textract": {"pages":[{"blocks":blocks}]}, "mode":"pdf"}
    except Exception as e:
        msg = str(e)

    # Step 2: rasterize → Textract per image
    imgs = pdfu.pdf_render_pages_to_png(pdf_path, dpi=300)
    pages = []
    for b in imgs:
        rr = tx.analyze_image_bytes(b)
        pages.append({"blocks": rr.get("Blocks", [])})

    if not pages:
        raise ExtractionError("Textract returned no content for any page.")
    return {"widgets": widgets, "textract": {"pages": pages}, "mode":"image"}

def map_labels_to_widgets(extraction: Dict[str,Any]) -> List[Dict[str,Any]]:
    """
    Use Textract text to label widgets (if any).
    """
    widgets = extraction.get("widgets", [])
    pages = extraction.get("textract", {}).get("pages", [])
    if not widgets:
        return []  # Up to you: implement non-widget field detection later.

    # Flatten all blocks by page (Textract uses 1-based Page index)
    all_blocks = []
    for i, p in enumerate(pages, start=1):
        for b in p.get("blocks", []):
            if "Page" not in b:
                b["Page"] = i
            all_blocks.append(b)

    labeled = mapping.attach_labels_to_fields(all_blocks, widgets)
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
