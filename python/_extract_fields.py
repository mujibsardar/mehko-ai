# extract_fields.py
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import fitz  # PyMuPDF
import tempfile
import uuid
from typing import List

app = FastAPI()

# Allow CORS if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/extract-fields")
async def extract_fields(file: UploadFile = File(...)):
    try:
        # Save uploaded file to a temp path
        suffix = f"-{uuid.uuid4()}.pdf"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        doc = fitz.open(tmp_path)
        fields = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            widgets = page.widgets()

            if widgets is None:
                continue

            for widget in widgets:
                rect = list(map(float, widget.rect))
                field_info = {
                    "name": widget.field_name,
                    "type": widget.field_type,
                    "page": page_num + 1,
                    "rect": rect,
                    "label": widget.field_label or None,
                    "value": widget.field_value or None,
                }

                # Optional: get nearby visible text
                expanded_rect = fitz.Rect(
                    rect[0] - 100, rect[1] - 40,
                    rect[2] + 100, rect[3] + 40
                )
                nearby_text = page.get_textbox(expanded_rect)
                field_info["nearbyText"] = nearby_text.strip().split("\n") if nearby_text else []

                fields.append(field_info)

        return JSONResponse(content=fields)

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
