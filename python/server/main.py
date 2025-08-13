# python/server/main.py
from fastapi import FastAPI
from server.overlay_routes import router as overlay_router

app = FastAPI(title="MEHKO Overlay API")
app.include_router(overlay_router)

@app.get("/health")
def health():
    return {"ok": True}