import openai
import base64
import os
from dotenv import load_dotenv
import base64

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

def encode_image(image_path):
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

image_path = "python/output_images/page_1.png"
base64_image = encode_image(image_path)

response = openai.chat.completions.create(
    model="gpt-4-turbo",  
    messages=[
        {
            "role": "system",
            "content": "You are an expert at reading scanned government forms and extracting form fields."
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        "Please extract all clearly visible input fields from this MEHKO application form page. "
                        "For each field, return:\n"
                        "- label\n"
                        "- type (text, checkbox, signature, initials, etc)\n"
                        "- a short description of what the field is for\n\n"
                        "Respond in JSON format as a list of fields."
                    )
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{base64_image}"
                    }
                }
            ]
        }
    ],
    max_tokens=1500
)

print(response.choices[0].message.content)
