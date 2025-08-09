from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
import json, os, uuid
from ingestion.pipeline import extract_fields_pipeline, map_labels_to_widgets, fill_fields_and_save

app = FastAPI()

TMP = "/tmp"

@app.post("/extract-fields")
async def extract_fields(file: UploadFile = File(...)):
    in_path = os.path.join(TMP, f"{uuid.uuid4()}_{file.filename}")
    with open(in_path, "wb") as f:
        f.write(await file.read())
    data = extract_fields_pipeline(in_path)
    labeled = map_labels_to_widgets(data)
    return JSONResponse({"widgets_labeled": labeled, "mode": data.get("mode")})

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
