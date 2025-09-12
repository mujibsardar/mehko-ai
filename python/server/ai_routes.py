from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
import json
import os
import openai
import re
import requests
from typing import Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize OpenAI client
openai_client = None
try:
    openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
except Exception as e:
    logger.warning(f"OpenAI client not initialized: {e}")

@router.post("/ai-chat")
async def ai_chat(request: dict):
    """
    AI chat endpoint - migrated from Node.js server
    Accepts JSON payload with 'messages' array and full context
    """
    try:
        if not openai_client:
            raise HTTPException(status_code=500, detail="OpenAI client not configured")
        
        # Extract and sanitize messages from the request
        if not isinstance(request, dict):
            raise HTTPException(status_code=400, detail="Invalid request payload")

        raw_messages = request.get("messages", [])
        if not isinstance(raw_messages, list):
            raw_messages = []
        # Drop null/invalid entries and coerce to minimal shape
        messages = []
        for m in raw_messages:
            if isinstance(m, dict):
                role = m.get("role") or ("assistant" if m.get("sender") == "ai" else "user")
                content = m.get("content") or m.get("text") or ""
                messages.append({"role": role, "content": content})
        if not messages:
            raise HTTPException(status_code=400, detail="Messages array is required")
        
        # Get the last user message
        last_user_message = None
        for msg in reversed(messages):
            if msg.get("role") == "user":
                last_user_message = msg.get("content", "")
                break
        
        if not last_user_message:
            raise HTTPException(status_code=400, detail="No user message found in messages array")
        
        # Extract full context information with safe defaults
        context = request.get("context") or {}
        if not isinstance(context, dict):
            context = {}
        application = context.get("application", {})
        if not isinstance(application, dict):
            application = {}

        steps = context.get("steps", [])
        if not isinstance(steps, list):
            steps = []
        # Keep only dict steps to avoid attribute errors
        steps = [s for s in steps if isinstance(s, dict)]

        current_step = context.get("currentStep", {})
        if not isinstance(current_step, dict):
            current_step = {}
        completed_step_ids = context.get("completedStepIds", [])
        form_data = context.get("formData", {})
        pdf_text = context.get("pdfText", {})
        selected_form = context.get("selectedForm") or None
        comments = context.get("comments", [])
        overlays = context.get("overlays", {})
        if not isinstance(overlays, dict):
            overlays = {}
        # Normalize overlays values to lists
        overlays = {str(k): (v if isinstance(v, list) else []) for k, v in overlays.items()}

        # Normalize list/dict types to prevent attribute errors
        if not isinstance(steps, list): steps = []
        if not isinstance(completed_step_ids, list): completed_step_ids = []
        if not isinstance(form_data, dict): form_data = {}
        if not isinstance(pdf_text, dict): pdf_text = {}
        if not isinstance(comments, list): comments = []
        if not isinstance(overlays, dict): overlays = {}
        
        # Build form field information (same logic as Node.js)
        form_sections = []
        for step_id, fields in overlays.items():
            # Find step by id or _id safely
            step = next((s for s in steps if (s.get("id") == step_id or s.get("_id") == step_id)), None)
            if isinstance(step, dict) and isinstance(fields, list) and len(fields) > 0:
                field_lines = []
                for f in fields:
                    try:
                        # If fields are dicts, prefer their id/label; else cast to str
                        if isinstance(f, dict):
                            label = f.get("label") or f.get("id") or str(f)
                            field_lines.append(f"- {label}")
                        else:
                            field_lines.append(f"- {str(f)}")
                    except Exception:
                        field_lines.append("- (unreadable field)")
                form_sections.append(
                    f"Step: {step.get('title', 'Unknown')} ({step.get('formName', 'Unknown PDF')})\nFields:\n" + "\n".join(field_lines)
                )
        
        # Enhanced system prompt with full context (same as Node.js version)
        system_prompt = f"""
You are an AI assistant helping users apply for a MEHKO permit. You are knowledgeable, patient, and provide practical guidance.
IMPORTANT: For PDF type steps, users fill out forms within the app and then download the completed PDF to submit. Some forms may need to be downloaded from external sources.

Application: {application.get('title', 'MEHKO Permit')}
Source: {application.get('rootDomain', 'Government')}

Available Steps:
{chr(10).join([f"Step {i+1}: {s.get('title', 'Unknown')} ({s.get('type', 'unknown')}){' - ACTION REQUIRED' if s.get('action_required') else ''}" for i, s in enumerate(steps)])}

User's Progress:
- Completed Steps: {', '.join(completed_step_ids) if completed_step_ids else 'None'}
- Current Step: {current_step.get('title', 'Not specified')}

Form Completion Steps:
{chr(10).join([f"- Step {i+1}: {s.get('title', 'Unknown')} ({s.get('formId', 'unknown')}) - Complete the form here" for i, s in enumerate(steps) if s.get('type') == 'pdf'])}

Form Field Information:
{chr(10).join(form_sections) if form_sections else 'No form fields data available'}

User's Saved Form Data:
{chr(10).join([f"- {form_id}: {len(data)} fields filled" for form_id, data in form_data.items()]) if form_data else 'No saved form data'}

PDF Text Content:
{chr(10).join([f"- {form_id}: {text[:200]}..." if len(text) > 200 else f"- {form_id}: {text}" for form_id, text in pdf_text.items()]) if pdf_text else 'No PDF text available'}

Community Insights:
{chr(10).join([f"- {comment.get('text', comment) if isinstance(comment, dict) else comment}" for comment in comments]) if comments else 'No community comments yet'}
"""

        # Add form-specific context if selectedForm exists
        if selected_form and isinstance(selected_form, dict):
            form_step = next((s for s in steps if s.get("formId") == selected_form.get("formId")), None)
            if form_step:
                step_index = next((i for i, s in enumerate(steps) if s.get("id") == form_step.get("id")), -1) + 1
                pdf_content = selected_form.get('pdfContent', 'No content available')
                if pdf_content and len(pdf_content) > 500:
                    pdf_content = pdf_content[:500] + "..."
                
                system_prompt += f"""

FORM-SPECIFIC CONTEXT:
- Selected Form: {selected_form.get('title', 'Unknown')} (Step {step_index})
- Form ID: {selected_form.get('formId', 'unknown')}
- PDF Content: {pdf_content}
"""

        # Prepare messages for OpenAI (system + conversation)
        openai_messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Add conversation history
        for msg in messages:
            role = msg.get("role", "user") if isinstance(msg, dict) else "user"
            content = msg.get("content", "") if isinstance(msg, dict) else ""
            openai_messages.append({"role": role, "content": content})
        
        # Call OpenAI API
        try:
            completion = openai_client.chat.completions.create(
                model="gpt-4",
                messages=openai_messages,
                max_tokens=1000,
                temperature=0.7
            )
            
            ai_response = completion.choices[0].message.content
            
        except Exception as openai_error:
            logger.error(f"OpenAI API error: {str(openai_error)}")
            # Fallback response if OpenAI fails
            ai_response = f"I understand you're asking about '{last_user_message}'. I'm here to help with your MEHKO application, but I'm experiencing technical difficulties. Please try again or contact support."
        
        response = {
            "reply": ai_response,
            "status": "success"
        }
        
        logger.info(f"AI chat request processed with full context: {last_user_message[:50]}...")
        return JSONResponse(content=response)
        
    except Exception as e:
        logger.error(f"AI chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI chat error: {str(e)}")

@router.post("/ai-analyze-pdf")
async def ai_analyze_pdf(pdf: UploadFile = File(...)):
    """
    AI PDF analysis endpoint - migrated from Node.js server
    """
    try:
        if not openai_client:
            raise HTTPException(status_code=500, detail="OpenAI client not configured")
        
        # Validate PDF file
        if not pdf.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="File must be a PDF")
        
        # For now, return a placeholder response
        # TODO: Implement full OpenAI Vision API integration
        response = {
            "fields": [
                {
                    "type": "text",
                    "x": 100,
                    "y": 200,
                    "width": 150,
                    "height": 25,
                    "label": "Sample Field",
                    "confidence": 0.95
                }
            ],
            "status": "success",
            "message": "PDF analysis endpoint migrated to Python backend"
        }
        
        logger.info(f"PDF analysis request processed: {pdf.filename}")
        return JSONResponse(content=response)
        
    except Exception as e:
        logger.error(f"PDF analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PDF analysis error: {str(e)}")

@router.post("/form-fields")
async def form_fields(data: dict):
    """
    Form fields endpoint - migrated from Node.js server
    """
    try:
        # Process form fields data
        # TODO: Implement form field processing logic
        response = {
            "status": "success",
            "message": "Form fields endpoint migrated to Python backend",
            "data": data
        }
        
        logger.info("Form fields request processed")
        return JSONResponse(content=response)
        
    except Exception as e:
        logger.error(f"Form fields error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Form fields error: {str(e)}")

@router.post("/save-progress")
async def save_progress(request: dict):
    """
    Save user progress - migrated from Node.js server
    """
    try:
        user_id = request.get("userId", "guest")
        application_id = request.get("applicationId")
        form_data = request.get("formData", {})
        
        logger.info(f"Saving progress for user: {user_id}, application: {application_id}")
        
        # TODO: Implement Firebase integration for saving progress
        # For now, return success response
        response = {
            "success": True,
            "userId": user_id,
            "applicationId": application_id,
            "message": "Progress saved (placeholder - Firebase integration needed)"
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        logger.error(f"Save progress error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Save progress error: {str(e)}")

@router.get("/form-fields")
async def form_fields(application_id: str, form_name: str):
    """
    Get form fields - migrated from Node.js server
    """
    try:
        if not application_id or not form_name:
            raise HTTPException(status_code=400, detail="Missing applicationId or formName")
        
        # Convert form name to JSON path (same logic as Node.js)
        json_filename = form_name.replace(".pdf", ".json")
        json_path = f"data/applications/{application_id}/forms/{json_filename}"
        
        if not os.path.exists(json_path):
            raise HTTPException(status_code=404, detail="Form JSON not found")
        
        with open(json_path, 'r') as f:
            merged_fields = json.load(f)
        
        return {"fields": merged_fields}
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Form JSON not found")
    except Exception as e:
        logger.error(f"Form fields error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load form fields: {str(e)}")

@router.post("/download-pdf")
async def download_pdf(request: dict):
    """
    Download PDF from URL - migrated from Node.js server
    """
    try:
        url = request.get("url")
        app_id = request.get("appId")
        form_id = request.get("formId")
        
        if not url or not app_id or not form_id:
            raise HTTPException(status_code=400, detail="Missing required fields: url, appId, formId")
        
        # Validate appId format
        if not re.match(r'^[a-z0-9_]+$', app_id):
            raise HTTPException(status_code=400, detail="Invalid appId format. Use only lowercase letters, numbers, and underscores.")
        
        # Validate formId format
        if not re.match(r'^[A-Za-z0-9_-]+$', form_id):
            raise HTTPException(status_code=400, detail="Invalid formId format. Use only letters, numbers, hyphens, and underscores.")
        
        # Create directory structure
        app_dir = f"data/applications/{app_id}"
        forms_dir = f"{app_dir}/forms"
        form_dir = f"{forms_dir}/{form_id}"
        
        os.makedirs(form_dir, exist_ok=True)
        
        # Download PDF from URL
        logger.info(f"Downloading PDF from: {url}")
        import requests
        
        response = requests.get(url)
        response.raise_for_status()
        
        # Check if response is actually a PDF
        content_type = response.headers.get("content-type", "")
        if "application/pdf" not in content_type:
            logger.warning(f"Warning: Response may not be a PDF. Content-Type: {content_type}")
        
        # Save PDF to local filesystem
        pdf_path = f"{form_dir}/form.pdf"
        with open(pdf_path, 'wb') as f:
            f.write(response.content)
        
        logger.info(f"PDF saved to: {pdf_path}")
        
        return {
            "success": True,
            "message": f"PDF downloaded and saved to {pdf_path}",
            "path": pdf_path,
            "size": len(response.content)
        }
        
    except requests.RequestException as e:
        logger.error(f"Download error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to download PDF: {str(e)}")
    except Exception as e:
        logger.error(f"Download PDF error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Download PDF error: {str(e)}")

@router.get("/ai-status")
async def ai_status():
    """
    Check AI service status
    """
    return {
        "status": "operational",
        "backend": "python",
        "openai_configured": openai_client is not None,
        "message": "AI services running on Python backend"
    }
