from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.overlay_routes import router as overlay_router
from server.apps_routes import router as apps_router
from server.pdf_routes import router as pdf_router
from server.ai_routes import router as ai_router
from server.admin_routes import router as admin_router
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = FastAPI(title="MEHKO AI Unified Backend", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",      # Development
        "http://127.0.0.1:5173",     # Development
        "https://mehko.ai",           # Production frontend
        "https://api.mehko.ai"        # Production API
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Unified routers for all services (Caddy strips /api prefix)
app.include_router(apps_router, prefix="/apps")          # /apps/... (after Caddy strips /api)
app.include_router(overlay_router, prefix="")            # /fill-pdf, etc. (after Caddy strips /api)
app.include_router(pdf_router, prefix="")                # /extract-pdf-content (after Caddy strips /api)
app.include_router(ai_router, prefix="")                 # /ai-chat, /ai-analyze-pdf, etc. (after Caddy strips /api)
app.include_router(admin_router, prefix="")              # /admin/process-county, etc. (after Caddy strips /api)

@app.get("/health")
def health():
    return {"ok": True}
