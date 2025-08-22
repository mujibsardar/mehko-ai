from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.pdf_routes import router as pdf_router
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = FastAPI(title="PDF Extraction Service", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Only include PDF router for testing
app.include_router(pdf_router)       # /extract-pdf-content

@app.get("/health")
def health():
    return {"ok": True, "service": "PDF Extraction"}
