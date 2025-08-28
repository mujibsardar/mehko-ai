import io
import json
import base64
from typing import Dict, Any, List, Optional
import PyPDF2
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter


class AcroFormHandler:
    """Handle PDF AcroForm field filling using PyPDF2 and ReportLab"""
    
    def __init__(self, pdf_bytes: bytes = None):
        self.pdf_bytes = pdf_bytes
        self.field_types = {
            'text': self._fill_text_field,
            'checkbox': self._fill_checkbox_field,
            'dropdown': self._fill_dropdown_field,
            'radio': self._fill_radio_field,
            'signature': self._fill_signature_field,
        }
    
    def is_acroform_pdf(self, pdf_bytes: bytes) -> bool:
        """Check if a PDF already has AcroForm fields"""
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
            
            # Check if PDF has AcroForm
            if '/AcroForm' in pdf_reader.trailer['/Root']:
                form = pdf_reader.trailer['/Root']['/AcroForm']
                if '/Fields' in form and len(form['/Fields']) > 0:
                    return True
            
            return False
        except Exception as e:
            print(f"Error checking AcroForm: {e}")
            return False

    def get_existing_fields(self) -> List[Dict[str, Any]]:
        """Extract existing AcroForm fields from a PDF"""
        if not self.pdf_bytes:
            return []
        
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(self.pdf_bytes))
            fields = []
            
            # Check if PDF has AcroForm
            if '/AcroForm' in pdf_reader.trailer['/Root']:
                form = pdf_reader.trailer['/Root']['/AcroForm']
                if '/Fields' in form:
                    for field_ref in form['/Fields']:
                        field = field_ref.get_object()
                        field_info = self._extract_field_info(field)
                        if field_info:
                            fields.append(field_info)
            
            return fields
        except Exception as e:
            print(f"Error extracting AcroForm fields: {e}")
            return []

    def _extract_field_info(self, field) -> Optional[Dict[str, Any]]:
        """Extract field information from a PDF field object"""
        try:
            field_info = {
                'id': field.get('/T', 'unknown_field'),
                'label': field.get('/TU', field.get('/T', 'Unknown Field')),
                'type': self._get_field_type(field),
                'page': 0,  # Default to first page
                'required': False,  # Default to not required
            }
            
            # Add page number if available
            if '/P' in field:
                try:
                    field_info['page'] = int(field['/P'].split()[1])
                except:
                    pass
            
            return field_info
        except Exception as e:
            print(f"Error extracting field info: {e}")
            return None

    def _get_field_type(self, field) -> str:
        """Determine field type from PDF field"""
        if '/FT' not in field:
            return 'text'
        
        field_type = field['/FT']
        
        if field_type == '/Tx':  # Text field
            if '/MaxLen' in field and field['/MaxLen'] == 1:
                return 'checkbox'  # Single character text field is often a checkbox
            return 'text'
        elif field_type == '/Btn':  # Button
            if '/Ff' in field and field['/Ff'] & 32768:  # Radio button flag
                return 'radio'
            else:
                return 'checkbox'
        elif field_type == '/Ch':  # Choice field
            if '/Ff' in field and field['/Ff'] & 131072:  # Combo box flag
                return 'dropdown'
            else:
                return 'select'
        else:
            return 'text'
    
    def create_acroform_pdf(self, pdf_bytes: bytes, field_definitions: List[Dict[str, Any]]) -> bytes:
        """Create a new PDF with AcroForm fields based on AI-detected field definitions"""
        # Load the existing PDF
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
        pdf_writer = PyPDF2.PdfWriter()
        
        # Copy pages from existing PDF
        for page in pdf_reader.pages:
            pdf_writer.add_page(page)
        
        # Add AcroForm fields based on definitions
        for field_def in field_definitions:
            self._add_acroform_field(pdf_writer, field_def)
        
        # Save to bytes
        output = io.BytesIO()
        pdf_writer.write(output)
        return output.getvalue()
    
    def fill_acroform_pdf(self, pdf_bytes: bytes, answers: Dict[str, Any]) -> bytes:
        """Fill an existing AcroForm PDF with user answers"""
        try:
            # Load the PDF
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
            pdf_writer = PyPDF2.PdfWriter()
            
            # Copy all pages
            for page in pdf_reader.pages:
                pdf_writer.add_page(page)
            
            # Copy the root object (including AcroForm data)
            if '/Root' in pdf_reader.trailer:
                root = pdf_reader.trailer['/Root']
                pdf_writer._root_object = root
            
            # Fill form fields in the reader (this modifies the original objects)
            if '/AcroForm' in pdf_reader.trailer['/Root']:
                form = pdf_reader.trailer['/Root']['/AcroForm']
                if '/Fields' in form:
                    fields = form['/Fields']
                    for field_ref in fields:
                        field = field_ref.get_object()
                        if '/T' in field:  # Field name
                            field_name = field['/T']
                            if field_name in answers:
                                self._fill_form_field(field, answers[field_name])
                                print(f"Filled field '{field_name}' with '{answers[field_name]}'")
            
            # Save to bytes
            output = io.BytesIO()
            pdf_writer.write(output)
            return output.getvalue()
            
        except Exception as e:
            print(f"Error filling AcroForm PDF: {e}")
            raise e
    
    def _fill_form_field(self, field, value):
        """Fill a form field based on its type"""
        if '/FT' in field:  # Field type
            field_type = field['/FT']
            
            if field_type == '/Tx':  # Text field
                field[PyPDF2.generic.NameObject('/V')] = PyPDF2.generic.createStringObject(str(value))
            elif field_type == '/Btn':  # Button (checkbox/radio)
                if value in [True, 'true', '1', 'yes', 'on']:
                    field[PyPDF2.generic.NameObject('/V')] = PyPDF2.generic.NameObject('/Yes')
                else:
                    field[PyPDF2.generic.NameObject('/V')] = PyPDF2.generic.NameObject('/Off')
            elif field_type == '/Ch':  # Choice field (dropdown/list)
                field[PyPDF2.generic.NameObject('/V')] = PyPDF2.generic.createStringObject(str(value))
    
    def _add_acroform_field(self, pdf_writer: PyPDF2.PdfWriter, field_def: Dict[str, Any]):
        """Add a new AcroForm field to the PDF"""
        # For now, we'll use the overlay approach but prepare for AcroForm
        # This is a simplified version - in production you'd want full AcroForm creation
        pass
    
    def _fill_text_field(self, field, value):
        """Fill a text field (placeholder for now)"""
        pass
    
    def _fill_checkbox_field(self, field, value):
        """Fill a checkbox field (placeholder for now)"""
        pass
    
    def _fill_dropdown_field(self, field, value):
        """Fill a dropdown field (placeholder for now)"""
        pass
    
    def _fill_radio_field(self, field, value):
        """Fill a radio field (placeholder for now)"""
        pass
    
    def _fill_signature_field(self, field, value):
        """Fill a signature field (placeholder for now)"""
        pass


# Convenience functions for backward compatibility
def create_acroform_from_overlay(pdf_bytes: bytes, overlay: Dict[str, Any]) -> bytes:
    """Convert overlay definition to AcroForm PDF"""
    handler = AcroFormHandler()
    field_definitions = overlay.get('fields', [])
    return handler.create_acroform_pdf(pdf_bytes, field_definitions)

def fill_acroform_pdf_bytes(pdf_bytes: bytes, answers: Dict[str, Any]) -> bytes:
    """Fill AcroForm PDF with answers"""
    handler = AcroFormHandler()
    return handler.fill_acroform_pdf(pdf_bytes, answers)
