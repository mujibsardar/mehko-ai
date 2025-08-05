import fitz  # PyMuPDF
import re

def extract_visual_fields(pdf_path):
    doc = fitz.open(pdf_path)
    fields = []

    for page_num, page in enumerate(doc, start=1):
        words = page.get_text("words")

        for word in words:
            text = word[4].strip()
            if re.fullmatch(r"_+", text):
                rect = fitz.Rect(word[:4])
                fields.append({
                    "label_guess": extract_nearby_label(page, rect),
                    "rect": [rect.x0, rect.y0, rect.x1, rect.y1],
                    "page": page_num
                })

    return fields

def extract_nearby_label(page, rect, max_distance=100):
    words = page.get_text("words")
    field_y_center = (rect.y0 + rect.y1) / 2
    label_words = []

    for word in words:
        w_rect = fitz.Rect(word[:4])
        w_text = word[4]
        if re.fullmatch(r"_+", w_text.strip()):
            continue

        same_line = abs(w_rect.y0 - field_y_center) < 15
        left_side = w_rect.x1 < rect.x0 and abs(rect.x0 - w_rect.x1) < max_distance

        if same_line and left_side:
            label_words.append((w_rect.x0, w_text))

    label_words.sort(key=lambda x: x[0])
    return " ".join([w[1] for w in label_words]).strip()

if __name__ == "__main__":
    PDF_PATH = "src/data/forms/los_angeles_mehko/MEHKO_SOP-English.pdf"
    fields = extract_visual_fields(PDF_PATH)
    for field in fields:
        print(field)
