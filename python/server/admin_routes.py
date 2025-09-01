from fastapi import APIRouter, HTTPException, Form, UploadFile, File
from fastapi.responses import JSONResponse
import json
import os
import pathlib
import logging
from typing import List, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/admin/process-county")
async def process_county(county_data: str = Form(...), filename: Optional[str] = Form(None)):
    """
    Process county JSON upload - migrated from Node.js server
    """
    try:
        # Parse county data
        try:
            county = json.loads(county_data)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON format")
        
        # Validate required fields
        required_fields = ["id", "title", "description", "rootDomain", "supportTools", "steps"]
        missing_fields = [field for field in required_fields if not county.get(field)]
        
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required fields: {', '.join(missing_fields)}"
            )
        
        # Validate steps
        if not isinstance(county.get("steps"), list) or len(county["steps"]) == 0:
            raise HTTPException(status_code=400, detail="County must have at least one step")
        
        # Validate PDF steps
        pdf_steps = [step for step in county["steps"] if step.get("type") == "pdf"]
        for step in pdf_steps:
            if not step.get("formId") or not step.get("pdfUrl"):
                raise HTTPException(
                    status_code=400,
                    detail=f"PDF step {step.get('id', 'unknown')} missing formId or pdfUrl"
                )
        
        # Save county JSON to data directory
        data_dir = pathlib.Path("data")
        data_dir.mkdir(exist_ok=True)
        
        county_file = data_dir / f"{county['id']}.json"
        with open(county_file, "w") as f:
            json.dump(county, f, indent=2)
        
        # Update manifest.json
        manifest_file = data_dir / "manifest.json"
        if manifest_file.exists():
            with open(manifest_file, "r") as f:
                manifest = json.load(f)
        else:
            manifest = {"counties": []}
        
        # Add or update county in manifest
        existing_county = next((c for c in manifest["counties"] if c["id"] == county["id"]), None)
        if existing_county:
            existing_county.update(county)
        else:
            manifest["counties"].append(county)
        
        with open(manifest_file, "w") as f:
            json.dump(manifest, f, indent=2)
        
        logger.info(f"County processed successfully: {county['id']}")
        
        return JSONResponse(content={
            "status": "success",
            "message": f"County '{county['title']}' processed successfully",
            "county_id": county["id"],
            "steps_count": len(county["steps"]),
            "pdf_steps_count": len(pdf_steps)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"County processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"County processing error: {str(e)}")

@router.get("/admin/counties")
async def get_counties():
    """
    Get list of all counties - migrated from Node.js server
    """
    try:
        manifest_file = pathlib.Path("data/manifest.json")
        if not manifest_file.exists():
            return JSONResponse(content={"counties": [], "status": "success"})
        
        with open(manifest_file, "r") as f:
            manifest = json.load(f)
        
        return JSONResponse(content={
            "counties": manifest.get("counties", []),
            "status": "success",
            "count": len(manifest.get("counties", []))
        })
        
    except Exception as e:
        logger.error(f"Get counties error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Get counties error: {str(e)}")

@router.delete("/admin/county/{county_id}")
async def delete_county(county_id: str):
    """
    Delete a county - migrated from Node.js server
    """
    try:
        # Remove county JSON file
        county_file = pathlib.Path(f"data/{county_id}.json")
        if county_file.exists():
            county_file.unlink()
            logger.info(f"County file deleted: {county_id}")
        
        # Update manifest.json
        manifest_file = pathlib.Path("data/manifest.json")
        if manifest_file.exists():
            with open(manifest_file, "r") as f:
                manifest = json.load(f)
            
            # Remove county from manifest
            manifest["counties"] = [c for c in manifest["counties"] if c["id"] != county_id]
            
            with open(manifest_file, "w") as f:
                json.dump(manifest, f, indent=2)
            
            logger.info(f"County removed from manifest: {county_id}")
        
        return JSONResponse(content={
            "status": "success",
            "message": f"County {county_id} deleted successfully"
        })
        
    except Exception as e:
        logger.error(f"Delete county error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Delete county error: {str(e)}")

@router.get("/admin/status")
async def admin_status():
    """
    Check admin service status
    """
    try:
        data_dir = pathlib.Path("data")
        manifest_file = data_dir / "manifest.json"
        
        county_count = 0
        if manifest_file.exists():
            with open(manifest_file, "r") as f:
                manifest = json.load(f)
                county_count = len(manifest.get("counties", []))
        
        return {
            "status": "operational",
            "backend": "python",
            "data_directory": str(data_dir.absolute()),
            "county_count": county_count,
            "message": "Admin services running on Python backend"
        }
        
    except Exception as e:
        logger.error(f"Admin status error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Admin status error: {str(e)}")
