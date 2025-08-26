"""
Utility functions for generating signature images from text names.
"""

import base64
import io
from typing import Union, Optional

try:
    from PIL import Image, ImageDraw, ImageFont
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False

def name_to_signature_png(name: str, font_size: int = 48, width: int = 300, height: int = 80) -> bytes:
    """
    Generate a signature PNG from a name using a cursive-style font.
    
    Args:
        name: The name to convert to signature
        font_size: Font size for the signature
        width: Width of the output image
        height: Height of the output image
    
    Returns:
        PNG image as bytes
    """
    if not PILLOW_AVAILABLE:
        raise ImportError("Pillow (PIL) is required for signature generation. Install with: pip install Pillow")
    
    # Create a transparent image
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Try to use a cursive font, fallback to default if not available
    try:
        # Try to use a cursive font - you may need to install fonts or adjust path
        font = ImageFont.truetype("fonts/DancingScript-Regular.ttf", font_size)
    except (OSError, IOError):
        try:
            # Try alternative cursive fonts
            font = ImageFont.truetype("fonts/GreatVibes-Regular.ttf", font_size)
        except (OSError, IOError):
            # Fallback to default font
            font = ImageFont.load_default()
    
    # Get text bounding box
    bbox = draw.textbbox((0, 0), name, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Center the text
    x = (width - text_width) // 2
    y = (height - text_height) // 2
    
    # Draw the signature text with a slight stroke for better appearance
    draw.text((x, y), name, font=font, fill=(0, 0, 0, 235))
    
    # Convert to PNG bytes
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()

def text_to_signature_data_url(text: str, **kwargs) -> str:
    """
    Convert text to a signature data URL that can be used directly in the frontend.
    
    Args:
        text: The text to convert to signature
        **kwargs: Additional arguments for name_to_signature_png
    
    Returns:
        Data URL string (e.g., "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...")
    """
    png_bytes = name_to_signature_png(text, **kwargs)
    base64_data = base64.b64encode(png_bytes).decode('utf-8')
    return f"data:image/png;base64,{base64_data}"

def is_signature_field(field: dict) -> bool:
    """
    Check if a field is a signature field.
    
    Args:
        field: Field dictionary from overlay
        
    Returns:
        True if field type is "signature"
    """
    return field.get("type", "text").lower() == "signature"
