import os
import threading, sys
import subprocess
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI()  # Reads OPENAI_API_KEY from .env

# Preloaded file paths for MEHKO.ai backend
FILE_MAP = {
    "main": "server/main.py",
    "mapping": "ingestion/mapping.py",
    "pipeline": "ingestion/pipeline.py",
    "pdf_utils": "ingestion/pdf_utils.py",
    "textract_utils": "ingestion/textract_utils.py",
    "fields": "applications/los_angeles_mehko/fields.json"
}

SYSTEM_PROMPT = f"""
You are a coding/debugging assistant for my MEHKO.ai backend.
You can:
1. Read/edit these preloaded files directly:
{FILE_MAP}
2. Run shell commands (safe ones) — prefix them with "!".
3. You may suggest and make changes, then run tests via curl or other commands.
4. Use !start to launch the FastAPI server with uvicorn in background.
5. Use !restart to kill and restart the server after code edits.

When editing, print exactly what lines you changed.
"""

SERVER_CMD = "uvicorn server.main:app --host 0.0.0.0 --port 8081 --reload"
SERVER_PROCESS = None

def ask_agent(prompt):
    stream = client.chat.completions.create(
        model="gpt-4.1",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        stream=True
    )
    for chunk in stream:
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end="")

def _pipe_to_console(pipe, label):
    for line in iter(pipe.readline, b""):
        try:
            print(f"[{label}] {line.decode().rstrip()}")
        except Exception:
            pass


def start_server():
    global SERVER_PROCESS
    print("Starting FastAPI server at http://localhost:8081 ...")
    SERVER_PROCESS = subprocess.Popen(
        SERVER_CMD,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    threading.Thread(target=_pipe_to_console, args=(SERVER_PROCESS.stdout, "uvicorn"), daemon=True).start()
    threading.Thread(target=_pipe_to_console, args=(SERVER_PROCESS.stderr, "uvicorn"), daemon=True).start()

def stop_server():
    global SERVER_PROCESS
    if SERVER_PROCESS:
        SERVER_PROCESS.terminate()
        try:
            SERVER_PROCESS.wait(timeout=5)
        except subprocess.TimeoutExpired:
            SERVER_PROCESS.kill()
        SERVER_PROCESS = None
        print("Server stopped.")

if __name__ == "__main__":
    while True:
        q = input("\n> ")
        if q.strip().lower() in ["quit", "exit"]:
            break

        if q.startswith("!"):
            cmd = q[1:].strip()
            if cmd == "start":
                start_server()
            elif cmd == "restart":
                stop_server()
                start_server()
            else:
                try:
                    output = subprocess.check_output(cmd, shell=True, text=True)
                    print(output)
                except subprocess.CalledProcessError as e:
                    print(e.output)
        else:
            ask_agent(q)
