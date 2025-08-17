# python/server/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.overlay_routes import router as overlay_router
from server.apps_routes import router as apps_router  # <-- add

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(overlay_router)
app.include_router(apps_router)  # <-- add
