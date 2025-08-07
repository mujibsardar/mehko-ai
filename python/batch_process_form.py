import argparse
import os
import subprocess
import sys

def file_has_content(path):
    return os.path.isfile(path) and os.path.getsize(path) > 0

def pdf_to_images(pdf_path, images_dir):
    print(f"[1/5] Converting PDF to images...")
    subprocess.run([
        sys.executable, "pdf_to_images.py",
        "--pdf", pdf_path,
        "--output_dir", images_dir
    ], check=True)

def gpt_field_extraction(images_dir, gpt_dir):
    print(f"[2/5] Extracting GPT fields (one file per page)...")
    os.makedirs(gpt_dir, exist_ok=True)
    for img_name in sorted(os.listdir(images_dir)):
        if not img_name.endswith(".png"):
            continue
        page_num = img_name.replace('page_', '').replace('.png', '')
        img_path = os.path.join(images_dir, img_name)
        output_json = os.path.join(gpt_dir, f"fields_gpt_page_{page_num}.json")
        subprocess.run([
            sys.executable, "image_openai_processing.py",
            "--image", img_path,
            "--output", output_json
        ], check=True)

def visual_field_extraction(pdf_path, visual_dir):
    print(f"[3/5] Extracting visual fields (one file per page)...")
    os.makedirs(visual_dir, exist_ok=True)
    # For each page, extract visual fields individually
    import fitz
    doc = fitz.open(pdf_path)
    for page_num in range(len(doc)):
        output_json = os.path.join(visual_dir, f"visual_fields_page_{page_num+1}.json")
        subprocess.run([
            sys.executable, "visual_extract_fields.py",
            "--pdf", pdf_path,
            "--output", output_json,
            "--page", str(page_num+1)
        ], check=True)

def merge_fields(gpt_dir, visual_dir, merged_dir):
    print(f"[4/5] Merging GPT and Visual fields (per page)...")
    os.makedirs(merged_dir, exist_ok=True)
    # For each page, merge the corresponding GPT and visual JSONs
    gpt_files = sorted([f for f in os.listdir(gpt_dir) if f.endswith('.json')])
    for gpt_file in gpt_files:
        page_num = gpt_file.split('_')[-1].replace('.json', '')
        gpt_json = os.path.join(gpt_dir, gpt_file)
        visual_json = os.path.join(visual_dir, f"visual_fields_page_{page_num}.json")
        merged_json = os.path.join(merged_dir, f"merged_fields_page_{page_num}.json")

        if not file_has_content(gpt_json):
            print(f"⚠️  Skipping merge: missing or empty GPT fields {gpt_json}")
            continue
        if not file_has_content(visual_json):
            print(f"⚠️  Skipping merge: missing or empty Visual fields {visual_json}")
            continue

        subprocess.run([
            sys.executable, "merge_gpt_and_visual.py",
            "--gpt", gpt_json,
            "--visual", visual_json,
            "--output", merged_json
        ], check=True)

def combine_merged_fields(merged_dir, output_json):
    print(f"[5/5] Combining all merged pages into one JSON...")
    subprocess.run([
        sys.executable, "combine_merged_fields.py",
        "--input_dir", merged_dir,
        "--output", output_json
    ], check=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Batch process a new form PDF for field extraction & merging.")
    parser.add_argument("--applicationId", required=True)
    parser.add_argument("--formName", required=True)
    parser.add_argument("--pdf", required=True)
    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.abspath(args.pdf))
    images_dir = os.path.join(base_dir, "output_images")
    gpt_dir = os.path.join(base_dir, "gpt_output")
    visual_dir = os.path.join(base_dir, "visual_output")
    merged_dir = os.path.join(base_dir, "merged_output")
    output_json = os.path.join(base_dir, f"{args.formName}.json")

    pdf_to_images(args.pdf, images_dir)
    gpt_field_extraction(images_dir, gpt_dir)
    visual_field_extraction(args.pdf, visual_dir)
    merge_fields(gpt_dir, visual_dir, merged_dir)
    combine_merged_fields(merged_dir, output_json)

    print(f"✅ Done! Output: {output_json}")
