import os
from openai import OpenAI

# Set up client with your API key
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def main():
    files = client.files.list().data
    print(f"🙋 Found {len(files)} files. Deleting...")

    for f in files:
        file_id = f.id
        print(f"🗑️ Deleting {file_id} ({f.filename})")
        client.files.delete(file_id=file_id)

    print("✅ All files deleted.")

if __name__ == "__main__":
    main()
