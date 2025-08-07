import json
from difflib import get_close_matches
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--gpt', required=True)
    parser.add_argument('--visual', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()

    with open(args.gpt, "r") as f:
        gpt_fields = json.load(f)

    with open(args.visual, "r") as f:
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

    with open(args.output, "w") as f:
        json.dump(merged_fields, f, indent=2)

    print(f"✅ Saved merged fields to {args.output}")
