from pdf2image import convert_from_path
import os
import argparse

def pdf_to_images(pdf_path, output_folder="output_images", dpi=200):
    os.makedirs(output_folder, exist_ok=True)
    images = convert_from_path(pdf_path, dpi=dpi)

    image_paths = []
    for i, image in enumerate(images):
        output_path = os.path.join(output_folder, f"page_{i+1}.png")
        image.save(output_path, "PNG")
        image_paths.append(output_path)

    return image_paths

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert PDF to images (one PNG per page).")
    parser.add_argument('--pdf', required=True, help='Path to input PDF')
    parser.add_argument('--output_dir', required=True, help='Directory to save images')
    parser.add_argument('--dpi', type=int, default=200, help='DPI for image quality (default 200)')
    args = parser.parse_args()

    images = pdf_to_images(args.pdf, output_folder=args.output_dir, dpi=args.dpi)
    print("Saved image pages:", images)
