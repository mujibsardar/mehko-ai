from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import fitz  # PyMuPDF
import tempfile
import uuid
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def detect_checkboxes(page):
    checkbox_pattern = r"[☐☑✓]"
    words = page.get_text("words")
    checkboxes = []
    for word in words:
        if re.match(checkbox_pattern, word[4]):
            checkbox = {
                "type": "checkbox",
                "label": extract_nearby_label(page, fitz.Rect(word[:4])),
                "rect": [word[0], word[1], word[2], word[3]],
                "value": word[4] in ['☑', '✓']
            }
            checkboxes.append(checkbox)
    return checkboxes

def detect_text_fields(page):
    words = page.get_text("words")
    text_fields = []

    for word in words:
        text = word[4].strip()
        if re.fullmatch(r"_+", text):
            rect = fitz.Rect(word[:4])
            label = extract_nearby_label(page, rect)
            if len(label) < 2:
                continue  # Skip meaningless label
            text_fields.append({
                "type": "text",
                "label": label,
                "rect": [rect.x0, rect.y0, rect.x1, rect.y1]
            })

    return text_fields

def extract_nearby_label(page, field_rect, max_distance=100):
    """
    Extract a clean label for a field by looking left and above.
    Only include words that are reasonably close to the field box.
    """
    if isinstance(field_rect, tuple):
        field_rect = fitz.Rect(field_rect)

    field_y_center = (field_rect.y0 + field_rect.y1) / 2
    words = page.get_text("words")
    label_words = []

    for word in words:
        word_rect = fitz.Rect(word[:4])
        word_text = word[4]

        # Skip underscores or form field itself
        if re.fullmatch(r"_+", word_text.strip()):
            continue

        # Check if the word is left-aligned and close vertically
        same_line = abs(word_rect.y0 - field_y_center) < 15
        above_line = word_rect.y1 < field_rect.y0 and abs(field_rect.y0 - word_rect.y1) < max_distance
        left_side = word_rect.x1 < field_rect.x0 and abs(field_rect.x1 - word_rect.x1) < max_distance

        if same_line and left_side or above_line:
            label_words.append((word_rect.x0, word_text))

    # Sort left-to-right
    label_words.sort(key=lambda x: x[0])
    return " ".join([w[1] for w in label_words]).strip()

@app.post("/extract-fields")
async def extract_fields(file: UploadFile = File(...)):
    try:
        suffix = f"-{uuid.uuid4()}.pdf"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        doc = fitz.open(tmp_path)
        fields = []

        for page_num, page in enumerate(doc, start=1):
            fields.extend(detect_text_fields(page))
            fields.extend(detect_checkboxes(page))

        return JSONResponse(content={"fields": fields})

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
