import io, json
from fastapi import APIRouter, UploadFile, File, Form
from starlette.responses import StreamingResponse
from overlay.fill_overlay import fill_pdf_overlay_bytes

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