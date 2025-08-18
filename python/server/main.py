from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.overlay_routes import router as overlay_router
from server.apps_routes import router as apps_router

app = FastAPI(title="PDF Microservice", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(apps_router)      # /apps/...
app.include_router(overlay_router)   # /fill-overlay

@app.get("/health")
def health():
    return {"ok": True}
