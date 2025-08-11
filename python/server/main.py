from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse
import json, os, uuid
from ingestion.pipeline import extract_fields_pipeline, map_labels_to_widgets, fill_fields_and_save
from ingestion import mapping
from fastapi.responses import Response
from ingestion.pdf_utils import pdf_preview_with_highlight

app = FastAPI()

TMP = "/tmp"

@app.post("/preview")
async def preview(file: UploadFile = File(...), page: int = Form(...), rect: str = Form(...),context: str = Form("section"), pad: int = Form(8), context_pad: int = Form(120)):
    in_path = os.path.join(TMP, f"{uuid.uuid4()}_{file.filename}")
    try:  
        with open(in_path, "wb") as f:
            f.write(await file.read())

        rect_list = json.loads(rect)
        if not (isinstance(rect_list, list) and len(rect_list) == 4 and all(isinstance(x,(int,float)) for x in rect_list)):
            raise HTTPException(400, "rect must be [x0,y0,x1,y1]")
        context = "section" if context not in ("field","section") else context

        png_bytes = pdf_preview_with_highlight(in_path, int(page), rect_list,
                                               context=context, pad=int(pad),
                                               context_pad=int(context_pad), dpi=200)
        return Response(content=png_bytes, media_type="image/png")
    finally:
        if os.path.exists(in_path):
            os.remove(in_path)

@app.post("/extract-fields-raw")
async def extract_fields_raw(file: UploadFile = File(...)):
    in_path = os.path.join(TMP, f"{uuid.uuid4()}_{file.filename}")
    with open(in_path, "wb") as f:
        f.write(await file.read())
    data = extract_fields_pipeline(in_path)
    blocks = data.get("textract", {}).get("pages", [])[0].get("blocks", [])
    return JSONResponse({"page0_blocks": blocks})

@app.post("/extract-fields")
async def extract_fields(file: UploadFile = File(...)):
    in_path = os.path.join(TMP, f"{uuid.uuid4()}_{file.filename}")
    with open(in_path, "wb") as f:
        f.write(await file.read())
    data = extract_fields_pipeline(in_path)
    labeled = map_labels_to_widgets(data)  # existing
    # NEW: post-process -> clean names + sections + dedupe
    pages = data.get("textract", {}).get("pages", [])
    cleaned = mapping.postprocess_fields(pages, labeled)
    return JSONResponse({"fields": cleaned, "mode": data.get("mode")})

@app.post("/fill")
async def fill(file: UploadFile = File(...),
               answers_json: str = Form(...),
               fields_json: str = Form(...)):
    in_path = os.path.join(TMP, f"{uuid.uuid4()}_{file.filename}")
    with open(in_path, "wb") as f:
        f.write(await file.read())
    answers = json.loads(answers_json)
    fields = json.loads(fields_json)
    out_path = in_path.replace(".pdf", "_filled.pdf")
    fill_fields_and_save(in_path, answers, fields, out_path)
    return FileResponse(out_path, filename=os.path.basename(out_path), media_type="application/pdf")
