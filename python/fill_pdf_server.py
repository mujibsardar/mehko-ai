from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import fitz  # PyMuPDF
import os
import json
from datetime import datetime

app = FastAPI()

# 1. Serve filled PDFs from the 'filled_forms' directory
app.mount("/download", StaticFiles(directory="filled_forms"), name="download")

# 2. Endpoint to fill the PDF and return a download link
@app.post("/fill-pdf")
async def fill_pdf(request: Request):
    data = await request.json()
    application_id = data["applicationId"]
    form_name = data["formName"]
    form_data = data["formData"]

    # Debugging: Print the received data
    print("form_data:", form_data) 

    pdf_path = f"{application_id}/{form_name.replace('.json', '.pdf')}"
    merged_json_path = f"{application_id}/{form_name}"
    filled_dir = f"filled_forms/{application_id}"
    os.makedirs(filled_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    output_pdf_name = f"{timestamp}_{form_name.replace('.json', '.pdf')}"
    output_pdf_path = f"{filled_dir}/{output_pdf_name}"

    doc = fitz.open(pdf_path)
    with open(merged_json_path) as f:
        merged_fields = json.load(f)

    for field in merged_fields:
        label = field["label"]
        rect = field.get("rect")
        page_num = (field.get("page") or 1) - 1
        value = form_data.get(label)
        if rect and value:
            pad = 5  # How much bigger you want the writing area to be
            dx, dy = 1, 3  # These are the X and Y offset amounts (tweak as needed!)
            r = fitz.Rect(
                rect[0] - pad + dx,
                rect[1] - pad + dy,
                rect[2] + pad + dx,
                rect[3] + pad + dy,
            )
            page = doc[page_num]
            page.insert_textbox(
                r,
                str(value),
                fontsize=12,
                color=(0, 0, 1),
                align=1,  # 0=left, 1=center, 2=right
                overlay=True,
            )


    doc.save(output_pdf_path)
    url = f"/download/{application_id}/{output_pdf_name}"
    return JSONResponse({"url": url})

# 3. (Optional) Explicit endpoint for downloading filled PDFs (not needed with StaticFiles, but here for clarity)
@app.get("/download/{application_id}/{file_name}")
def download_filled_pdf(application_id: str, file_name: str):
    pdf_path = f"filled_forms/{application_id}/{file_name}"
    return FileResponse(pdf_path, media_type="application/pdf", filename=file_name)
