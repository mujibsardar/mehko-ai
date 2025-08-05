import json
from difflib import get_close_matches

# Load GPT Vision fields
with open("python/gpt_output_page_1.json", "r") as f:
    gpt_fields = json.load(f)

# Load PyMuPDF visual fields
with open("python/visual_output_page_1.json", "r") as f:
    visual_fields = json.load(f)

merged_fields = []
visual_labels = [f["label_guess"] for f in visual_fields]

for gpt_field in gpt_fields:
    label = gpt_field["label"]
    match = get_close_matches(label, visual_labels, n=1, cutoff=0.6)

    if match:
        matched_label = match[0]
        visual_field = next(f for f in visual_fields if f["label_guess"] == matched_label)
        merged_fields.append({
            "label": label,
            "type": gpt_field["type"],
            "description": gpt_field["description"],
            "rect": visual_field["rect"],
            "page": visual_field["page"],
            "match_status": "matched"
        })
    else:
        print(f"⚠️ No visual match for: {label}")
        merged_fields.append({
            "label": label,
            "type": gpt_field["type"],
            "description": gpt_field["description"],
            "rect": None,
            "page": None,
            "match_status": "unmatched"
        })

# Save to disk
with open("python/merged_fields_page_1.json", "w") as f:
    json.dump(merged_fields, f, indent=2)

print(f"✅ Total fields: {len(gpt_fields)} | Merged: {len(merged_fields)}")
