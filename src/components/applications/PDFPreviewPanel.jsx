import React, { useState, useEffect, useRef } from "react";
import "./PDFPreviewPanel.scss";

const PDFPreviewPanel = ({
  isOpen,
  onClose,
  pdfUrl,
  currentFieldId,
  formOverlay,
  appId,
  formId,
  className = "",
}) => {
  const [pdfDocument, setPdfDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(0); // Changed to 0-based indexing
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pageImage, setPageImage] = useState(null);
  const [pageMetrics, setPageMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pan and zoom state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastPanOffset, setLastPanOffset] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const canvasContainerRef = useRef(null);

  const API_BASE = "http://127.0.0.1:8000";

  // Pan and zoom functions
  const resetPan = () => {
    setPanOffset({ x: 0, y: 0 });
  };

  const fitToPage = () => {
    if (!pageMetrics || !canvasContainerRef.current) return;

    const container = canvasContainerRef.current;
    const containerWidth = container.clientWidth - 40; // Account for padding
    const containerHeight = container.clientHeight - 40;

    const scaleX = containerWidth / pageMetrics.pixelWidth;
    const scaleY = containerHeight / pageMetrics.pixelHeight;
    const newScale = Math.min(scaleX, scaleY, 1.0); // Don't scale up beyond 100%

    setScale(newScale);
    resetPan();
  };

  const fitToWidth = () => {
    if (!pageMetrics || !canvasContainerRef.current) return;

    const container = canvasContainerRef.current;
    const containerWidth = container.clientWidth - 40;

    const newScale = containerWidth / pageMetrics.pixelWidth;
    setScale(newScale);
    resetPan();
  };

  const changeScale = (newScale) => {
    const clampedScale = Math.max(0.1, Math.min(5.0, newScale));
    setScale(clampedScale);
    resetPan();
  };

  const goToPage = (pageNum) => {
    if (pageNum >= 0 && pageNum < totalPages) {
      setCurrentPage(pageNum);
      resetPan(); // Reset pan when changing pages
    }
  };

  // Mouse event handlers for panning
  const handleMouseDown = (e) => {
    if (scale <= 1.0) return; // Only allow panning when zoomed in

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setLastPanOffset({ ...panOffset });

    // Change cursor
    if (canvasContainerRef.current) {
      canvasContainerRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || scale <= 1.0) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setPanOffset({
      x: lastPanOffset.x + deltaX,
      y: lastPanOffset.y + deltaY
    });
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);

      // Change cursor back
      if (canvasContainerRef.current) {
        canvasContainerRef.current.style.cursor = 'grab';
      }
    }
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = scale * zoomFactor;
      changeScale(newScale);
    }
  };

  // Load PDF page metrics and image
  useEffect(() => {
    if (!isOpen || !appId || !formId) return;

    const loadPageData = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log("🔄 Loading PDF page data:", {
          appId,
          formId,
          currentPage,
        });

        // Load page metrics first
        const metricsResponse = await fetch(
          `${API_BASE}/apps/${appId}/forms/${formId}/page-metrics?page=${currentPage}&dpi=144`
        );

        if (!metricsResponse.ok) {
          throw new Error(
            `Failed to load page metrics: ${metricsResponse.status}`
          );
        }

        const metrics = await metricsResponse.json();
        console.log("📊 Page metrics loaded:", metrics);
        setPageMetrics(metrics);
        setTotalPages(metrics.pages || 1);

        // Load page image
        const imageUrl = `${API_BASE}/apps/${appId}/forms/${formId}/preview-page?page=${currentPage}&dpi=144`;
        console.log("🖼️ Loading PDF page image from:", imageUrl);

        const imageResponse = await fetch(imageUrl);

        if (!imageResponse.ok) {
          throw new Error(`Failed to load page image: ${imageResponse.status}`);
        }

        const blob = await imageResponse.blob();
        console.log("📄 PDF page blob received:", {
          size: blob.size,
          type: blob.type,
        });

        const objectUrl = URL.createObjectURL(blob);
        console.log("🔗 Object URL created:", objectUrl);
        setPageImage(objectUrl);
      } catch (err) {
        console.error("❌ Error loading PDF page:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPageData();

    // Cleanup function to revoke object URL
    return () => {
      if (pageImage) {
        console.log("🧹 Cleaning up object URL:", pageImage);
        URL.revokeObjectURL(pageImage);
      }
    };
  }, [isOpen, appId, formId, currentPage]);

  // Render PDF page with field overlays
  useEffect(() => {
    if (!pageImage || !canvasRef.current) {
      console.log("⏳ Waiting for page image or canvas:", {
        pageImage: !!pageImage,
        canvas: !!canvasRef.current,
      });
      return;
    }

    console.log("🎨 Starting PDF rendering:", {
      pageImage,
      currentFieldId,
      scale,
      currentPage,
    });

    const img = new Image();

    img.onload = () => {
      console.log("🖼️ Image loaded successfully:", {
        width: img.width,
        height: img.height,
      });

      const canvas = canvasRef.current;
      if (!canvas) {
        console.error("❌ Canvas ref is null");
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.error("❌ Could not get canvas context");
        return;
      }

      // Set canvas size based on image and scale
      const scaledWidth = Math.round(img.width * scale);
      const scaledHeight = Math.round(img.height * scale);
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;

      console.log("📏 Canvas dimensions set:", {
        width: scaledWidth,
        height: scaledHeight,
        scale,
        panOffset,
      });

      // Clear canvas with white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, scaledWidth, scaledHeight);

      // Apply pan offset transformation
      ctx.save();
      ctx.translate(panOffset.x, panOffset.y);

      // Draw PDF page image
      ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
      console.log("✅ PDF page image drawn to canvas");

      // Draw field overlays
      if (formOverlay?.fields) {
        const pageFields = formOverlay.fields.filter(
          (f) => Number(f.page || 0) === currentPage
        );

        console.log("🏷️ Rendering field overlays:", {
          totalFields: formOverlay.fields.length,
          pageFields: pageFields.length,
          currentPage,
          currentFieldId,
        });

        pageFields.forEach((field) => {
          const [x0, y0, x1, y1] = field.rect || [0, 0, 100, 20];
          const isCurrentField = currentFieldId === field.id;

          console.log("🏷️ Processing field:", {
            id: field.id,
            isCurrentField,
            currentFieldId,
            rect: [x0, y0, x1, y1],
          });

          // Convert points to pixels and apply scale
          const scaledX0 = Math.round(x0 * (144 / 72) * scale); // Convert points to pixels (144 DPI) and apply scale
          const scaledY0 = Math.round(y0 * (144 / 72) * scale);
          const scaledX1 = Math.round(x1 * (144 / 72) * scale);
          const scaledY1 = Math.round(y1 * (144 / 72) * scale);

          const fieldWidth = scaledX1 - scaledX0;
          const fieldHeight = scaledY1 - scaledY0;

          console.log("🏷️ Drawing field:", {
            id: field.id,
            rect: [x0, y0, x1, y1],
            scaled: [scaledX0, scaledY0, scaledX1, scaledY1],
            dimensions: [fieldWidth, fieldHeight],
            isCurrentField,
          });

          // Draw field background
          ctx.fillStyle = isCurrentField
            ? "rgba(33, 150, 243, 0.3)"
            : "rgba(0, 0, 0, 0.05)";
          ctx.fillRect(scaledX0, scaledY0, fieldWidth, fieldHeight);

          // Draw field border
          ctx.strokeStyle = isCurrentField ? "#2196f3" : "#666666";
          ctx.lineWidth = isCurrentField ? 3 : 1;
          ctx.strokeRect(scaledX0, scaledY0, fieldWidth, fieldHeight);

          // Add highlight effect for current field
          if (isCurrentField) {
            ctx.shadowColor = "#2196f3";
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.strokeRect(
              scaledX0 - 2,
              scaledY0 - 2,
              fieldWidth + 4,
              fieldHeight + 4
            );
            ctx.shadowBlur = 0;

            // Draw field label
            ctx.fillStyle = "#1976d2";
            ctx.font = "14px Arial";
            ctx.fillText(field.label || field.id, scaledX0, scaledY0 - 8);
          }
        });

        console.log("✅ Field overlays rendered");
      } else {
        console.log("⚠️ No form overlay fields available");
      }

      // Restore context after drawing everything
      ctx.restore();
    };

    img.onerror = (error) => {
      console.error("❌ Error loading image:", error);
      setError("Failed to load PDF page image");
    };

    console.log("🔄 Setting image source:", pageImage);
    img.src = pageImage;
  }, [pageImage, currentFieldId, formOverlay, scale, currentPage, panOffset]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      } else if (e.key === "0" && isOpen) {
        // Reset zoom and pan
        changeScale(1.0);
        resetPan();
      } else if (e.key === "r" && isOpen && scale > 1.0) {
        // Reset pan only
        resetPan();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose, scale]);

  // Debug currentFieldId changes
  useEffect(() => {
    console.log("🔍 currentFieldId changed:", currentFieldId);
  }, [currentFieldId]);

  // Debug formOverlay changes
  useEffect(() => {
    console.log("🔍 formOverlay changed:", {
      hasFields: !!formOverlay?.fields,
      fieldCount: formOverlay?.fields?.length || 0,
      firstField: formOverlay?.fields?.[0],
    });
  }, [formOverlay]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="pdf-preview-backdrop" onClick={onClose} />

      {/* Full-screen Panel */}
      <div
        ref={containerRef}
        className={`pdf-preview-panel-fullscreen ${className}`}
        style={{ 
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden'
        }}
      >
        {/* Header */}
        <div className="pdf-preview-header">
          <div className="pdf-preview-title">
            <h3>PDF Preview</h3>
            <span className="pdf-preview-subtitle">
              Form Field Highlighting • {scale > 1.0 ? 'Drag to pan • ' : ''}Ctrl+Scroll to zoom
            </span>
          </div>
          <button className="pdf-preview-close" onClick={onClose}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Controls */}
        <div className="pdf-preview-controls">
          <div className="pdf-preview-scale">
            <button onClick={fitToPage} title="Fit page">
              Fit
            </button>
            <button onClick={fitToWidth} title="Fit width">
              Fit‑W
            </button>
            <button
              onClick={() => changeScale(scale - 0.25)}
              disabled={scale <= 0.1}
              title="Zoom out"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <span style={{ minWidth: '60px', textAlign: 'center' }}>
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => changeScale(scale + 0.25)}
              disabled={scale >= 5.0}
              title="Zoom in"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            {scale > 1.0 && (
              <button 
                onClick={resetPan} 
                title="Reset pan position"
                style={{ marginLeft: '8px' }}
              >
                🎯
              </button>
            )}
          </div>

          <div className="pdf-preview-pagination">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 0}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="15,18 9,12 15,6"></polyline>
              </svg>
            </button>
            <span>
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="9,18 15,12 9,6"></polyline>
              </svg>
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="pdf-preview-content">
          <div 
            ref={canvasContainerRef}
            className="pdf-preview-canvas-container"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{
              cursor: scale > 1.0 ? 'grab' : 'default',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {loading && (
              <div className="pdf-preview-loading">
                <div className="loading-spinner"></div>
                <p>Loading PDF page...</p>
              </div>
            )}

            {error && (
              <div className="pdf-preview-error">
                <p>Error loading PDF: {error}</p>
                <button onClick={() => window.location.reload()}>Retry</button>
              </div>
            )}

            {!loading && !error && (
              <>
                <canvas
                  ref={canvasRef}
                  className="pdf-preview-canvas"
                  style={{ 
                    display: "block",
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                  }}
                />
                {/* Debug info overlay */}
                <div
                  className="pdf-preview-debug"
                  style={{
                    position: "absolute",
                    top: "10px",
                    left: "10px",
                    background: "rgba(0,0,0,0.8)",
                    color: "white",
                    padding: "8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    zIndex: 1000,
                  }}
                >
                  <div>Debug Info:</div>
                  <div>
                    Page Image: {pageImage ? "✅ Loaded" : "❌ Not loaded"}
                  </div>
                  <div>
                    Canvas: {canvasRef.current ? "✅ Ready" : "❌ Not ready"}
                  </div>
                  <div>
                    Canvas Size:{" "}
                    {canvasRef.current
                      ? `${canvasRef.current.width}x${canvasRef.current.height}`
                      : "N/A"}
                  </div>
                  <div>
                    Form Overlay:{" "}
                    {formOverlay?.fields
                      ? `✅ ${formOverlay.fields.length} fields`
                      : "❌ No fields"}
                  </div>
                  <div>Current Page: {currentPage}</div>
                  <div>Scale: {scale}</div>
                  <div>
                    Page Metrics: {pageMetrics ? "✅ Loaded" : "❌ Not loaded"}
                  </div>
                  {pageMetrics && (
                    <div>
                      Page Dimensions: {pageMetrics.pixelWidth}x
                      {pageMetrics.pixelHeight}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pdf-preview-footer">
          <div className="pdf-preview-info">
            <span>Current Field: {currentFieldId || "None selected"}</span>
            {pageMetrics && (
              <span className="page-info">
                • Page {currentPage + 1} of {totalPages} • Scale: {Math.round(scale * 100)}%
                {scale > 1.0 && " • Drag to pan • R to reset pan • 0 to reset zoom"}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PDFPreviewPanel;
