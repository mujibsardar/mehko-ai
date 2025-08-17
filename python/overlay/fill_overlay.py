import fitz
from typing import Dict, Any, List
ALIGN={"left":0,"center":1,"right":2}

def _clear_all_widgets(doc: fitz.Document):
    for p in doc:
        for w in (p.widgets() or []):
            try: p.delete_widget(w)
            except Exception: pass

def _bg(p: fitz.Page, r: List[float], color=(1,1,1)):
    p.draw_rect(fitz.Rect(*r), fill=color, width=0, overlay=True)

def _checkbox(p: fitz.Page, rect: List[float], v: bool):
    R = fitz.Rect(*rect)
    p.draw_rect(R, width=1.0, color=(0,0,0), overlay=True)
    if v:
        p.draw_line(R.tl, R.br, width=1.5, color=(0,0,0), overlay=True)
        p.draw_line(R.tr, R.bl, width=1.5, color=(0,0,0), overlay=True)

def _text(p: fitz.Page, rect: List[float], text: str, size=11, align="left", shrink=True):
    R = fitz.Rect(*rect)
    if not text: return
    for fs in (size, 12, 11, 10, 9, 8) if shrink else (size,):
        placed = p.insert_textbox(R, text, fontsize=float(fs),
                                  fontname="Helvetica", color=(0,0,0),
                                  align=ALIGN.get(align,0), overlay=True)
        if placed > 0: return
    p.insert_text(R.tl, text, fontsize=8, fontname="Helvetica", color=(0,0,0))

def fill_pdf_overlay_bytes(pdf_bytes: bytes, overlay: Dict[str,Any], answers: Dict[str,Any]) -> bytes:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    _clear_all_widgets(doc)
    for f in overlay.get("fields", []):
        fid = f["id"]; val = answers.get(fid)
        if val in (None, ""): continue
        page = doc[int(f["page"])]

        ftype = (f.get("type","text") or "text").lower()
        if ftype == "checkbox":
            _checkbox(page, f["rect"], bool(val))
            continue

        txt = str(val)
        if f.get("uppercase"): txt = txt.upper()
        if f.get("bg"): _bg(page, f["rect"])  # white-out under text if needed

        _text(page, f["rect"], txt,
              size=float(f.get("fontSize", 11)),
              align=str(f.get("align","left")),
              shrink=bool(f.get("shrink", True)))
    return doc.tobytes(deflate=True, garbage=4)
