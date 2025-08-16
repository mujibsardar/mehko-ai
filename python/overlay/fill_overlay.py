import fitz
from typing import Dict, Any, List

ALIGN = {"left": 0, "center": 1, "right": 2}

def _clear_all_widgets(doc: fitz.Document):
    for p in doc:
        for w in (p.widgets() or []):
            try: p.delete_widget(w)
            except Exception: pass

def _checkbox(p: fitz.Page, rect: List[float], v: bool):
    R = fitz.Rect(*rect)
    p.draw_rect(R, width=1.0, color=(0, 0, 0), overlay=True)
    if v:
        p.draw_line(R.tl, R.br, width=1.5, color=(0, 0, 0), overlay=True)
        p.draw_line(R.tr, R.bl, width=1.5, color=(0, 0, 0), overlay=True)

def _text(p, rect, text, size=11, align="left"):
    R = fitz.Rect(*rect)
    R = fitz.Rect(R.x0, R.y0, R.x1, R.y1 + 1)  # tiny vertical cushion
    for fs in (size, 12, 11, 10, 9, 8):
        placed = p.insert_textbox(
            R, text or "", fontsize=float(fs),
            fontname="Helvetica", color=(0,0,0),
            align=ALIGN.get(align,0), overlay=True,
        )
        if placed > 0:
            return
    # last resort: single-line at top-left
    p.insert_text(R.tl, text or "", fontsize=8, fontname="Helvetica", color=(0,0,0))

def fill_pdf_overlay_bytes(pdf_bytes: bytes, overlay: Dict[str, Any], answers: Dict[str, Any]) -> bytes:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    _clear_all_widgets(doc)  # flatten AcroForm so stamped text is visible
    for f in overlay.get("fields", []):
        val = answers.get(f["id"])
        if val in (None, ""): continue
        page = doc[int(f["page"])]
        if (f.get("type", "text").lower()) == "checkbox":
            _checkbox(page, f["rect"], bool(val))
        else:
            _text(page, f["rect"], str(val), size=f.get("fontSize", 11), align=f.get("align", "left"))
    return doc.tobytes(deflate=True, garbage=4)
