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
