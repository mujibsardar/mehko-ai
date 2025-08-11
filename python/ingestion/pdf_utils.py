from typing import List, Dict, Any
from PIL import Image, ImageDraw
import io, fitz

def pdf_preview_with_highlight(path, page, rect, context="field", pad=8, context_pad=120, dpi=200):
    doc = fitz.open(path)
    pg = doc[page]
    r = fitz.Rect(*rect)

    # Build context rect (centered) and clamp to page
    if context == "section":
        cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
        ctx = fitz.Rect(cx - context_pad, cy - context_pad, cx + context_pad, cy + context_pad)
    else:  # field
        ctx = fitz.Rect(r.x0 - pad, r.y0 - pad, r.x1 + pad, r.y1 + pad)
    ctx = ctx & pg.rect  # clamp to page bounds

    # Render crop
    pix = pg.get_pixmap(clip=ctx, dpi=dpi, alpha=False)
    img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGBA")

    # Compute highlight coords in *pixels* (account for DPI scale)
    sx = img.width  / (ctx.x1 - ctx.x0)
    sy = img.height / (ctx.y1 - ctx.y0)
    rx0 = (r.x0 - ctx.x0) * sx
    ry0 = (r.y0 - ctx.y0) * sy
    rx1 = (r.x1 - ctx.x0) * sx
    ry1 = (r.y1 - ctx.y0) * sy

    inset = 2
    box = [rx0 + inset, ry0 + inset, rx1 - inset, ry1 - inset]

    # Draw semi-transparent highlight
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rectangle(box, fill=(255, 255, 0, 72), outline=(255, 0, 0, 255), width=3)
    out_img = Image.alpha_composite(img, overlay)

    out = io.BytesIO()
    out_img.save(out, format="PNG")
    return out.getvalue()

def pdf_read(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()

def pdf_render_pages_to_png(path: str, dpi: int = 300) -> List[bytes]:
    """Return list of PNG bytes, one per page, opaque RGB, rotation-normalized."""
    doc = fitz.open(path)
    out: List[bytes] = []
    for page in doc:
        rot = page.rotation
        if rot != 0:
            page.set_rotation(0)  # affects rendering only
        pix = page.get_pixmap(dpi=dpi, alpha=False)
        out.append(pix.tobytes("png"))
    return out

def list_widgets(path: str) -> List[Dict[str, Any]]:
    """Return AcroForm-like widgets (if present) with page index and rect."""
    doc = fitz.open(path)
    results: List[Dict[str, Any]] = []
    for page_index, page in enumerate(doc):
        try:
            widgets = page.widgets() or []
        except Exception:
            widgets = []
        for w in widgets:
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
    outputs: [{page, rect:[x0,y0,x1,y1], text, fontsize=11, align='left'|'center'|'right', vpad=2}]
    Writes text into rectangles and saves as flattened PDF.
    """
    doc = fitz.open(path)
    for item in outputs:
        page = doc[item["page"]]
        x0, y0, x1, y1 = item["rect"]
        rect = fitz.Rect(x0, y0, x1, y1)
        fontsize = item.get("fontsize", 11)
        align = item.get("align", "left")
        # map align to PyMuPDF alignment
        align_map = {"left": 0, "center": 1, "right": 2}
        page.insert_textbox(rect, item["text"], fontsize=fontsize, align=align_map.get(align, 0))
    doc.save(out_path)
    return out_path
