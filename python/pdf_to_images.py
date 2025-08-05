from pdf2image import convert_from_path
import os

def pdf_to_images(pdf_path, output_folder="output_images", dpi=200):
    os.makedirs(output_folder, exist_ok=True)
    images = convert_from_path(pdf_path, dpi=dpi)

    image_paths = []
    for i, image in enumerate(images):
        output_path = os.path.join(output_folder, f"page_{i+1}.png")
        image.save(output_path, "PNG")
        image_paths.append(output_path)

    return image_paths

# Example usage:
pdf_path = "/Users/avan/Desktop/Non-Teaching/Coding-Space/mehko-ai/src/data/forms/los_angeles_mehko/MEHKO_SOP-English.pdf"
images = pdf_to_images(pdf_path)
print("Saved image pages:", images)
