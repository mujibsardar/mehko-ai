from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
import fitz  # PyMuPDF
import tempfile
import os
import re
from typing import Optional, Dict, List

router = APIRouter(prefix="/extract-pdf-content", tags=["pdf"])

class PDFExtractionRequest(BaseModel):
    pdf_url: str
    extract_key_info: bool = True

class PDFExtractionResponse(BaseModel):
    success: bool
    text: Optional[str] = None
    key_info: Optional[Dict[str, List[str]]] = None
    error: Optional[str] = None

@router.post("", response_model=PDFExtractionResponse)
async def extract_pdf_content(request: PDFExtractionRequest):
    try:
        # Download the PDF
        response = requests.get(request.pdf_url, timeout=30)
        response.raise_for_status()
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_file.write(response.content)
            temp_file_path = temp_file.name
        
        try:
            # Extract text using PyMuPDF
            pdf_document = fitz.open(temp_file_path)
            extracted_text = ""
            
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                text = page.get_text()
                extracted_text += text + "\n"
            
            pdf_document.close()
            
            # Clean up the text
            extracted_text = clean_extracted_text(extracted_text)
            
            if len(extracted_text) < 50:
                return PDFExtractionResponse(
                    success=False,
                    error="Insufficient text extracted from PDF"
                )
            
            # Extract key information if requested
            key_info = None
            if request.extract_key_info:
                key_info = extract_key_information(extracted_text)
            
            return PDFExtractionResponse(
                success=True,
                text=extracted_text,
                key_info=key_info
            )
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_file_path)
            except:
                pass
    
    except requests.RequestException as e:
        return PDFExtractionResponse(
            success=False,
            error=f"Failed to download PDF: {str(e)}"
        )
    except Exception as e:
        return PDFExtractionResponse(
            success=False,
            error=f"PDF extraction failed: {str(e)}"
        )

def clean_extracted_text(text: str) -> str:
    """Clean and normalize extracted PDF text"""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Remove common PDF artifacts
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\xff]', '', text)
    
    # Normalize line breaks
    text = re.sub(r'\n+', '\n', text)
    
    return text.strip()

def extract_key_information(text: str) -> Dict[str, List[str]]:
    """Extract key information patterns from PDF text"""
    key_info = {
        "fees": [],
        "requirements": [],
        "contact": [],
        "timelines": [],
        "limits": []
    }
    
    # Fee patterns
    fee_patterns = [
        r'\$[\d,]+(?:\.\d{2})?',
        r'fee[s]?\s*:?\s*\$?[\d,]+(?:\.\d{2})?',
        r'cost[s]?\s*:?\s*\$?[\d,]+(?:\.\d{2})?',
        r'payment[s]?\s*:?\s*\$?[\d,]+(?:\.\d{2})?'
    ]
    
    for pattern in fee_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        key_info["fees"].extend(matches)
    
    # Requirement patterns
    requirement_patterns = [
        r'required\s+documents?[^.]{0,100}',
        r'must\s+include[^.]{0,100}',
        r'shall\s+provide[^.]{0,100}',
        r'documentation\s+required[^.]{0,100}'
    ]
    
    for pattern in requirement_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        key_info["requirements"].extend(matches)
    
    # Contact patterns
    contact_patterns = [
        r'phone\s*:?\s*[\d\-\(\)\s]{10,}',
        r'email\s*:?\s*[\w\.\-@]+@[\w\.\-]+',
        r'address\s*:?\s*[^.]{10,100}',
        r'hours\s*:?\s*[^.]{5,50}'
    ]
    
    for pattern in contact_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        key_info["contact"].extend(matches)
    
    # Timeline patterns
    timeline_patterns = [
        r'\d+\s+(?:days?|weeks?|months?)',
        r'within\s+\d+\s+(?:days?|weeks?|months?)',
        r'processing\s+time[^.]{0,50}',
        r'response\s+time[^.]{0,50}'
    ]
    
    for pattern in timeline_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        key_info["timelines"].extend(matches)
    
    # Limit patterns
    limit_patterns = [
        r'maximum\s+[\d,]+[^.]{0,50}',
        r'limit\s+of\s+[\d,]+[^.]{0,50}',
        r'up\s+to\s+[\d,]+[^.]{0,50}',
        r'not\s+exceed\s+[\d,]+[^.]{0,50}'
    ]
    
    for pattern in limit_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        key_info["limits"].extend(matches)
    
    # Remove duplicates and clean up
    for key in key_info:
        key_info[key] = list(set([item.strip() for item in key_info[key] if item.strip()]))
    
    return key_info
