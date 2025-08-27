// PDF Field Mapper - Simple, clean implementation
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Rnd } from "react-rnd";
import { DndContext, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import useAuth from "../../hooks/useAuth";
import { processAICoordinates, snapToGrid, rectPxToPt, rectPtToPx } from "../../utils/pdfCoords";

const API = "/api";
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
  const fileInputRef = useRef(null);

  // Auth check
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>;
  }

  if (!user || !isAdmin) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-4">Admin privileges required.</p>
        <Link to="/dashboard" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Return to Dashboard
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

      const uploadResponse = await fetch("http://localhost:3000/api/ai-analyze-pdf", {
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
      
      if (aiField) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const dropX = event.activatorEvent.clientX - canvasRect.left;
        const dropY = event.activatorEvent.clientY - canvasRect.top;
        
        // Convert screen coordinates to PDF points
        const pdfCoords = screenToPdfCoords(dropX, dropY, metrics);
        
        // Create new field with proper coordinates
        const newField = {
          id: `field_${Date.now()}`,
          label: aiField.label,
          page: page,
          type: aiField.type,
          rect: rectPxToPt([
            dropX - aiField.width / 2,
            dropY - aiField.height / 2,
            dropX + aiField.width / 2,
            dropY + aiField.height / 2
          ]),
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
        `${API}/apps/${normalizedApp}/forms/${normalizedForm}/page-metrics?${q({
          page,
          dpi: 144,
        })}`
      ).then((r) => r.json());
      setMetrics(m);
      setPages(m.pages || 1);

      const blob = await fetch(
        `${API}/apps/${normalizedApp}/forms/${normalizedForm}/preview-page?${q({
          page,
          dpi: 144,
        })}`
      ).then((r) => r.blob());
      setImgUrl(URL.createObjectURL(blob));
    }
    load();
    return () => setImgUrl(null);
  }, [normalizedApp, normalizedForm, page]);

  // Draggable Field Tray Item
  const DraggableFieldItem = ({ field }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: field.id,
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
        className={`border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all ${
          selectedFields.includes(field.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
        } ${isDragging ? 'shadow-lg' : 'hover:shadow-md'}`}
      >
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={selectedFields.includes(field.id)}
            onChange={(e) => handleFieldSelection(field.id, e.target.checked)}
            className="w-4 h-4"
          />
          <span className="font-semibold text-sm text-gray-900">{field.label}</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            field.confidence > 0.8 ? 'bg-green-100 text-green-800' :
            field.confidence > 0.6 ? 'bg-yellow-100 text-yellow-800' : 
            'bg-red-100 text-red-800'
          }`}>
            {Math.round(field.confidence * 100)}%
          </span>
        </div>
        <div className="text-xs text-gray-600 space-y-1">
          <div>Type: {field.type}</div>
          <div>Size: {field.width}×{field.height}px</div>
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

  // Resizable Field Box
  const ResizableFieldBox = ({ field, isSelected, onUpdate, onSelect }) => {
    const screenRect = rectPtToPx(field.rect);
    const [x, y, x2, y2] = screenRect;
    const width = x2 - x;
    const height = y2 - y;

    const handleDragStop = (e, d) => {
      const newRect = rectPxToPt([d.x, d.y, d.x + width, d.y + height]).map(coord => snapToGrid(coord));
      onUpdate({ ...field, rect: newRect });
    };

    const handleResizeStop = (e, direction, ref, delta, position) => {
      const newRect = rectPxToPt([
        position.x,
        position.y,
        position.x + ref.offsetWidth,
        position.y + ref.offsetHeight
      ]).map(coord => snapToGrid(coord));
      
      onUpdate({ ...field, rect: newRect });
    };

    return (
      <Rnd
        position={{ x, y }}
        size={{ width, height }}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        bounds="parent"
        enableResizing={true}
        resizeHandleStyles={{
          topRight: { background: '#3b82f6' },
          bottomRight: { background: '#3b82f6' },
          bottomLeft: { background: '#3b82f6' },
          topLeft: { background: '#3b82f6' },
          top: { background: '#3b82f6' },
          right: { background: '#3b82f6' },
          bottom: { background: '#3b82f6' },
          left: { background: '#3b82f6' }
        }}
        className={`border-2 ${isSelected ? 'border-red-500' : 'border-green-500'} bg-transparent`}
        onClick={() => onSelect(field.id)}
      >
        <div className="text-xs font-medium text-gray-700 p-1 bg-white bg-opacity-75">
          {field.label || field.id}
        </div>
      </Rnd>
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
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-800">Field Mapper</h1>
              <span className="text-sm text-gray-500">{app}/{form}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded text-sm font-medium ${
                saveStatus === SAVE_STATUS.SAVED ? 'bg-green-100 text-green-700' :
                saveStatus === SAVE_STATUS.SAVING ? 'bg-blue-100 text-blue-700' :
                saveStatus === SAVE_STATUS.UNSAVED ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {saveStatus === SAVE_STATUS.SAVED ? '✓ Saved' :
                 saveStatus === SAVE_STATUS.SAVING ? '⏳ Saving...' :
                 saveStatus === SAVE_STATUS.UNSAVED ? '● Unsaved' : '⚠ Error'}
              </div>
              <button
                onClick={() => save()}
                disabled={saveStatus === SAVE_STATUS.SAVING}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Save Now
              </button>
              <Link to="/admin" className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                ← Admin
              </Link>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="px-3 py-1 bg-gray-100 border rounded hover:bg-gray-200 disabled:opacity-50"
            >
              ◀ Prev
            </button>
            <span className="px-3 py-1 text-sm">Page {page + 1} / {pages}</span>
            <button
              disabled={page >= pages - 1}
              onClick={() => setPage(p => Math.min(pages - 1, p + 1))}
              className="px-3 py-1 bg-gray-100 border rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Next ▶
            </button>
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            <button onClick={addField} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">
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
              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              🤖 AI Detect
            </button>
            <button onClick={clearAllFields} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">
              Clear All
            </button>
            <div className="ml-auto text-sm text-gray-600">
              {overlay.fields.filter(f => f.page === page).length} fields on this page
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1">
          {/* PDF Canvas */}
          <div className="flex-1 p-4">
            <DroppablePDFCanvas>
              <div className="bg-white border border-gray-300 rounded-lg overflow-hidden relative shadow-sm">
                {imgUrl && (
                  <img
                    ref={canvasRef}
                    src={imgUrl}
                    alt={`Page ${page + 1}`}
                    className="max-w-full h-auto block"
                  />
                )}
                
                {/* Field boxes */}
                {overlay.fields
                  .filter(f => f.page === page)
                  .map(field => (
                    <ResizableFieldBox
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
          <div className="w-80 bg-white border-l border-gray-200 p-4">
            {/* AI Progress */}
            {isProcessing && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-sm text-gray-600">
                  {currentStep === "analyzing" && "🤖 AI analyzing PDF..."}
                  {currentStep === "mapping" && "📋 Mapping fields..."}
                  {currentStep === "reviewing" && "✅ Ready for review"}
                </div>
              </div>
            )}

            {/* AI Error */}
            {aiError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                ⚠️ {aiError}
              </div>
            )}

            {/* AI Field Tray */}
            {(currentStep === "reviewing" || currentStep === "fields-ready") && aiSuggestions.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">AI Detected Fields ({aiSuggestions.length})</h3>
                
                {currentStep === "reviewing" && (
                  <button
                    onClick={handleApplyMapping}
                    disabled={selectedFields.length === 0}
                    className={`w-full mb-3 px-4 py-2 rounded text-sm font-medium ${
                      selectedFields.length > 0
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Enable Dragging ({selectedFields.length} selected)
                  </button>
                )}

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {aiSuggestions.map(field => (
                    <DraggableFieldItem key={field.id} field={field} />
                  ))}
                </div>
              </div>
            )}

            {/* Field Editor */}
            {selected && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Edit Field</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Label</label>
                    <input
                      value={selected.label || ""}
                      onChange={(e) => updateField({ ...selected, label: e.target.value })}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Type</label>
                    <select
                      value={selected.type || "text"}
                      onChange={(e) => updateField({ ...selected, type: e.target.value })}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      <option value="text">Text</option>
                      <option value="checkbox">Checkbox</option>
                      <option value="signature">Signature</option>
                    </select>
                  </div>
                  <button
                    onClick={() => deleteField(selected.id)}
                    className="w-full px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="text-xs text-gray-600 space-y-1 pt-4 border-t">
              <div>Total Fields: {overlay.fields.length}</div>
              <div>This Page: {overlay.fields.filter(f => f.page === page).length}</div>
              <div>AI Detected: {aiSuggestions.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragId ? (
          <div className="bg-blue-100 border border-blue-300 rounded p-2 text-sm opacity-90">
            Dragging: {aiSuggestions.find(f => f.id === activeDragId)?.label}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}