import io, json, os
from pathlib import Path
from typing import List, Dict, Any

# NEW: load .env early (so env vars exist when this module is imported)
from dotenv import load_dotenv
load_dotenv()  # will pick up /python/.env if you start the server from /python

import fitz
from fastapi import APIRouter, UploadFile, File, Form, Request, HTTPException
from fastapi.responses import FileResponse
from starlette.responses import Response, StreamingResponse

from overlay.fill_overlay import fill_pdf_overlay_bytes
from server.firebase_admin_init import db
from firebase_admin import firestore


router = APIRouter(prefix="/apps", tags=["apps"])

# NEW: tolerant bool parser (1/true/yes/on → True)
def env_bool(name: str, default: bool = True) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")

# Use it here — defaults to True so mapper is ON unless explicitly disabled
MAPPER_ENABLED = env_bool("MAPPER_ENABLED", True)

# --- Paths ---
ROOT = Path(__file__).resolve().parents[2]        # repo root
APPS = ROOT / "applications"                      # applications/<app>/<form>/

def app_dir(app: str) -> Path:
    return APPS / app

def form_dir(app: str, form: str) -> Path:
    return app_dir(app) / "forms" / form

def ensure_dir(p: Path):
    p.mkdir(parents=True, exist_ok=True)

# --- Apps CRUD (minimal) ---
@router.get("")
def list_apps() -> List[str]:
    if not APPS.exists():
        return []
    return sorted([p.name for p in APPS.iterdir() if p.is_dir()])

@router.post("")
async def create_app(request: Request, app: str = Form(None)):
    # Accept JSON {"app":...}, multipart form app=..., or ?app=...
    data = {}
    try:
        data = await request.json()
    except Exception:
        pass

    name = app or data.get("app") or request.query_params.get("app")
    if not name:
        raise HTTPException(400, "missing app")

    ensure_dir(app_dir(name))

    # Firestore doc + comments subcollection (idempotent)
    app_ref = db.collection("applications").document(name)
    snap = app_ref.get()
    if not snap.exists:
        payload = {
            "id": name,
            "title": data.get("title", name.replace("_", " ").title()),
            "description": data.get("description", ""),
            "rootDomain": data.get("rootDomain", ""),
            "supportTools": {"aiEnabled": True, "commentsEnabled": True},
            "steps": [],
        }
        app_ref.set(payload)
        app_ref.collection("comments").add({
            "displayName": "System",
            "text": "Comments thread started.",
            "timestamp": firestore.SERVER_TIMESTAMP,
            "userId": "system",
        })

    return {"ok": True, "app": name}

# --- Form assets (new format only) ---
@router.post("/{app}/forms/{form}/pdf")
async def upload_pdf(app: str, form: str, file: UploadFile = File(...)):
    ensure_dir(form_dir(app, form))
    dest = form_dir(app, form) / "form.pdf"
    data = await file.read()
    dest.write_bytes(data)
    return {"ok": True, "bytes": len(data), "path": str(dest.relative_to(ROOT))}

@router.get("/{app}/forms/{form}/template")
def get_template(app: str, form: str):
    p = form_dir(app, form) / "overlay.json"
    if not p.exists():
        return {"fields": []}
    return json.loads(p.read_text())

@router.post("/{app}/forms/{form}/template")
def save_template(app: str, form: str, overlay_json: str = Form(...)):
    ensure_dir(form_dir(app, form))
    p = form_dir(app, form) / "overlay.json"
    try:
        overlay = json.loads(overlay_json)
    except Exception:
        raise HTTPException(400, "overlay_json must be valid JSON")
    p.write_text(json.dumps(overlay, indent=2))
    return {"ok": True, "fields": len(overlay.get("fields", []))}

@router.post("/{app}/forms/{form}/create-acroform")
async def create_acroform_pdf(app: str, form: str):
    """Create an AcroForm PDF from the existing overlay definition"""
    pdf_path = form_dir(app, form) / "form.pdf"
    tpl_path = form_dir(app, form) / "overlay.json"

    if not pdf_path.exists():
        raise HTTPException(404, f"missing PDF at {pdf_path}")

    try:
        pdf_bytes = pdf_path.read_bytes()
        
        # Check if PDF is already an AcroForm
        from overlay.acroform_handler import AcroFormHandler
        handler = AcroFormHandler()
        
        if handler.is_acroform_pdf(pdf_bytes):
            # PDF already has AcroForm fields, return it directly
            return StreamingResponse(
                io.BytesIO(pdf_bytes),
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{app}_{form}_acroform.pdf"'},
            )
        
        # Check if overlay exists for creating new AcroForm fields
        if not tpl_path.exists():
            # No overlay, return original PDF
            return StreamingResponse(
                io.BytesIO(pdf_bytes),
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{app}_{form}_acroform.pdf"'},
            )
        
        overlay = json.loads(tpl_path.read_text())
        
        # Create new AcroForm PDF with overlay fields
        from overlay.acroform_handler import create_acroform_from_overlay
        acroform_pdf = create_acroform_from_overlay(pdf_bytes, overlay)
        
        # Save the AcroForm PDF
        acroform_path = form_dir(app, form) / "form_acroform.pdf"
        acroform_path.write_bytes(acroform_pdf)
        
        return StreamingResponse(
            io.BytesIO(acroform_pdf),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{app}_{form}_acroform.pdf"'},
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to create AcroForm PDF: {str(e)}")

# extract text for AI context
@router.get("/{app}/forms/{form}/text")
def get_pdf_text(app: str, form: str):
    p = form_dir(app, form) / "form.pdf"
    if not p.exists():
        raise HTTPException(404, f"missing PDF at {p}")
    doc = fitz.open(p)
    pages = [doc[i].get_text("text") for i in range(len(doc))]
    return {"pages": pages, "chars": sum(len(t) for t in pages)}

# serve the actual PDF
@router.get("/{app}/forms/{form}/pdf")
def download_pdf(app: str, form: str, inline: bool = False):
    p = form_dir(app, form) / "form.pdf"
    if not p.exists():
        raise HTTPException(404, f"missing PDF at {p}")
    disposition = "inline" if inline else "attachment"
    return FileResponse(
        path=str(p),
        media_type="application/pdf",
        filename=f"{app}_{form}.pdf",
        headers={"Content-Disposition": f'{disposition}; filename="{app}_{form}.pdf"'},
    )

# serve AcroForm PDF
@router.get("/{app}/forms/{form}/acroform-pdf")
def download_acroform_pdf(app: str, form: str, inline: bool = False):
    p = form_dir(app, form) / "form_acroform.pdf"
    if not p.exists():
        # Fall back to regular PDF if AcroForm doesn't exist
        p = form_dir(app, form) / "form.pdf"
        if not p.exists():
            raise HTTPException(404, f"missing PDF at {p}")
    
    disposition = "inline" if inline else "attachment"
    return FileResponse(
        path=str(p),
        media_type="application/pdf",
        filename=f"{app}_{form}_acroform.pdf",
        headers={"Content-Disposition": f'{disposition}; filename="{app}_{form}_acroform.pdf"'},
    )

# --- AcroForm Definition Management ---
@router.get("/{app}/forms/{form}/acroform-definition")
def get_acroform_definition(app: str, form: str):
    """Get the AcroForm definition for a form"""
    p = form_dir(app, form) / "acroform-definition.json"
    if not p.exists():
        raise HTTPException(404, f"missing AcroForm definition at {p}")
    
    try:
        definition = json.loads(p.read_text())
        return definition
    except Exception as e:
        raise HTTPException(500, f"error reading AcroForm definition: {e}")

@router.post("/{app}/forms/{form}/acroform-definition")
async def save_acroform_definition(app: str, form: str, request: Request):
    """Save or update the AcroForm definition for a form"""
    ensure_dir(form_dir(app, form))
    
    try:
        definition = await request.json()
        
        # Validate the definition structure
        if not isinstance(definition, dict):
            raise HTTPException(400, "definition must be a JSON object")
        
        if "fields" not in definition:
            raise HTTPException(400, "definition must contain 'fields' array")
        
        if not isinstance(definition["fields"], list):
            raise HTTPException(400, "fields must be an array")
        
        # Save to file
        p = form_dir(app, form) / "acroform-definition.json"
        p.write_text(json.dumps(definition, indent=2))
        
        return {
            "ok": True, 
            "message": f"AcroForm definition saved for {form}",
            "fields_count": len(definition["fields"]),
            "path": str(p.relative_to(ROOT))
        }
        
    except Exception as e:
        raise HTTPException(500, f"error saving AcroForm definition: {e}")

@router.delete("/{app}/forms/{form}/acroform-definition")
def delete_acroform_definition(app: str, form: str):
    """Delete the AcroForm definition for a form"""
    p = form_dir(app, form) / "acroform-definition.json"
    if not p.exists():
        raise HTTPException(404, f"missing AcroForm definition at {p}")
    
    try:
        p.unlink()
        return {"ok": True, "message": f"AcroForm definition deleted for {form}"}
    except Exception as e:
        raise HTTPException(500, f"error deleting AcroForm definition: {e}")

# --- Filling ---
@router.post("/{app}/forms/{form}/fill")
async def fill_from_stored_pdf(app: str, form: str, answers_json: str = Form(...)):
    pdf_path = form_dir(app, form) / "form.pdf"
    tpl_path = form_dir(app, form) / "overlay.json"

    if not pdf_path.exists():
        raise HTTPException(404, f"missing PDF at {pdf_path}")
    if not tpl_path.exists():
        raise HTTPException(404, f"missing overlay at {tpl_path}")

    try:
        answers: Dict[str, Any] = json.loads(answers_json)
    except Exception:
        raise HTTPException(400, "answers_json must be valid JSON")

    pdf_bytes = pdf_path.read_bytes()
    overlay = json.loads(tpl_path.read_text())
    
    # Try AcroForm filling first, fall back to overlay if not available
    try:
        from overlay.acroform_handler import fill_acroform_pdf_bytes
        filled = fill_acroform_pdf_bytes(pdf_bytes, answers)
    except Exception as e:
        # Fall back to original overlay method
        print(f"AcroForm filling failed, falling back to overlay: {e}")
        filled = fill_pdf_overlay_bytes(pdf_bytes, overlay, answers)

    return StreamingResponse(
        io.BytesIO(filled),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{app}_{form}_filled.pdf"'},
    )

# --- Mapper helpers (preview) ---
@router.get("/{app}/forms/{form}/page-metrics")
def app_page_metrics(app: str, form: str, page: int = 0, dpi: int = 144):
    if not MAPPER_ENABLED:
        raise HTTPException(404, "mapper disabled")
    pdf_path = form_dir(app, form) / "form.pdf"
    if not pdf_path.exists():
        raise HTTPException(404, f"missing PDF at {pdf_path}")
    doc = fitz.open(pdf_path)
    try:
        pg = doc[page]
    except Exception:
        raise HTTPException(400, f"invalid page {page}")
    return {
        "pages": len(doc),
        "pointsWidth": pg.rect.width,
        "pointsHeight": pg.rect.height,
        "pixelWidth": int(pg.rect.width / 72 * dpi),
        "pixelHeight": int(pg.rect.height / 72 * dpi),
        "dpi": dpi,
    }

@router.get("/{app}/forms/{form}/preview-page")
def app_preview_page(app: str, form: str, page: int = 0, dpi: int = 144):
    if not MAPPER_ENABLED:
        raise HTTPException(404, "mapper disabled")
    pdf_path = form_dir(app, form) / "form.pdf"
    if not pdf_path.exists():
        raise HTTPException(404, f"missing PDF at {pdf_path}")
    doc = fitz.open(pdf_path)
    try:
        pg = doc[page]
    except Exception:
        raise HTTPException(400, f"invalid page {page}")
    pix = pg.get_pixmap(dpi=dpi, alpha=False)
    return Response(pix.tobytes("png"), media_type="image/png")

