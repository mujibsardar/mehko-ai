# python/server/firebase_admin_init.py
import os, json
from pathlib import Path
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

# Load /python/.env
load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

def _init_app():
    if firebase_admin._apps:
        return firebase_admin.get_app()

    p = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
    if p:
        key_path = Path(__file__).resolve().parents[2] / Path(p)  # repo root + path
        cred = credentials.Certificate(str(key_path))
        return firebase_admin.initialize_app(cred)

    raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_PATH not set")

_init_app()
db = firestore.client()
