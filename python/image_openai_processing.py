import openai
import base64
import os
import argparse
from dotenv import load_dotenv

import json
import os
import tempfile
import shutil
import re

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

def encode_image(image_path):
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

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

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--image', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()

    base64_image = encode_image(args.image)
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
                            "Please extract all clearly visible input fields from this application form page. "
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

    raw = response.choices[0].message.content.strip()

    # Remove triple backticks and any "json" annotation
    if raw.startswith("```"):
        # Remove code block wrapper
        raw = re.sub(r"^```(json)?", "", raw, flags=re.IGNORECASE).strip()
        raw = re.sub(r"```$", "", raw).strip()

    try:
        data = json.loads(raw)
        safe_json_write(data, args.output)
    except Exception as e:
        print(f"❌ Failed to parse GPT output as JSON: {e}")
        print("GPT output was:\n", raw)
        if os.path.exists(args.output):
            os.remove(args.output)
        # with open(args.output, "w") as f:
        #     f.write(response.choices[0].message.content)

    print(f"✅ Saved GPT fields to {args.output}")
