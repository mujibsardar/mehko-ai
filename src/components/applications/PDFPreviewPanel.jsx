import React, { useState, useEffect, useRef } from 'react';
import './PDFPreviewPanel.scss';

const PDFPreviewPanel = ({ 
  isOpen, 
  onClose, 
  pdfUrl, 
  currentFieldId, 
  formOverlay,
  className = '' 
}) => {
  const [pdfDocument, setPdfDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Mock PDF rendering for now - we'll integrate PDF.js later
  const renderMockPDF = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw mock PDF background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Draw mock content
    ctx.fillStyle = '#333333';
    ctx.font = '16px Arial';
    ctx.fillText('PDF Preview', 20, 40);
    ctx.fillText('This is a mock PDF preview', 20, 70);
    ctx.fillText('Field highlighting will be implemented here', 20, 100);
    
    // Draw mock form fields
    const fields = [
      { id: 'business_name', x: 50, y: 150, width: 200, height: 30, label: 'Business Name' },
      { id: 'owner_name', x: 50, y: 200, width: 200, height: 30, label: 'Owner Name' },
      { id: 'address', x: 50, y: 250, width: 300, height: 30, label: 'Address' },
    ];
    
    fields.forEach(field => {
      const isCurrentField = currentFieldId === field.id;
      
      // Draw field background
      ctx.fillStyle = isCurrentField ? '#e3f2fd' : '#f5f5f5';
      ctx.fillRect(field.x, field.y, field.width, field.height);
      
      // Draw field border
      ctx.strokeStyle = isCurrentField ? '#2196f3' : '#e0e0e0';
      ctx.lineWidth = isCurrentField ? 2 : 1;
      ctx.strokeRect(field.x, field.y, field.width, field.height);
      
      // Draw field label
      ctx.fillStyle = isCurrentField ? '#1976d2' : '#666666';
      ctx.font = '12px Arial';
      ctx.fillText(field.label, field.x + 5, field.y + 20);
      
      // Add highlight effect for current field
      if (isCurrentField) {
        ctx.shadowColor = '#2196f3';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeRect(field.x - 2, field.y - 2, field.width + 4, field.height + 4);
        ctx.shadowBlur = 0;
      }
    });
  };

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      renderMockPDF();
    }
  }, [isOpen, currentFieldId]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="pdf-preview-backdrop" onClick={onClose} />
      
      {/* Panel */}
      <div 
        ref={containerRef}
        className={`pdf-preview-panel ${className}`}
        style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Header */}
        <div className="pdf-preview-header">
          <div className="pdf-preview-title">
            <h3>PDF Preview</h3>
            <span className="pdf-preview-subtitle">Form Field Highlighting</span>
          </div>
          <button className="pdf-preview-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Controls */}
        <div className="pdf-preview-controls">
          <div className="pdf-preview-scale">
            <button 
              onClick={() => setScale(Math.max(0.5, scale - 0.1))}
              disabled={scale <= 0.5}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <span>{Math.round(scale * 100)}%</span>
            <button 
              onClick={() => setScale(Math.min(2.0, scale + 0.1))}
              disabled={scale >= 2.0}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
          
          <div className="pdf-preview-pagination">
            <button 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15,18 9,12 15,6"></polyline>
              </svg>
            </button>
            <span>Page {currentPage}</span>
            <button 
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= 1} // Mock: only 1 page for now
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9,18 15,12 9,6"></polyline>
              </svg>
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="pdf-preview-content">
          <div className="pdf-preview-canvas-container">
            <canvas
              ref={canvasRef}
              width={400}
              height={600}
              className="pdf-preview-canvas"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pdf-preview-footer">
          <div className="pdf-preview-info">
            <span>Current Field: {currentFieldId || 'None selected'}</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default PDFPreviewPanel;
