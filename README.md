# Mehko AI

A comprehensive application tracking and form management system for MEHKO applications.

## Features

### PDF Form Management
- **Auto-save functionality** for PDF forms with real-time progress tracking
- **Multiple field types** including text, checkbox, and signature fields
- **Signature field type** that generates curvy signatures from user names
- **Form field mapping** with AI-powered field detection
- **PDF preview** with field highlighting and navigation

### Application Tracking
- **Progress tracking** across multiple application steps
- **AI-powered guidance** for completing applications
- **Comment system** for collaboration and notes
- **Role-based access control** for administrators

### AI Integration
- **AI chat assistant** for application guidance
- **AI field mapping** for automatic PDF form analysis
- **Context-aware responses** based on application state

## Field Types

### Text Fields
Standard text input fields for names, addresses, and other information.

### Checkbox Fields
Boolean fields for yes/no questions and confirmations.

### Signature Fields
Special fields that generate handwritten-style signatures from user names:
- **Real-time preview** of generated signature
- **Curvy, flowing signature style** that looks natural
- **Automatic sizing** to fit the field dimensions
- **PDF rendering** using vector graphics for crisp output

## Development

### Adding New Field Types
To add a new field type:

1. **Backend (Python)**: Add rendering function in `python/overlay/fill_overlay.py`
2. **Frontend (React)**: Update field rendering in `src/components/overlay/Interview.jsx`
3. **Mapper**: Add field type option in `src/components/overlay/Mapper.jsx`
4. **Styling**: Add CSS styles for the new field type

### Signature Field Implementation
The signature field type demonstrates the complete field type implementation:

```python
# Backend signature rendering
def _signature(p: fitz.Page, rect: List[float], name: str):
    signature_path = _generate_signature_path(name, rect)
    p.draw_bezier(signature_path, color=(0,0,0), width=1.5, fill_opacity=0, overlay=True)
```

```jsx
// Frontend signature field rendering
{String(f.type || "text").toLowerCase() === "signature" ? (
  <div className="signature-field">
    <input type="text" placeholder="Enter your name for signature" />
    <div className="signature-preview">
      <svg>{/* Signature preview SVG */}</svg>
    </div>
  </div>
) : null}
```

## Getting Started

1. **Install dependencies**: `npm install`
2. **Start development servers**: `./scripts/start-all-services.sh`
3. **Access the application**: http://localhost:3000

## Contributing

Please read the development guidelines in `.cursor/rules/` before making changes.
