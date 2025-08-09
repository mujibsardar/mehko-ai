import argparse, json, os
from ingestion.pipeline import extract_fields_pipeline, map_labels_to_widgets, fill_fields_and_save

def main():
    p = argparse.ArgumentParser()
    p.add_argument("pdf", help="Input PDF")
    p.add_argument("--extract", action="store_true", help="Extract fields (Textract+widgets)")
    p.add_argument("--fill", action="store_true", help="Fill PDF from answers JSON and field defs JSON")
    p.add_argument("--answers", help="answers.json with {field_id:value}")
    p.add_argument("--fields", help="fields.json with [{page,rect,label?,name?}]")
    p.add_argument("--out", default="filled.pdf")
    args = p.parse_args()

    if args.extract:
        data = extract_fields_pipeline(args.pdf)
        labeled = map_labels_to_widgets(data)
        print(json.dumps({
            "widgets_labeled": labeled,
            "mode": data.get("mode"),
        }, indent=2))
    elif args.fill:
        if not args.answers or not args.fields:
            raise SystemExit("--fill requires --answers and --fields")
        with open(args.answers) as f: answers = json.load(f)
        with open(args.fields) as f: fields = json.load(f)
        with open(args.fields) as f:
            fields = json.load(f)
        # NEW: unwrap if needed
        if isinstance(fields, dict) and "widgets_labeled" in fields:
            fields = fields["widgets_labeled"]
        out = fill_fields_and_save(args.pdf, answers, fields, args.out)
        print(out)
    else:
        p.print_help()

if __name__ == "__main__":
    main()
