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

def _signature(p: fitz.Page, rect: List[float], name: str):
    """Generate a curvy signature from the user's name"""
    R = fitz.Rect(*rect)
    if not name or not name.strip():
        return
    
    # Clean the name
    name = name.strip()
    
    # Generate signature path data based on name
    signature_path = _generate_signature_path(name, R)
    
    # Draw the signature using proper PyMuPDF path methods
    if len(signature_path) >= 2:
        # Create a path object
        path = fitz.Path()
        
        # Start the path at the first point
        path.move_to(signature_path[0][0], signature_path[0][1])
        
        # Add curve segments
        for i in range(1, len(signature_path)):
            x, y = signature_path[i]
            path.line_to(x, y)
        
        # Draw the path
        p.draw_path(path, color=(0,0,0), width=1.5, fill_opacity=0, overlay=True)

def _generate_signature_path(name: str, rect: fitz.Rect) -> List[tuple]:
    """Generate a curvy signature path based on the name"""
    # Enhanced signature generation algorithm
    # Creates flowing curves that look like a real signature
    
    # Get name length for path complexity
    name_len = len(name)
    
    # Calculate base dimensions
    width = rect.width
    height = rect.height
    x0 = rect.x0 + width * 0.1
    y0 = rect.y0 + height * 0.5
    
    # Generate more realistic signature curves
    if name_len > 10:
        # Longer names get more complex curves with multiple loops
        points = [
            (x0, y0),  # Start
            (x0 + width * 0.15, y0 - height * 0.2),  # First curve up
            (x0 + width * 0.3, y0 + height * 0.1),   # Curve down
            (x0 + width * 0.45, y0 - height * 0.15), # Curve up
            (x0 + width * 0.6, y0 + height * 0.2),   # Curve down
            (x0 + width * 0.75, y0 - height * 0.1),  # Curve up
            (x0 + width * 0.9, y0 + height * 0.15),  # End curve
        ]
    else:
        # Shorter names get simpler curves
        points = [
            (x0, y0),  # Start
            (x0 + width * 0.25, y0 - height * 0.15), # Curve up
            (x0 + width * 0.5, y0 + height * 0.1),   # Curve down
            (x0 + width * 0.75, y0 - height * 0.1),  # Curve up
            (x0 + width * 0.9, y0 + height * 0.1),   # End
        ]
    
    return points

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
        elif ftype == "signature":
            _signature(page, f["rect"], str(val))
            continue

        txt = str(val)
        if f.get("uppercase"): txt = txt.upper()
        if f.get("bg"): _bg(page, f["rect"])  # white-out under text if needed

        _text(page, f["rect"], txt,
              size=float(f.get("fontSize", 11)),
              align=str(f.get("align","left")),
              shrink=bool(f.get("shrink", True)))
    return doc.tobytes(deflate=True, garbage=4)
