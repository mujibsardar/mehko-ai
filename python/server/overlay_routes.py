import io, json
from fastapi import APIRouter, UploadFile, File, Form
from starlette.responses import StreamingResponse
from overlay.fill_overlay import fill_pdf_overlay_bytes

router = APIRouter(tags=["overlay"])

@router.post("/fill-overlay")
async def fill_overlay(
    file: UploadFile = File(...),
    overlay_json: str = Form(...),
    answers_json: str = Form("{}"),
):
    pdf_bytes = await file.read()
    overlay = json.loads(overlay_json)
    answers = json.loads(answers_json)
    out = fill_pdf_overlay_bytes(pdf_bytes, overlay, answers)
    return StreamingResponse(
        io.BytesIO(out),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=filled.pdf"},
    )
