import fitz
from typing import Dict, Any, List

ALIGN = {"left":0,"center":1,"right":2}

def _checkbox(p: fitz.Page, r: List[float], v: bool):
    R = fitz.Rect(*r); p.draw_rect(R, width=0.8)
    if v: p.draw_line(R.tl, R.br, width=1.2); p.draw_line(R.tr, R.bl, width=1.2)

def _text(p: fitz.Page, r: List[float], t: str, size=11, align="left"):
    p.insert_textbox(fitz.Rect(*r), t or "", fontsize=float(size), fontname="helv", align=ALIGN.get(align,0), overlay=True)

def fill_pdf_overlay_bytes(pdf_bytes: bytes, overlay: Dict[str, Any], answers: Dict[str, Any]) -> bytes:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    for f in overlay.get("fields", []):
        val = answers.get(f["id"])
        if val in (None, ""): continue
        page = doc[int(f["page"])]
        if (f.get("type","text").lower()) == "checkbox":
            _checkbox(page, f["rect"], bool(val))
        else:
            _text(page, f["rect"], str(val), size=f.get("fontSize",11), align=f.get("align","left"))
    return doc.tobytes(deflate=True, garbage=4)
