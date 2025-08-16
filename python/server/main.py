# python/server/main.py
from fastapi import FastAPI
from server.overlay_routes import router as overlay_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="MEHKO Overlay API")


app.add_middleware(CORSMiddleware,
  allow_origins=["http://localhost:5173","http://127.0.0.1:5173"],
  allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(overlay_router)

@app.get("/health")
def health():
    return {"ok": True}