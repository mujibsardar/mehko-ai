import io, json, os
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form
from starlette.responses import StreamingResponse
from overlay.fill_overlay import fill_pdf_overlay_bytes

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

ROOT = Path(__file__).resolve().parents[2]  # repo root
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
