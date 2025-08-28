// PDF Field Mapper - Professional, modern implementation
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import Moveable from "react-moveable";
import { DndContext, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import useAuth from "../../hooks/useAuth";
import { getApiBase, ENDPOINTS } from "../../config/api";
import {
  processAICoordinates,
  snapToGrid,
  rectPxToPt,
  rectPtToPx,
  clampRectPx,
  ensureMinSize,
  cursorToFieldRect
} from "../../utils/pdfCoords";
import "./Mapper.scss";

const API = getApiBase('python');
const normalizeForFilesystem = (str) => str.replace(/\s+/g, "_");

const SAVE_STATUS = {
  SAVED: 'saved',
  SAVING: 'saving',
  UNSAVED: 'unsaved',
  ERROR: 'error'
};

export default function Mapper() {
  const { user, loading, isAdmin } = useAuth();
  const params = useParams();
  const app = params.app || params.appId;
  const form = params.form || params.formId;
  const normalizedApp = normalizeForFilesystem(app);
  const normalizedForm = normalizeForFilesystem(form);

  // Core state
  const [overlay, setOverlay] = useState({ fields: [] });
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [imgUrl, setImgUrl] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [zoom, setZoom] = useState(1);

  // AI state
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [aiError, setAiError] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);

  // Drag state
  const [activeDragId, setActiveDragId] = useState(null);

  // Save state
  const [saveStatus, setSaveStatus] = useState(SAVE_STATUS.SAVED);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState(null);

  const canvasRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auth check
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="access-denied">
        <h1 className="denied-title">Access Denied</h1>
        <p className="denied-message">Admin privileges required to access the Field Mapper.</p>
        <Link to="/dashboard" className="return-button">
          ← Return to Dashboard
        </Link>
      </div>
    );
  }

  // AI Field Processing
  const processAISuggestions = (aiFields) => {
    return aiFields.map((field, index) => {
      const rect = processAICoordinates(field.rect);
      const width = rect[2] - rect[0];
      const height = rect[3] - rect[1];

      return {
        id: `ai_field_${index + 1}`,
        label: field.label || `Field ${index + 1}`,
        page: field.page || 0,
        type: field.type || "text",
        rect: rect,
        fontSize: field.fontSize || 11,
        align: field.align || "left",
        shrink: field.shrink !== false,
        confidence: field.confidence || 0.5,
        aiReasoning: field.reasoning || "AI detected form field",
        originalRect: field.rect,
        width: width,
        height: height,
      };
    });
  };

  // AI PDF Upload Handler
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];

    if (!file || !file.type.includes("pdf")) {
      setAiError("Please select a valid PDF file");
      return;
    }

    setIsProcessing(true);
    setCurrentStep("analyzing");
    setProgress(0);
    setAiError(null);

    try {
      setProgress(20);
      const formData = new FormData();
      formData.append("pdf", file);

      const uploadResponse = await fetch(ENDPOINTS.AI_ANALYZE_PDF(), {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Failed to upload PDF for analysis: ${uploadResponse.status} ${errorText}`);
      }

      const analysisData = await uploadResponse.json();
      setProgress(60);

      setCurrentStep("mapping");
      const suggestions = processAISuggestions(analysisData.fields);
      setAiSuggestions(suggestions);
      setProgress(80);

      setCurrentStep("reviewing");
      const highConfidenceFields = suggestions.filter((f) => f.confidence > 0.8);
      setSelectedFields(highConfidenceFields.map((f) => f.id));
      setProgress(100);
    } catch (err) {
      setAiError(err.message);
      setCurrentStep("idle");
    } finally {
      setIsProcessing(false);
    }
  };

  // Field Selection
  const handleFieldSelection = (fieldId, isSelected) => {
    if (isSelected) {
      setSelectedFields((prev) => [...prev, fieldId]);
    } else {
      setSelectedFields((prev) => prev.filter((id) => id !== fieldId));
    }
  };

  // Prepare fields for dragging
  const handleApplyMapping = () => {
    if (selectedFields.length === 0) {
      setAiError("Please select at least one field to apply");
      return;
    }
    setCurrentStep("fields-ready");
    setAiError(null);
  };

  // Auto-save
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    setSaveStatus(SAVE_STATUS.UNSAVED);

    const timeout = setTimeout(() => {
      save();
    }, 2000);

    setAutoSaveTimeout(timeout);
  }, [autoSaveTimeout]);

  // Save function
  async function save() {
    if (saveStatus === SAVE_STATUS.SAVING) return;
    setSaveStatus(SAVE_STATUS.SAVING);

    try {
      const overlayToSave = {
        ...overlay,
        fields: (overlay.fields || []).map((f) => ({
          ...f,
          rect: rectPxToPt(f.rect),
        })),
      };

      const fd = new FormData();
      fd.append("overlay_json", JSON.stringify(overlayToSave));

      const r = await fetch(`${API}/apps/${normalizedApp}/forms/${normalizedForm}/template`, {
        method: "POST",
        body: fd,
      });

      if (!r.ok) throw new Error(`Save failed: ${r.status}`);

      setSaveStatus(SAVE_STATUS.SAVED);
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
        setAutoSaveTimeout(null);
      }
    } catch (error) {
      setSaveStatus(SAVE_STATUS.ERROR);
    }
  }

  // DndKit Handlers
  const handleDragStart = (event) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (over && over.id === 'pdf-canvas') {
      const draggedFieldId = active.id;
      const aiField = aiSuggestions.find(f => f.id === draggedFieldId);

      if (aiField && metrics) {
        // Calculate cursor center position
        const cursorX = event.activatorEvent.clientX;
        const cursorY = event.activatorEvent.clientY;

        // Convert cursor position to field rectangle
        const fieldRect = cursorToFieldRect(cursorX, cursorY, pdfCanvasRef, zoom, [aiField.width, aiField.height]);

        // Clamp to canvas boundaries and ensure minimum size
        const clampedRect = clampRectPx(fieldRect, pdfCanvasRef, zoom);
        const sizedRect = ensureMinSize(clampedRect, 24, 16);

        // Convert to PDF coordinates and snap to grid
        const pdfCoords = rectPxToPt(sizedRect).map(coord => snapToGrid(coord));

        // Create new field with proper coordinates
        const newField = {
          id: `field_${Date.now()}`,
          label: aiField.label,
          page: page,
          type: aiField.type,
          rect: pdfCoords,
          fontSize: aiField.fontSize || 11,
          align: aiField.align || "left",
          shrink: aiField.shrink !== false,
        };

        setOverlay(prev => ({
          ...prev,
          fields: [...prev.fields, newField]
        }));
        setSelectedId(newField.id);
        scheduleAutoSave();
      }
    }
  };

  // Field update handler
  const updateField = (updatedField) => {
    setOverlay(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === updatedField.id ? updatedField : f)
    }));
    scheduleAutoSave();
  };

  // Field delete handler
  const deleteField = (fieldId) => {
    setOverlay(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId)
    }));
    if (selectedId === fieldId) setSelectedId(null);
    scheduleAutoSave();
  };

  // Load template
  useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/apps/${normalizedApp}/forms/${normalizedForm}/template`);
      const tpl = await res.json();
      const fields = Array.isArray(tpl?.fields)
        ? tpl.fields.map((f) => ({ ...f, rect: rectPtToPx(f.rect) }))
        : [];
      setOverlay({ fields });
      setSaveStatus(SAVE_STATUS.SAVED);
    })();
  }, [normalizedApp, normalizedForm]);

  // Load metrics + preview
  useEffect(() => {
    const q = (obj) => new URLSearchParams(obj).toString();
    async function load() {
      const m = await fetch(
        `${API}/${normalizedApp}/forms/${normalizedForm}/page-metrics?${q({
          page,
          dpi: 144,
        })}`
      ).then((r) => r.json());
      setMetrics(m);
      setPages(m.pages || 1);

      const blob = await fetch(
        `${API}/${normalizedApp}/forms/${normalizedForm}/preview-page?${q({
          page,
          dpi: 144,
        })}`
      ).then((r) => r.blob());
      setImgUrl(URL.createObjectURL(blob));
    }
    load();
    return () => setImgUrl(null);
  }, [normalizedApp, normalizedForm, page]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl/Cmd + S to save
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        save();
      }
      // Delete key to delete selected field
      if (event.key === 'Delete' && selectedId) {
        event.preventDefault();
        deleteField(selectedId);
      }
      // Escape to deselect
      if (event.key === 'Escape') {
        setSelectedId(null);
      }
      // N to add new field
      if (event.key === 'n' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        addField();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedId]);

  // Draggable Field Tray Item
  const DraggableFieldItem = ({ field }) => {
    const canDrag = currentStep === 'fields-ready' && selectedFields.includes(field.id);
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: field.id,
      disabled: !canDrag
    });

    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      opacity: isDragging ? 0.5 : 1,
    } : {};

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`field-item ${selectedFields.includes(field.id) ? 'selected' : ''} ${!canDrag ? 'disabled' : ''}`}
      >
        <div className="field-header">
          <input
            type="checkbox"
            checked={selectedFields.includes(field.id)}
            onChange={(e) => handleFieldSelection(field.id, e.target.checked)}
            className="field-checkbox"
          />
          <span className="field-name">{field.label}</span>
          <span className={`confidence-badge ${field.confidence > 0.8 ? 'high' :
            field.confidence > 0.6 ? 'medium' : 'low'
            }`}>
            {Math.round(field.confidence * 100)}%
          </span>
        </div>
        <div className="field-details">
          <div>Type: {field.type}</div>
          <div>Size: {Math.round(field.width)}×{Math.round(field.height)}px</div>
        </div>
      </div>
    );
  };

  // Droppable PDF Canvas
  const DroppablePDFCanvas = ({ children }) => {
    const { setNodeRef } = useDroppable({
      id: 'pdf-canvas',
    });

    return (
      <div ref={setNodeRef} className="relative">
        {children}
      </div>
    );
  };

  // Moveable Field Box
  const MoveableFieldBox = ({ field, isSelected, onUpdate, onSelect }) => {
    const screenRect = rectPtToPx(field.rect);
    const [x, y, x2, y2] = screenRect;
    const width = x2 - x;
    const height = y2 - y;

    const handleDrag = ({ target, transform }) => {
      const newRect = rectPxToPt([
        transform.x,
        transform.y,
        transform.x + width,
        transform.y + height
      ]).map(coord => snapToGrid(coord));

      // Clamp to canvas boundaries
      const clampedRect = clampRectPx(rectPtToPx(newRect), pdfCanvasRef, zoom);
      const finalRect = rectPxToPt(clampedRect);

      onUpdate({ ...field, rect: finalRect });
    };

    const handleResize = ({ target, width: newWidth, height: newHeight, drag }) => {
      const newRect = rectPxToPt([
        drag.x,
        drag.y,
        drag.x + newWidth,
        drag.y + newHeight
      ]).map(coord => snapToGrid(coord));

      // Ensure minimum size and clamp to boundaries
      const clampedRect = clampRectPx(rectPtToPx(newRect), pdfCanvasRef, zoom);
      const sizedRect = ensureMinSize(clampedRect, 24, 16);
      const finalRect = rectPxToPt(sizedRect);

      onUpdate({ ...field, rect: finalRect });
    };

    return (
      <>
        <div
          data-field-id={field.id}
          className={`field-box ${isSelected ? 'selected' : ''}`}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width,
            height,
            cursor: 'move'
          }}
          onClick={() => onSelect(field.id)}
        >
          <div className="field-label">
            <div className="field-type-indicator">{field.type}</div>
            {field.label || field.id}
          </div>
        </div>

        {isSelected && (
          <Moveable
            target={document.querySelector(`[data-field-id="${field.id}"]`)}
            draggable={true}
            resizable={true}
            snappable={true}
            snapGridWidth={8}
            snapGridHeight={8}
            bounds={pdfCanvasRef.current}
            zoom={zoom}
            onDrag={handleDrag}
            onResize={handleResize}
            renderDirections={['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']}
            elementGuidelines={overlay.fields
              .filter(f => f.id !== field.id && f.page === page)
              .map(f => {
                const rect = rectPtToPx(f.rect);
                return {
                  element: document.querySelector(`[data-field-id="${f.id}"]`),
                  rect: { left: rect[0], top: rect[1], width: rect[2] - rect[0], height: rect[3] - rect[1] }
                };
              })}
          />
        )}
      </>
    );
  };

  const selected = overlay.fields.find(f => f.id === selectedId);

  // Add new field manually
  const addField = () => {
    const newField = {
      id: `field_${Date.now()}`,
      label: "New Field",
      page: page,
      type: "text",
      rect: rectPxToPt([50, 50, 200, 75]),
      fontSize: 11,
      align: "left",
      shrink: true,
      required: false,
      placeholder: "",
      validation: {
        minLength: 0,
        maxLength: 100,
        pattern: "",
        customMessage: ""
      }
    };
    setOverlay(prev => ({ ...prev, fields: [...prev.fields, newField] }));
    setSelectedId(newField.id);
    scheduleAutoSave();
  };

  // Clear all fields
  const clearAllFields = () => {
    if (confirm("Delete all fields? This cannot be undone.")) {
      setOverlay({ fields: [] });
      setSelectedId(null);
      scheduleAutoSave();
    }
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="mapper-container">
        {/* Header */}
        <div className="mapper-header">
          <div className="header-content">
            <div className="header-left">
              <h1 className="header-title">Field Mapper</h1>
              <span className="header-subtitle">{app}/{form}</span>
              <div className="field-summary">
                <span className="total-fields">{overlay.fields.length} total fields</span>
                <span className="page-fields">{overlay.fields.filter(f => f.page === page).length} on this page</span>
              </div>
            </div>
            <div className="header-right">
              <div className={`save-status ${saveStatus === SAVE_STATUS.SAVED ? 'saved' :
                saveStatus === SAVE_STATUS.SAVING ? 'saving' :
                  saveStatus === SAVE_STATUS.UNSAVED ? 'unsaved' :
                    'error'
                }`}>
                {saveStatus === SAVE_STATUS.SAVED ? '✓ Saved' :
                  saveStatus === SAVE_STATUS.SAVING ? '⏳ Saving...' :
                    saveStatus === SAVE_STATUS.UNSAVED ? '● Unsaved' : '⚠ Error'}
              </div>
              <button
                onClick={() => save()}
                disabled={saveStatus === SAVE_STATUS.SAVING}
                className="btn-primary"
              >
                Save Now
              </button>
              <Link to="/admin" className="btn-secondary">
                ← Admin
              </Link>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mapper-toolbar">
          <div className="toolbar-content">
            <div className="page-navigation">
              <button
                disabled={page <= 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                className="btn-nav"
              >
                ◀ Prev
              </button>
              <span className="page-info">Page {page + 1} / {pages}</span>
              <button
                disabled={page >= pages - 1}
                onClick={() => setPage(p => Math.min(pages - 1, p + 1))}
                className="btn-nav"
              >
                Next ▶
              </button>
            </div>
            <div className="divider"></div>
            <div className="zoom-controls">
              <button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                className="btn-zoom"
                disabled={zoom <= 0.5}
              >
                🔍−
              </button>
              <span className="zoom-level">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                className="btn-zoom"
                disabled={zoom >= 3}
              >
                🔍+
              </button>
            </div>
            <div className="divider"></div>
            <div className="action-buttons">
              <button onClick={addField} className="btn-action btn-add">
                + Add Field
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="btn-action btn-ai"
              >
                🤖 AI Detect
              </button>
              <button onClick={clearAllFields} className="btn-action btn-clear">
                Clear All
              </button>
            </div>
            <div className="field-counter">
              {overlay.fields.filter(f => f.page === page).length} fields on this page
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mapper-content">
          {/* PDF Canvas */}
          <div className="pdf-canvas-container">
            <DroppablePDFCanvas>
              <div
                ref={pdfCanvasRef}
                className="pdf-canvas"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
              >
                {imgUrl && (
                  <img
                    ref={canvasRef}
                    src={imgUrl}
                    alt={`Page ${page + 1}`}
                    className="pdf-image"
                  />
                )}

                {/* Field boxes */}
                {overlay.fields
                  .filter(f => f.page === page)
                  .map(field => (
                    <MoveableFieldBox
                      key={field.id}
                      field={field}
                      isSelected={selectedId === field.id}
                      onUpdate={updateField}
                      onSelect={setSelectedId}
                    />
                  ))
                }
              </div>
            </DroppablePDFCanvas>
          </div>

          {/* Right Sidebar */}
          <div className="mapper-sidebar">
            <div className="sidebar-content">
              {/* Search and Filter */}
              <div className="search-filter-section">
                <div className="form-group">
                  <label className="form-label">Search Fields</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input"
                    placeholder="Search field labels..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Filter by Type</label>
                  <select
                    value={fieldFilter}
                    onChange={(e) => setFieldFilter(e.target.value)}
                    className="form-select"
                  >
                    <option value="all">All Types</option>
                    <option value="text">Text Inputs</option>
                    <option value="checkbox">Checkboxes</option>
                    <option value="signature">Signatures</option>
                    <option value="select">Dropdowns</option>
                    <option value="date">Date Pickers</option>
                  </select>
                </div>
              </div>

              {/* AI Progress */}
              {isProcessing && (
                <div className="ai-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="progress-text">
                    {currentStep === "analyzing" && "🤖 AI analyzing PDF..."}
                    {currentStep === "mapping" && "📋 Mapping fields..."}
                    {currentStep === "reviewing" && "✅ Ready for review"}
                  </div>
                </div>
              )}

              {/* AI Error */}
              {aiError && (
                <div className="ai-error">
                  ⚠️ {aiError}
                </div>
              )}

              {/* AI Field Tray */}
              {(currentStep === "reviewing" || currentStep === "fields-ready") && aiSuggestions.length > 0 && (
                <div className="ai-field-tray">
                  <div className="tray-header">
                    <h3 className="tray-title">AI Detected Fields</h3>
                    <span className="field-count">{aiSuggestions.length}</span>
                  </div>

                  {currentStep === "reviewing" && (
                    <button
                      onClick={handleApplyMapping}
                      disabled={selectedFields.length === 0}
                      className="apply-button"
                    >
                      Enable Dragging ({selectedFields.length} selected)
                    </button>
                  )}

                  <div className="field-list">
                    {aiSuggestions.map(field => (
                      <DraggableFieldItem key={field.id} field={field} />
                    ))}
                  </div>
                </div>
              )}

              {/* Field Editor */}
              {selected && (
                <div className="field-editor">
                  <h3 className="editor-title">Edit Field</h3>
                  <div className="form-group">
                    <label className="form-label">Label</label>
                    <input
                      value={selected.label || ""}
                      onChange={(e) => updateField({ ...selected, label: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select
                      value={selected.type || "text"}
                      onChange={(e) => updateField({ ...selected, type: e.target.value })}
                      className="form-select"
                    >
                      <option value="text">Text Input</option>
                      <option value="textarea">Text Area</option>
                      <option value="checkbox">Checkbox</option>
                      <option value="radio">Radio Button</option>
                      <option value="select">Dropdown</option>
                      <option value="signature">Signature</option>
                      <option value="date">Date Picker</option>
                      <option value="number">Number Input</option>
                      <option value="email">Email Input</option>
                      <option value="phone">Phone Input</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Font Size</label>
                    <input
                      type="number"
                      min="8"
                      max="72"
                      value={selected.fontSize || 11}
                      onChange={(e) => updateField({ ...selected, fontSize: parseInt(e.target.value) || 11 })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Alignment</label>
                    <select
                      value={selected.align || "left"}
                      onChange={(e) => updateField({ ...selected, align: e.target.value })}
                      className="form-select"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Required</label>
                    <input
                      type="checkbox"
                      checked={selected.required || false}
                      onChange={(e) => updateField({ ...selected, required: e.target.checked })}
                      className="form-checkbox"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Placeholder</label>
                    <input
                      type="text"
                      value={selected.placeholder || ""}
                      onChange={(e) => updateField({ ...selected, placeholder: e.target.value })}
                      className="form-input"
                      placeholder="Enter placeholder text..."
                    />
                  </div>
                  <button
                    onClick={() => deleteField(selected.id)}
                    className="delete-button"
                  >
                    Delete Field
                  </button>
                </div>
              )}

              {/* Quick Stats */}
              <div className="quick-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Fields:</span>
                  <span className="stat-value">{overlay.fields.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">This Page:</span>
                  <span className="stat-value">{overlay.fields.filter(f => f.page === page).length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">AI Detected:</span>
                  <span className="stat-value">{aiSuggestions.length}</span>
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="keyboard-shortcuts">
                <h4 className="shortcuts-title">Keyboard Shortcuts</h4>
                <div className="shortcuts-list">
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl/Cmd + S</span>
                    <span className="shortcut-desc">Save</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Delete</span>
                    <span className="shortcut-desc">Delete Field</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Escape</span>
                    <span className="shortcut-desc">Deselect</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">N</span>
                    <span className="shortcut-desc">New Field</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragId ? (
          <div className="drag-overlay">
            Dragging: {aiSuggestions.find(f => f.id === activeDragId)?.label}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}