from typing import List, Tuple, Dict, Any, Optional
import fitz  # PyMuPDF
from io import BytesIO

def pdf_read(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()

def pdf_render_pages_to_png(path: str, dpi: int = 300) -> List[bytes]:
    """Return list of PNG bytes, one per page, opaque RGB, rotation-normalized."""
    doc = fitz.open(path)
    out = []
    for page in doc:
        # Normalize rotation to 0°
        rot = page.rotation
        if rot != 0:
            page.set_rotation(0)  # only affects rendering, not the file
        pix = page.get_pixmap(dpi=dpi, alpha=False)
        out.append(pix.tobytes("png"))
    return out

def list_widgets(path: str) -> List[Dict[str, Any]]:
    """Return AcroForm-like widgets (if present) with page index and rect."""
    doc = fitz.open(path)
    results = []
    for page_index, page in enumerate(doc):
        if not hasattr(page, "widgets") or page.widgets is None:
            continue
        for w in page.widgets():
            rect = [w.rect.x0, w.rect.y0, w.rect.x1, w.rect.y1]
            results.append({
                "page": page_index,
                "rect": rect,
                "name": getattr(w, "field_name", None),
                "type": getattr(w, "field_type", None),
                "value": getattr(w, "field_value", None),
            })
    return results

def overlay_texts(path: str, outputs: List[Dict[str, Any]], out_path: str) -> str:
    """
    outputs: [{page, rect:[x0,y0,x1,y1], text, fontsize=11, align='left'|'center', vpad=2}]
    Writes text into rectangles and saves as flattened PDF.
    """
    doc = fitz.open(path)
    for item in outputs:
        page = doc[item["page"]]
        x0, y0, x1, y1 = item["rect"]
        rect = fitz.Rect(x0, y0, x1, y1)
        fontsize = item.get("fontsize", 11)
        align = item.get("align", "left")
        vpad = item.get("vpad", 2)
        # Simple multiline fill:
        page.insert_textbox(rect, item["text"], fontsize=fontsize, align={"left":0, "center":1, "right":2}.get(align,0))
    doc.save(out_path)
    return out_path
