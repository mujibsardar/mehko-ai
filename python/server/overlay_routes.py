import io, json, os,  math, fitz
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, Query
from starlette.responses import StreamingResponse, Response
from overlay.fill_overlay import fill_pdf_overlay_bytes

MAPPER_ENABLED = os.getenv("MAPPER_ENABLED", "1") == "1"

# Optional path helper (unused by template endpoints, kept for future preview)
ROOT = Path(__file__).resolve().parents[2]
def _fs(p: str) -> str:
    q = Path(p.lstrip("/ "))
    candidates = [q, Path.cwd()/q, ROOT/q] if not q.is_absolute() else [q]
    for c in candidates:
        if c.exists():
            return str(c.resolve())
    raise FileNotFoundError(f"not found: {p}")

router = APIRouter()

@router.post("/fill-overlay")
async def fill_overlay(
    file: UploadFile = File(...),
    overlay_json: str = Form(...),
    answers_json: str = Form("{}"),
):
    pdf_bytes = await file.read()
    out = fill_pdf_overlay_bytes(pdf_bytes, json.loads(overlay_json), json.loads(answers_json))
    return StreamingResponse(io.BytesIO(out), media_type="application/pdf",
                             headers={"Content-Disposition":"attachment; filename=filled.pdf"})

# --- Template storage ---
BASE_DIR = ROOT / "applications"

@router.get("/templates/{form_id}")
def get_template(form_id: str):
    p = BASE_DIR / form_id / "overlay.json"
    return json.load(open(p)) if p.exists() else {"fields": []}

@router.post("/templates/{form_id}")
def save_template(form_id: str, overlay_json: str = Form(...)):
    d = BASE_DIR / form_id
    d.mkdir(parents=True, exist_ok=True)
    obj = json.loads(overlay_json)
    (d / "overlay.json").write_text(json.dumps(obj, indent=2))
    return {"ok": True, "count": len(obj.get("fields", []))}

if MAPPER_ENABLED:
    @router.get("/page-metrics")
    def page_metrics(pdf_path: str = Query(...), page: int = 0, dpi: int = 144):
        doc = fitz.open(_fs(pdf_path)); pg = doc[page]
        wpt, hpt = pg.rect.width, pg.rect.height
        return {"pointsWidth": wpt, "pointsHeight": hpt,
                "pixelWidth": int(wpt/72*dpi), "pixelHeight": int(hpt/72*dpi),
                "dpi": dpi}

    @router.get("/preview-page")
    def preview_page(pdf_path: str = Query(...), page: int = 0, dpi: int = 144):
        doc = fitz.open(_fs(pdf_path)); pg = doc[page]
        pix = pg.get_pixmap(dpi=dpi, alpha=False)
        return Response(pix.tobytes("png"), media_type="image/png")