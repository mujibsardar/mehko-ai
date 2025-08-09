import boto3
import json
from typing import List, Dict, Any, Optional

_TEXTRACT = None

def _client():
    global _TEXTRACT
    if _TEXTRACT is None:
        _TEXTRACT = boto3.client("textract")
    return _TEXTRACT

def analyze_pdf_bytes(pdf_bytes: bytes, features=("FORMS", "TABLES")) -> Dict[str, Any]:
    # Textract only accepts PDFs up to ~5MB for sync; for bigger use StartDocumentAnalysis S3.
    return _client().analyze_document(
        Document={"Bytes": pdf_bytes},
        FeatureTypes=list(features),
    )

def analyze_image_bytes(img_bytes: bytes, features=("FORMS", "TABLES")) -> Dict[str, Any]:
    return _client().analyze_document(
        Document={"Bytes": img_bytes},
        FeatureTypes=list(features),
    )

def parse_blocks_to_layout(blocks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Normalize Textract blocks into text lines, words, key-value pairs, tables."""
    # Minimal normalizer; expand later as needed.
    return {"blocks": blocks}
