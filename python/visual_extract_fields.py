from cProfile import label
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import fitz  # PyMuPDF
import tempfile
import uuid
import re
import argparse
import json
import os
import shutil

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
                "label_guess": extract_nearby_label(page, fitz.Rect(word[:4])),
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
                continue
            text_fields.append({
                "type": "text",
                "label": label,
                "label_guess": label,
                "rect": [rect.x0, rect.y0, rect.x1, rect.y1]
            })
    return text_fields

def extract_nearby_label(page, field_rect, max_distance=100, max_label_words=6, max_label_length=40):
    """
    Heuristic to get a short label just to the left or above a field.
    """
    if isinstance(field_rect, tuple):
        field_rect = fitz.Rect(field_rect)
    field_y_center = (field_rect.y0 + field_rect.y1) / 2
    words = page.get_text("words")
    label_words = []
    for word in words:
        word_rect = fitz.Rect(word[:4])
        word_text = word[4].strip()
        if re.fullmatch(r"_+", word_text):
            continue
        # Only include short words, skip emails/URLs/long blobs
        if len(word_text) > 30:
            continue
        # Only accept alpha-ish (ignore most numbers, punctuation, emails, etc)
        if not re.match(r"^[\w\-\' ]+$", word_text):
            continue

        same_line = abs(word_rect.y0 - field_y_center) < 15
        left_side = word_rect.x1 < field_rect.x0 and abs(field_rect.x0 - word_rect.x1) < max_distance
        above_line = word_rect.y1 < field_rect.y0 and abs(field_rect.y0 - word_rect.y1) < max_distance

        if (same_line and left_side) or above_line:
            label_words.append((word_rect.x0, word_text))

    # Sort left to right
    label_words.sort(key=lambda x: x[0])
    label = " ".join([w[1] for w in label_words])

    # Safety: limit length/word count
    label = label.strip()
    if len(label.split()) > max_label_words:
        label = " ".join(label.split()[-max_label_words:])
    if len(label) > max_label_length:
        label = label[-max_label_length:]

    # Sanity: remove if still suspiciously long or contains emails/URLs
    if "@" in label or ".com" in label or len(label) < 2:
        return ""
    
    print(f"LABEL DEBUG: {label} (rect={field_rect})")
    return label

def extract_fields_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    fields = []
    for page_num, page in enumerate(doc, start=1):
        fields.extend(detect_text_fields(page))
        fields.extend(detect_checkboxes(page))
    return fields


def safe_json_write(data, output_path):
    try:
        with tempfile.NamedTemporaryFile('w', delete=False) as tf:
            json.dump(data, tf, indent=2)
            tempname = tf.name
        shutil.move(tempname, output_path)
        print(f"✅ Saved output to {output_path}")
    except Exception as e:
        print(f"❌ Failed to write JSON: {e}")
        if os.path.exists(output_path):
            os.remove(output_path)

@app.post("/extract-fields")
async def extract_fields(file: UploadFile = File(...)):
    try:
        suffix = f"-{uuid.uuid4()}.pdf"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
        fields = extract_fields_from_pdf(tmp_path)
        return JSONResponse(content={"fields": fields})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Extract visual fields from PDF (CLI usage).")
    parser.add_argument('--pdf', required=True, help='Path to PDF file')
    parser.add_argument('--output', required=True, help='Where to save fields JSON')
    parser.add_argument('--page', type=int, help='Page number to process (1-based)')
    args = parser.parse_args()

    doc = fitz.open(args.pdf)
    if args.page:
        # Only process the specified page (1-based index)
        page = doc[args.page - 1]
        fields = detect_text_fields(page) + detect_checkboxes(page)
    else:
        # Process all pages (fallback, not used in batch)
        fields = []
        for page in doc:
            fields.extend(detect_text_fields(page))
            fields.extend(detect_checkboxes(page))
    
    safe_json_write(fields, args.output)
    # with open(args.output, "w") as f:
    #     json.dump(fields, f, indent=2)
    print(f"✅ Saved visual fields to {args.output}")