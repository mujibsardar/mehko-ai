import io, json
from fastapi import APIRouter, UploadFile, File, Form
from starlette.responses import StreamingResponse
from overlay.fill_overlay import fill_pdf_overlay_bytes
from pathlib import Path

# --- preview & metrics ---
from fastapi import Query
from fastapi.responses import Response
import fitz, math

ROOT = Path(__file__).resolve().parents[2]  # repo root
def _fs(p: str) -> str:
    q = Path(p.lstrip("/ "))
    candidates = [q, Path.cwd()/q, ROOT/q] if not q.is_absolute() else [q]
    for c in candidates:
        if c.exists():
            return str(c.resolve())
    raise FileNotFoundError(f"not found: {p}")

router = APIRouter()

@router.post("/fill-overlay")
async def fill_overlay(file: UploadFile = File(...),
                       overlay_json: str = Form(...),
                       answers_json: str = Form("{}")):
    pdf_bytes = await file.read()
    out = fill_pdf_overlay_bytes(pdf_bytes,
                                 json.loads(overlay_json),
                                 json.loads(answers_json))
    return StreamingResponse(io.BytesIO(out), media_type="application/pdf",
                             headers={"Content-Disposition":"attachment; filename=filled.pdf"})

BASE="applications"
@router.get("/templates/{form_id}")
def get_template(form_id: str):
    p=f"{BASE}/{form_id}/overlay.json"
    return json.load(open(p)) if os.path.exists(p) else {"fields":[]}

@router.post("/templates/{form_id}")
def save_template(form_id: str, overlay_json: str = Form(...)):
    p=f"{BASE}/{form_id}"; os.makedirs(p, exist_ok=True)
    j=json.loads(overlay_json); open(f"{p}/overlay.json","w").write(json.dumps(j,indent=2))
    return {"ok": True, "count": len(j.get("fields",[]))}

# @router.get("/preview-page")
# def preview_page(pdf_path: str = Query(...), page: int = 0, dpi: int = 144):
#     doc = fitz.open(_fs(pdf_path)); pg = doc[page]
#     pix = pg.get_pixmap(dpi=dpi, alpha=False)
#     return Response(pix.tobytes("png"), media_type="image/png",
#                     headers={"Cache-Control":"no-store"})

# @router.get("/page-metrics")
# def page_metrics(pdf_path: str = Query(...), page: int = 0, dpi: int = 144):
    doc = fitz.open(_fs(pdf_path)); pg = doc[page]
    wpt, hpt = pg.rect.width, pg.rect.height
    wpx = int(wpt/72*dpi); hpx = int(hpt/72*dpi)
    return {"pointsWidth": wpt, "pointsHeight": hpt, "pixelWidth": wpx, "pixelHeight": hpx, "dpi": dpi}