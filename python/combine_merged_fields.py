import json
import glob
import argparse
import os

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Combine all per-page merged fields JSONs into one file.")
    parser.add_argument('--input_dir', required=True, help="Directory with merged_fields_page_*.json files")
    parser.add_argument('--output', required=True, help="Path for combined output JSON")
    args = parser.parse_args()

    all_fields = []

    # Find all merged_fields_page_X.json files, sorted by page number
    files = sorted(
        glob.glob(os.path.join(args.input_dir, "merged_fields_page_*.json")),
        key=lambda x: int(os.path.splitext(x)[0].split("_")[-1])
    )

    for fpath in files:
        with open(fpath, "r") as f:
            fields = json.load(f)
            all_fields.extend(fields)

    with open(args.output, "w") as f:
        json.dump(all_fields, f, indent=2)

    print(f"✅ Combined {len(files)} files → {args.output} ({len(all_fields)} fields total)")
