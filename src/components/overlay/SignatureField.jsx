import React, { useRef, useEffect, useState } from 'react';
import { generateSignatureImage } from '../../helpers/signatureUtils';
import './SignatureField.scss';

const SignatureField = ({ 
  fieldId, 
  value, 
  onChange, 
  onFocus, 
  onBlur,
  field 
}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setLastX(x);
    setLastY(y);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    setLastX(x);
    setLastY(y);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    saveSignature();
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(fieldId, 'signature', dataUrl);
    } catch (error) {
      console.error('Error saving signature:', error);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(fieldId, 'signature', '');
  };

  const generateSignatureFromText = () => {
    const text = prompt('Enter your name for signature:');
    if (text) {
      const signatureDataUrl = generateSignatureImage(text, {
        width: canvasRef.current?.width || 200,
        height: canvasRef.current?.height || 50,
        fontSize: 24
      });
      onChange(fieldId, 'signature', signatureDataUrl);
      
      // Draw the generated signature on canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = signatureDataUrl;
      }
    }
  };

  return (
    <div className="signature-field">
      <canvas
        ref={canvasRef}
        width={200}
        height={50}
        style={{
          border: '1px solid #ccc',
          cursor: 'crosshair',
          backgroundColor: '#fff'
        }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      <div className="signature-controls">
        <button
          type="button"
          onClick={generateSignatureFromText}
          className="generate-signature-btn"
          title="Generate signature from text"
        >
          ✍️ Generate
        </button>
        <button
          type="button"
          onClick={clearSignature}
          className="clear-signature-btn"
          title="Clear signature"
        >
          ✗ Clear
        </button>
      </div>
    </div>
  );
};

export default SignatureField;
