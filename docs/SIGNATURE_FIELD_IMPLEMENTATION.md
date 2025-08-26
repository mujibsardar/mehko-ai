# Signature Field Implementation

## Overview

This document describes the implementation of signature field support in the MEHKO AI application. Signature fields allow users to either draw their signature or generate a cursive text signature that gets embedded into PDFs as images.

## Features

- **Hand-drawn signatures**: Users can draw signatures using mouse/touch on a canvas
- **Generated signatures**: AI-generated cursive text signatures from typed names
- **PDF integration**: Signatures are embedded as PNG images in the final PDF
- **Auto-save**: Signature data is automatically saved to Firestore

## Implementation Details

### Backend (Python)

#### 1. Enhanced PDF Filler (`python/overlay/fill_overlay.py`)

- Added `_signature()` function to insert PNG images into PDFs
- Modified `fill_pdf_overlay_bytes()` to handle `type: "signature"` fields
- Supports both raw PNG bytes and base64 data URLs

#### 2. Signature Utilities (`python/overlay/signature_utils.py`)

- `name_to_signature_png()`: Generates PNG signatures using Pillow
- `text_to_signature_data_url()`: Converts text to base64 data URLs
- Fallback font handling for different cursive fonts

### Frontend (React)

#### 1. Signature Field Component (`src/components/overlay/SignatureField.jsx`)

- Canvas-based signature drawing interface
- Text-to-signature generation
- Clear and regenerate functionality
- Responsive design with proper styling

#### 2. Signature Utilities (`src/helpers/signatureUtils.js`)

- `generateSignatureImage()`: Creates signature images using HTML5 Canvas
- `isSignatureField()`: Identifies signature field types
- `generateSignatureForField()`: Field-specific signature generation

#### 3. Enhanced Interview Component (`src/components/overlay/Interview.jsx`)

- Integrates SignatureField component for signature fields
- Maintains existing form field handling
- Auto-save functionality for signature data

### Configuration

#### Overlay JSON Structure

Signature fields are defined in `overlay.json` files:

```json
{
  "id": "ai_field_19",
  "label": "OWNER'S SIGNATURE",
  "page": 1,
  "type": "signature",
  "rect": [268.5, 708.75, 418.5, 721.25],
  "fontSize": 11,
  "align": "left",
  "shrink": true
}
```

**Key changes:**
- `"type": "signature"` (was `"text"`)
- All other properties remain the same

## Usage

### For Users

1. **Drawing a signature**: Click and drag on the signature canvas
2. **Generating from text**: Click "Generate" button and enter your name
3. **Clearing**: Click "Clear" button to remove the signature
4. **Auto-save**: Changes are automatically saved every 2 seconds

### For Developers

#### Adding Signature Fields

1. Update `overlay.json` to set `"type": "signature"`
2. The Interview component will automatically render SignatureField
3. Signature data is handled as base64 PNG data URLs

#### Customizing Signature Appearance

- Modify `generateSignatureImage()` in `signatureUtils.js`
- Adjust canvas dimensions, fonts, and styling
- Update `SignatureField.scss` for visual customization

## Dependencies

### Backend
- `Pillow` (PIL): Image processing and font rendering
- `PyMuPDF` (fitz): PDF manipulation

### Frontend
- `HTML5 Canvas`: Signature drawing and image generation
- `React`: Component framework
- `SCSS`: Styling

## Testing

The implementation includes comprehensive testing:

```bash
cd python
python -m py_compile overlay/fill_overlay.py
python -m py_compile overlay/signature_utils.py
```

## Example Workflow

1. User opens a form with signature fields
2. User either draws or generates a signature
3. Signature is saved as base64 PNG data URL
4. User submits form
5. Backend processes signature data and embeds PNG into PDF
6. User downloads completed PDF with embedded signature

## Future Enhancements

- **Font variety**: More cursive font options
- **Signature styles**: Different signature appearance options
- **Touch support**: Better mobile/touch signature drawing
- **Validation**: Signature quality and completeness checks
- **Templates**: Pre-defined signature styles

## Troubleshooting

### Common Issues

1. **Font not found**: Install cursive fonts or check font paths
2. **Canvas not working**: Ensure browser supports HTML5 Canvas
3. **PDF generation fails**: Check signature data format and size

### Debug Mode

Enable console logging to debug signature generation:

```javascript
// In signatureUtils.js
console.log('Generating signature for:', text);
console.log('Canvas dimensions:', width, height);
```

## Security Considerations

- Signature data is stored as base64 strings in Firestore
- PNG images are embedded directly into PDFs
- No external signature services or APIs are used
- All processing happens locally in the user's browser and backend
