// src/components/overlay/Mapper.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import AIFieldMapper from "../ai/AIFieldMapper";

// API prefix
const API = "/api";

// Helper function to convert spaces to underscores for filesystem compatibility
const normalizeForFilesystem = (str) => str.replace(/\s+/g, "_");

// Preview DPI + unit converters
const PREVIEW_DPI = 144; // image rendered at 144 dpi
const ptToPx = (n) => n * (PREVIEW_DPI / 72); // points -> pixels
const pxToPt = (n) => n * (72 / PREVIEW_DPI); // pixels -> points
const rectPtToPx = (r = [0, 0, 0, 0]) => [
  ptToPx(r[0]),
  ptToPx(r[1]),
  ptToPx(r[2]),
  ptToPx(r[3]),
];
const rectPxToPt = (r = [0, 0, 0, 0]) => [
  pxToPt(r[0]),
  pxToPt(r[1]),
  pxToPt(r[2]),
  pxToPt(r[3]),
];

// Save status types
const SAVE_STATUS = {
  SAVED: 'saved',
  SAVING: 'saving',
  UNSAVED: 'unsaved',
  ERROR: 'error'
};

export default function Mapper() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Check if user is authenticated and is admin
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-4">Admin privileges required.</p>
        <p className="text-sm text-gray-500">
          Only authorized users can access this area.
        </p>
        <Link
          to="/dashboard"
          className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Support both route param styles: /admin/mapper/:app/:form and /admin/mapper/:appId/:formId
  const params = useParams();
  const app = params.app || params.appId;
  const form = params.form || params.formId;

  // Normalize app and form names for filesystem compatibility
  const normalizedApp = normalizeForFilesystem(app);
  const normalizedForm = normalizeForFilesystem(form);

  const [overlay, setOverlay] = useState({ fields: [] });
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [imgUrl, setImgUrl] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [editMode, setEditMode] = useState(false); // New: Field placement mode
  const [draggedField, setDraggedField] = useState(null); // New: Track field being dragged
  const [resizeHandle, setResizeHandle] = useState(null); // New: Track resize handle

  // AI Field Extraction state
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [aiError, setAiError] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Field reordering state
  const [reorderMode, setReorderMode] = useState(false);
  const [draggedFieldId, setDraggedFieldId] = useState(null);
  const [dragOverFieldId, setDragOverFieldId] = useState(null);
  const [fieldOrder, setFieldOrder] = useState([]);
  const [showInsertDialog, setShowInsertDialog] = useState(false);
  const [insertPosition, setInsertPosition] = useState(0);

  // Save state management
  const [saveStatus, setSaveStatus] = useState(SAVE_STATUS.SAVED);
  const [lastSaved, setLastSaved] = useState(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [autoSaveCountdown, setAutoSaveCountdown] = useState(0);

  const canvasRef = useRef(null);
  const drawingRef = useRef(null);
  const fileInputRef = useRef(null);

  // AI Field Extraction Functions
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    console.log("File selected:", file);

    if (!file || !file.type.includes("pdf")) {
      setAiError("Please select a valid PDF file");
      return;
    }

    setIsProcessing(true);
    setCurrentStep("analyzing");
    setProgress(0);
    setAiError(null);

    try {
      // Step 1: Upload PDF and get AI analysis
      setProgress(20);
      console.log("Starting PDF upload...");

      const formData = new FormData();
      formData.append("pdf", file);

      console.log(
        "Sending request to:",
        "http://localhost:3000/api/ai-analyze-pdf"
      );

      const uploadResponse = await fetch(
        "http://localhost:3000/api/ai-analyze-pdf",
        {
          method: "POST",
          body: formData,
        }
      );

      console.log("Upload response status:", uploadResponse.status);
      console.log("Upload response ok:", uploadResponse.ok);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("Upload failed with response:", errorText);
        throw new Error(
          `Failed to upload PDF for analysis: ${uploadResponse.status} ${errorText}`
        );
      }

      const analysisData = await uploadResponse.json();
      console.log("Analysis data received:", analysisData);
      setProgress(60);

      // Step 2: Process AI suggestions
      setCurrentStep("mapping");
      const suggestions = processAISuggestions(analysisData.fields);
      console.log("Processed suggestions:", suggestions);
      setAiSuggestions(suggestions);
      setProgress(80);

      // Step 3: Auto-select high-confidence fields
      setCurrentStep("reviewing");
      const highConfidenceFields = suggestions.filter(
        (f) => f.confidence > 0.8
      );
      console.log("High confidence fields:", highConfidenceFields);
      setSelectedFields(highConfidenceFields.map((f) => f.id));
      setProgress(100);
    } catch (err) {
      console.error("Error in handleFileUpload:", err);
      setAiError(err.message);
      setCurrentStep("idle");
    } finally {
      setIsProcessing(false);
    }
  };

  const processAISuggestions = (aiFields) => {
    return aiFields.map((field, index) => ({
      id: `ai_field_${index + 1}`,
      label: field.label || `Field ${index + 1}`,
      page: field.page || 0,
      type: field.type || "text",
      rect: field.rect || [0, 0, 100, 20],
      fontSize: field.fontSize || 11,
      align: field.align || "left",
      shrink: field.shrink !== false,
      confidence: field.confidence || 0.5,
      aiReasoning: field.reasoning || "AI detected form field",
      originalId: field.originalId,
      // Add metadata for better coordinate handling
      originalRect: field.rect,
      width: field.rect ? field.rect[2] - field.rect[0] : 100,
      height: field.rect ? field.rect[3] - field.rect[1] : 20,
    }));
  };

  const handleFieldSelection = (fieldId, isSelected) => {
    if (isSelected) {
      setSelectedFields((prev) => [...prev, fieldId]);
    } else {
      setSelectedFields((prev) => prev.filter((id) => id !== fieldId));
    }
  };

  const handleApplyMapping = async () => {
    if (selectedFields.length === 0) {
      setAiError("Please select at least one field to apply");
      return;
    }

    try {
      // Instead of adding fields directly to overlay, just mark them as ready for dragging
      // The fields will remain in the tray for manual placement
      setCurrentStep("fields-ready");
      setAiError(null);

      // Show success message
      console.log(`${selectedFields.length} fields are now ready for dragging from the tray`);

      // Keep the selected fields in the tray - don't clear them yet
      // User will drag them individually to the PDF
    } catch (err) {
      setAiError(err.message);
    }
  };

  // Auto-placement function for AI-detected fields
  const handleAutoPlaceFields = async () => {
    if (selectedFields.length === 0) {
      setAiError("Please select at least one field to place automatically");
      return;
    }

    try {
      setCurrentStep("auto-placing");
      setAiError(null);

      // Get selected field data
      const fieldsToPlace = aiSuggestions.filter(field => selectedFields.includes(field.id));
      
      // Convert AI-detected coordinates to screen coordinates and add to overlay
      const newFields = fieldsToPlace.map(aiField => {
        // Convert AI coordinates (which are typically in document space) to screen space
        let screenRect;
        
        if (metrics) {
          // Use metrics to convert from document coordinates to screen coordinates
          const scaleX = metrics.pixelWidth / metrics.pointsWidth;
          const scaleY = metrics.pixelHeight / metrics.pointsHeight;
          
          screenRect = [
            aiField.rect[0] * scaleX,
            aiField.rect[1] * scaleY,
            aiField.rect[2] * scaleX,
            aiField.rect[3] * scaleY
          ];
        } else {
          // Fallback: use original coordinates as-is
          screenRect = [...aiField.rect];
        }

        // Ensure minimum field size
        const width = screenRect[2] - screenRect[0];
        const height = screenRect[3] - screenRect[1];
        if (width < 50) {
          screenRect[2] = screenRect[0] + 50;
        }
        if (height < 20) {
          screenRect[3] = screenRect[1] + 20;
        }

        return {
          id: `auto_${aiField.id}_${Date.now()}`,
          label: aiField.label || `Field ${overlay.fields.length + 1}`,
          page: aiField.page,
          type: aiField.type,
          rect: screenRect,
          fontSize: aiField.fontSize || 11,
          align: aiField.align || "left",
          shrink: aiField.shrink !== false,
          confidence: aiField.confidence,
          aiReasoning: aiField.aiReasoning,
          isAIPlaced: true, // Mark as AI-placed for UI styling
        };
      });

      // Add fields to overlay
      const newOverlay = {
        ...overlay,
        fields: [...overlay.fields, ...newFields],
      };

      setOverlay(newOverlay);
      setCurrentStep("auto-placed");
      scheduleAutoSave();

      // Clear selected fields since they've been placed
      setSelectedFields([]);

      console.log(`Successfully auto-placed ${newFields.length} fields`);
    } catch (err) {
      console.error('Auto-placement error:', err);
      setAiError(`Auto-placement failed: ${err.message}`);
      setCurrentStep("fields-ready");
    }
  };

  // Field Tray Drag and Drop Functions
  const handleFieldTrayDragStart = (e, field) => {
    e.dataTransfer.setData('application/json', JSON.stringify(field));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleCanvasDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleCanvasDragLeave = (e) => {
    // Only set to false if we're leaving the container entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleCanvasDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const fieldData = e.dataTransfer.getData('application/json');
    if (fieldData) {
      try {
        const field = JSON.parse(fieldData);
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Create a new field at the drop location
        const newField = {
          ...field,
          id: `${field.id}_${Date.now()}`,
          page: page,
          rect: [x - 50, y - 10, x + 50, y + 10], // Default size
        };

        const newOverlay = {
          ...overlay,
          fields: [...overlay.fields, newField],
        };

        setOverlay(newOverlay);
        setSelectedId(newField.id);
        scheduleAutoSave();
      } catch (err) {
        console.error('Error parsing dropped field:', err);
      }
    }
  };



  // Load template (convert saved points -> screen pixels)
  useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/apps/${normalizedApp}/forms/${normalizedForm}/template`);
      const tpl = await res.json();
      const fields = Array.isArray(tpl?.fields)
        ? tpl.fields.map((f) => ({ ...f, rect: rectPtToPx(f.rect) }))
        : [];
      setOverlay({ fields });
      setLastSaved(new Date());
      setUnsavedChanges(false);
    })();
  }, [normalizedApp, normalizedForm]);

  // Load metrics + preview for current page
  useEffect(() => {
    const q = (obj) => new URLSearchParams(obj).toString();
    async function load() {
      const m = await fetch(
        `${API}/apps/${normalizedApp}/forms/${normalizedForm}/page-metrics?${q({
          page,
          dpi: PREVIEW_DPI,
        })}`
      ).then((r) => r.json());
      setMetrics(m);
      setPages(m.pages || 1);

      const blob = await fetch(
        `${API}/apps/${normalizedApp}/forms/${normalizedForm}/preview-page?${q({
          page,
          dpi: PREVIEW_DPI,
        })}`
      ).then((r) => r.blob());
      setImgUrl(URL.createObjectURL(blob));
    }
    load();
    return () => setImgUrl(null);
  }, [normalizedApp, normalizedForm, page]);

  // Auto-save functionality with debouncing
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    setUnsavedChanges(true);
    setSaveStatus(SAVE_STATUS.UNSAVED);
    setAutoSaveCountdown(2);

    const timeout = setTimeout(() => {
      save();
    }, 2000); // Auto-save after 2 seconds of inactivity

    setAutoSaveTimeout(timeout);

    // Update countdown every second
    const countdownInterval = setInterval(() => {
      setAutoSaveCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [autoSaveTimeout]);

  // Cleanup auto-save timeout
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [autoSaveTimeout]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    const handlePopState = (e) => {
      if (unsavedChanges) {
        const confirmed = window.confirm('You have unsaved changes. Would you like to save before leaving?\n\nClick "OK" to save and leave, or "Cancel" to stay and continue editing.');
        if (confirmed) {
          // Save before leaving
          save().then(() => {
            navigate(-1);
          });
        } else {
          // Stay on the page
          navigate(-1);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [unsavedChanges, navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (unsavedChanges) {
          handleManualSave();
        }
      }
      // Escape to exit edit mode
      if (e.key === 'Escape' && editMode) {
        toggleEditMode();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [unsavedChanges, editMode]);

  // Draw background + boxes
  useEffect(() => {
    if (!imgUrl || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const c = canvasRef.current;
      const ctx = c.getContext("2d");
      c.width = img.width;
      c.height = img.height;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      ctx.lineWidth = 2;

      // existing fields on this page
      overlay.fields
        .filter((f) => Number(f.page || 0) === Number(page))
        .forEach((f) => {
          const [x0, y0, x1, y1] = f.rect;
          const isSelected = f.id === selectedId;
          const isAIField = f.id.startsWith("ai_field_");
          const isAIPlaced = f.isAIPlaced;
          const isAutoField = f.id.startsWith("auto_");

          // Different colors for different field types
          if (isSelected) {
            ctx.strokeStyle = "#e00"; // Red for selected
            ctx.lineWidth = 3;
          } else if (isAIPlaced || isAutoField) {
            ctx.strokeStyle = "#9333ea"; // Purple for AI auto-placed fields
            ctx.lineWidth = 2;
          } else if (isAIField) {
            ctx.strokeStyle = "#00a"; // Blue for AI fields (in tray)
            ctx.lineWidth = 2;
          } else {
            ctx.strokeStyle = "#0a0"; // Green for manual fields
            ctx.lineWidth = 2;
          }

          ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);

          // Draw resize handles in edit mode
          if (editMode && isSelected) {
            const handleSize = 8;
            ctx.fillStyle = "#e00";

            // Corner handles (larger for easier interaction)
            ctx.fillRect(
              x0 - handleSize / 2,
              y0 - handleSize / 2,
              handleSize,
              handleSize
            );
            ctx.fillRect(
              x1 - handleSize / 2,
              y0 - handleSize / 2,
              handleSize,
              handleSize
            );
            ctx.fillRect(
              x0 - handleSize / 2,
              y1 - handleSize / 2,
              handleSize,
              handleSize
            );
            ctx.fillRect(
              x1 - handleSize / 2,
              y1 - handleSize / 2,
              handleSize,
              handleSize
            );

            // Edge handles (for easier resizing)
            ctx.fillRect(
              (x0 + x1) / 2 - handleSize / 2,
              y0 - handleSize / 2,
              handleSize,
              handleSize
            );
            ctx.fillRect(
              (x0 + x1) / 2 - handleSize / 2,
              y1 - handleSize / 2,
              handleSize,
              handleSize
            );
            ctx.fillRect(
              x0 - handleSize / 2,
              (y0 + y1) / 2 - handleSize / 2,
              handleSize,
              handleSize
            );
            ctx.fillRect(
              x1 - handleSize / 2,
              (y0 + y1) / 2 - handleSize / 2,
              handleSize,
              handleSize
            );

            // Draw field dimensions for better editing
            const width = x1 - x0;
            const height = y1 - y0;
            ctx.fillStyle = "#000";
            ctx.font = "10px Arial";
            ctx.fillText(
              `${Math.round(width)}×${Math.round(height)}`,
              x0,
              y1 + 15
            );
          }

          // Draw field label
          if (isSelected || editMode) {
            ctx.fillStyle = "#000";
            ctx.font = "12px Arial";
            ctx.fillText(f.label || f.id, x0, y0 - 5);
          }
        });

      // current drawing
      const d = drawingRef.current;
      if (d) {
        ctx.strokeStyle = "#e00";
        ctx.strokeRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0);
      }
    };
    img.src = imgUrl;
  }, [imgUrl, overlay, page, selectedId, editMode]);

  // Enhanced save function with better error handling and status management
  async function save() {
    if (saveStatus === SAVE_STATUS.SAVING) return; // Prevent multiple simultaneous saves

    setSaveStatus(SAVE_STATUS.SAVING);
    setSaveError(null);

    try {
      // Persist a copy converted to POINTS
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

      if (!r.ok) {
        const errorText = await r.text();
        throw new Error(`Save failed: ${r.status} ${errorText}`);
      }

      setSaveStatus(SAVE_STATUS.SAVED);
      setLastSaved(new Date());
      setUnsavedChanges(false);

      // Clear any pending auto-save
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
        setAutoSaveTimeout(null);
      }

      // Show success notification briefly
      setTimeout(() => {
        if (saveStatus === SAVE_STATUS.SAVED) {
          setSaveStatus(SAVE_STATUS.SAVED);
        }
      }, 2000);

    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus(SAVE_STATUS.ERROR);
      setSaveError(error.message);

      // Show error notification
      setTimeout(() => {
        setSaveStatus(SAVE_STATUS.UNSAVED);
      }, 3000);
    }
  }

  // Manual save function (for user-triggered saves)
  const handleManualSave = async () => {
    await save();
  };

  // Enhanced update function that triggers auto-save
  function updateSelected(patch) {
    setOverlay((o) => {
      const i = o.fields.findIndex((f) => f.id === selectedId);
      if (i === -1) return o;
      const next = { ...o.fields[i], ...patch };
      const fields = o.fields.slice();
      fields[i] = next;
      return { ...o, fields };
    });

    if (Object.prototype.hasOwnProperty.call(patch, "id")) {
      setSelectedId(patch.id || selectedId);
    }

    // Schedule auto-save for field updates
    scheduleAutoSave();
  }

  // Enhanced delete function that triggers auto-save
  function delSelected() {
    if (!selectedId) return;
    setOverlay((o) => ({
      ...o,
      fields: o.fields.filter((f) => f.id !== selectedId),
    }));
    setSelectedId(null);

    // Schedule auto-save for field deletion
    scheduleAutoSave();
  }

  // Enhanced field creation that triggers auto-save
  const onUp = () => {
    if (editMode) {
      // Clear drag/resize state
      setDraggedField(null);
      setResizeHandle(null);
      return;
    }

    const d = drawingRef.current;
    if (!d) return;
    drawingRef.current = null;
    const rect = [
      Math.min(d.x0, d.x1),
      Math.min(d.y0, d.y1),
      Math.max(d.x0, d.x1),
      Math.max(d.y0, d.y1),
    ];
    const id = `f_${overlay.fields.length + 1}`;
    const field = {
      id,
      label: id,
      page,
      type: "text",
      rect, // keep in px in UI; convert on save
      fontSize: 11,
      align: "left",
      shrink: true,
    };
    setOverlay((o) => ({ ...o, fields: [...o.fields, field] }));
    setSelectedId(id);

    // Schedule auto-save for new field creation
    scheduleAutoSave();
  };

  // Enhanced overlay update that triggers auto-save
  const handleOverlayUpdate = (newOverlay) => {
    setOverlay(newOverlay);
    scheduleAutoSave();
  };

  // Field reordering functions
  const toggleReorderMode = () => {
    setReorderMode(!reorderMode);
    if (reorderMode) {
      setDraggedFieldId(null);
      setDragOverFieldId(null);
    } else {
      // Initialize field order when entering reorder mode
      const currentOrder = overlay.fields
        .filter(f => f.page === page)
        .map(f => f.id);
      setFieldOrder(currentOrder);
    }
  };

  const handleFieldDragStart = (e, fieldId) => {
    if (!reorderMode) return;
    setDraggedFieldId(fieldId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', fieldId);
  };

  const handleFieldDragOver = (e, fieldId) => {
    if (!reorderMode || draggedFieldId === fieldId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFieldId(fieldId);
  };

  const handleFieldDrop = (e, targetFieldId) => {
    if (!reorderMode || !draggedFieldId || draggedFieldId === targetFieldId) return;
    e.preventDefault();

    const draggedField = overlay.fields.find(f => f.id === draggedFieldId);
    const targetField = overlay.fields.find(f => f.id === targetFieldId);

    if (!draggedField || !targetField) return;

    // Reorder fields on the current page
    const pageFields = overlay.fields.filter(f => f.page === page);
    const draggedIndex = pageFields.findIndex(f => f.id === draggedFieldId);
    const targetIndex = pageFields.findIndex(f => f.id === targetFieldId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create new field order
    const newPageFields = [...pageFields];
    const [removed] = newPageFields.splice(draggedIndex, 1);
    newPageFields.splice(targetIndex, 0, removed);

    // Update overlay with new order
    const otherFields = overlay.fields.filter(f => f.page !== page);
    const newOverlay = {
      ...overlay,
      fields: [...otherFields, ...newPageFields]
    };

    setOverlay(newOverlay);
    setFieldOrder(newPageFields.map(f => f.id));
    scheduleAutoSave();

    setDraggedFieldId(null);
    setDragOverFieldId(null);
  };

  const handleFieldDragEnd = () => {
    setDraggedFieldId(null);
    setDragOverFieldId(null);
  };

  const insertFieldAtPosition = (position, newField) => {
    const pageFields = overlay.fields.filter(f => f.page === page);
    const otherFields = overlay.fields.filter(f => f.page !== page);

    // Insert field at specific position
    const newPageFields = [...pageFields];
    newPageFields.splice(position, 0, newField);

    const newOverlay = {
      ...overlay,
      fields: [...otherFields, ...newPageFields]
    };

    setOverlay(newOverlay);
    scheduleAutoSave();
  };

  const moveFieldToPosition = (fieldId, newPosition) => {
    const pageFields = overlay.fields.filter(f => f.page === page);
    const otherFields = overlay.fields.filter(f => f.page !== page);

    const fieldIndex = pageFields.findIndex(f => f.id === fieldId);
    if (fieldIndex === -1) return;

    const [movedField] = pageFields.splice(fieldIndex, 1);
    pageFields.splice(newPosition, 0, movedField);

    const newOverlay = {
      ...overlay,
      fields: [...otherFields, ...pageFields]
    };

    setOverlay(newOverlay);
    scheduleAutoSave();
  };

  // Debug function to log current field order
  const logFieldOrder = () => {
    console.log("=== Current Field Order ===");
    overlay.fields
      .filter(f => f.page === page)
      .forEach((field, index) => {
        console.log(`${index + 1}: ${field.label || field.id} (${field.id})`);
      });
    console.log("==========================");
  };

  const selected = useMemo(
    () => overlay.fields.find((f) => f.id === selectedId) || null,
    [overlay, selectedId]
  );

  // New: Toggle edit mode
  const toggleEditMode = () => {
    setEditMode(!editMode);
    if (editMode) {
      setDraggedField(null);
      setResizeHandle(null);
    }
  };

  // New: Get field statistics
  const fieldStats = useMemo(() => {
    const pageFields = overlay.fields.filter((f) => f.page === page);
    const aiFields = pageFields.filter((f) => f.id.startsWith("ai_field_"));
    const autoPlacedFields = pageFields.filter((f) => f.isAIPlaced || f.id.startsWith("auto_"));
    const manualFields = pageFields.filter(
      (f) => !f.id.startsWith("ai_field_") && !f.isAIPlaced && !f.id.startsWith("auto_")
    );

    return {
      total: pageFields.length,
      ai: aiFields.length,
      autoPlaced: autoPlacedFields.length,
      manual: manualFields.length,
    };
  }, [overlay, page]);

  // Save status indicator component
  const SaveStatusIndicator = () => {
    const getStatusStyle = () => {
      switch (saveStatus) {
        case SAVE_STATUS.SAVED:
          return { color: '#059669' };
        case SAVE_STATUS.SAVING:
          return { color: '#2563eb' };
        case SAVE_STATUS.UNSAVED:
          return { color: '#d97706' };
        case SAVE_STATUS.ERROR:
          return { color: '#dc2626' };
        default:
          return { color: '#6b7280' };
      }
    };

    const getStatusIcon = () => {
      switch (saveStatus) {
        case SAVE_STATUS.SAVED:
          return '✓';
        case SAVE_STATUS.SAVING:
          return '⏳';
        case SAVE_STATUS.UNSAVED:
          return '●';
        case SAVE_STATUS.ERROR:
          return '⚠';
        default:
          return '○';
      }
    };

    const getStatusText = () => {
      switch (saveStatus) {
        case SAVE_STATUS.SAVED:
          return lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Saved';
        case SAVE_STATUS.SAVING:
          return 'Saving...';
        case SAVE_STATUS.UNSAVED:
          return 'Unsaved changes';
        case SAVE_STATUS.ERROR:
          return 'Save failed';
        default:
          return 'Unknown';
      }
    };

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        ...getStatusStyle()
      }}>
        <span style={{ fontSize: '18px' }}>{getStatusIcon()}</span>
        <span>{getStatusText()}</span>
        {saveError && (
          <button
            onClick={() => setSaveError(null)}
            style={{
              fontSize: '12px',
              textDecoration: 'underline',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit'
            }}
            onMouseEnter={(e) => e.target.style.textDecoration = 'none'}
            onMouseLeave={(e) => e.target.style.textDecoration = 'underline'}
            title="Dismiss error"
          >
            Dismiss
          </button>
        )}
      </div>
    );
  };

  // Save button component with enhanced styling
  const SaveButton = ({ onClick, children, variant = 'primary', disabled = false }) => {
    const getButtonStyle = () => {
      const baseStyle = {
        padding: '8px 16px',
        borderRadius: '6px',
        fontWeight: '600',
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: 'none',
        fontSize: '14px',
        transition: 'all 0.2s ease'
      };

      switch (variant) {
        case 'primary':
          return {
            ...baseStyle,
            backgroundColor: disabled ? '#9ca3af' : '#3b82f6',
            color: 'white',
            boxShadow: disabled ? 'none' : '0 2px 4px rgba(59, 130, 246, 0.3)'
          };
        case 'secondary':
          return {
            ...baseStyle,
            backgroundColor: disabled ? '#9ca3af' : '#6b7280',
            color: 'white'
          };
        case 'success':
          return {
            ...baseStyle,
            backgroundColor: disabled ? '#9ca3af' : '#10b981',
            color: 'white',
            boxShadow: disabled ? 'none' : '0 2px 4px rgba(16, 185, 129, 0.3)'
          };
        case 'danger':
          return {
            ...baseStyle,
            backgroundColor: disabled ? '#9ca3af' : '#ef4444',
            color: 'white'
          };
        default:
          return baseStyle;
      }
    };

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        style={getButtonStyle()}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.target.style.transform = 'translateY(-1px)';
            e.target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = variant === 'primary' || variant === 'success'
              ? '0 2px 4px rgba(59, 130, 246, 0.3)'
              : 'none';
          }
        }}
      >
        {children}
      </button>
    );
  };

  const onPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top),
    };
  };

  // Handle mouse down for field selection, resizing, and manual creation
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (editMode) {
      // In edit mode, handle field selection and resizing
      const clickedField = overlay.fields
        .filter((f) => Number(f.page || 0) === Number(page))
        .find((f) => {
          const [x0, y0, x1, y1] = f.rect;
          return x >= x0 && x <= x1 && y >= y0 && y <= y1;
        });

      if (clickedField) {
        setSelectedId(clickedField.id);

        // Check if clicking on resize handle
        const handleSize = 8;
        const [x0, y0, x1, y1] = clickedField.rect;

        // Check corner handles
        if (
          Math.abs(x - x0) <= handleSize / 2 &&
          Math.abs(y - y0) <= handleSize / 2
        ) {
          setResizeHandle("top-left");
        } else if (
          Math.abs(x - x1) <= handleSize / 2 &&
          Math.abs(y - y0) <= handleSize / 2
        ) {
          setResizeHandle("top-right");
        } else if (
          Math.abs(x - x0) <= handleSize / 2 &&
          Math.abs(y - y1) <= handleSize / 2
        ) {
          setResizeHandle("bottom-left");
        } else if (
          Math.abs(x - x1) <= handleSize / 2 &&
          Math.abs(y - y1) <= handleSize / 2
        ) {
          setResizeHandle("bottom-right");
        } else {
          setResizeHandle(null);
        }

        setDraggedField(clickedField);
        return;
      }
    }

    // Check if clicking on existing field (for selection)
    const hit = overlay.fields.find(
      (f) =>
        f.page === page &&
        x >= f.rect[0] &&
        x <= f.rect[2] &&
        y >= f.rect[1] &&
        y <= f.rect[3]
    );

    if (hit) {
      setSelectedId(hit.id);
      drawingRef.current = null;
      return;
    }

    // Start drawing new field or clear selection
    setSelectedId(null);
    if (!editMode) {
      drawingRef.current = { x0: x, y0: y, x1: x, y1: y };
    }
  };

  // Handle mouse move for field dragging, resizing, and manual drawing
  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (editMode && draggedField && selectedId) {
      // Handle field dragging and resizing
      if (resizeHandle) {
        // Resize the field
        const fieldIndex = overlay.fields.findIndex((f) => f.id === selectedId);
        if (fieldIndex !== -1) {
          const newFields = [...overlay.fields];
          const [x0, y0, x1, y1] = newFields[fieldIndex].rect;

          switch (resizeHandle) {
            case "top-left":
              newFields[fieldIndex].rect = [x, y, x1, y1];
              break;
            case "top-right":
              newFields[fieldIndex].rect = [x0, y, x, y1];
              break;
            case "bottom-left":
              newFields[fieldIndex].rect = [x, y0, x1, y];
              break;
            case "bottom-right":
              newFields[fieldIndex].rect = [x0, y0, x, y];
              break;
          }

          // Ensure minimum size
          const [nx0, ny0, nx1, ny1] = newFields[fieldIndex].rect;
          if (nx1 - nx0 < 20) {
            newFields[fieldIndex].rect[2] = nx0 + 20;
          }
          if (ny1 - ny0 < 15) {
            newFields[fieldIndex].rect[3] = ny0 + 15;
          }

          setOverlay({ ...overlay, fields: newFields });
          // Schedule auto-save for field resizing
          scheduleAutoSave();
        }
      } else {
        // Move the field
        const fieldIndex = overlay.fields.findIndex((f) => f.id === selectedId);
        if (fieldIndex !== -1) {
          const newFields = [...overlay.fields];
          const [x0, y0, x1, y1] = newFields[fieldIndex].rect;
          const width = x1 - x0;
          const height = y1 - y0;

          newFields[fieldIndex].rect = [
            x - width / 2,
            y - height / 2,
            x + width / 2,
            y + height / 2,
          ];
          setOverlay({ ...overlay, fields: newFields });
          // Schedule auto-save for field movement
          scheduleAutoSave();
        }
      }
      return;
    }

    // Handle manual field drawing
    if (!editMode && drawingRef.current) {
      drawingRef.current = { ...drawingRef.current, x1: x, y1: y };
      if (imgUrl) setImgUrl((prev) => prev); // trigger redraw
    }
  };

  // Handle mouse up to stop dragging/resizing and complete field creation
  const handleMouseUp = () => {
    if (editMode) {
      // Stop editing operations
      setDraggedField(null);
      setResizeHandle(null);
    } else if (drawingRef.current) {
      // Complete manual field creation
      const d = drawingRef.current;
      if (Math.abs(d.x1 - d.x0) > 10 && Math.abs(d.y1 - d.y0) > 10) {
        const newField = {
          id: `field_${Date.now()}`,
          label: `Field ${overlay.fields.length + 1}`,
          page: page,
          type: "text",
          rect: [d.x0, d.y0, d.x1, d.y1],
          fontSize: 11,
          align: "left",
          shrink: true,
        };

        setOverlay({
          ...overlay,
          fields: [...overlay.fields, newField],
        });
        setSelectedId(newField.id);
        // Schedule auto-save for new field creation
        scheduleAutoSave();
      }
      drawingRef.current = null;
    }
  };

  // Helper function to convert PDF coordinates to screen coordinates
  const convertPDFToScreen = (pdfRect) => {
    if (!metrics) return pdfRect;

    // Convert from PDF points to screen pixels
    const scaleX = metrics.pixelWidth / metrics.pointsWidth;
    const scaleY = metrics.pixelHeight / metrics.pointsHeight;

    return [
      pdfRect[0] * scaleX,
      pdfRect[1] * scaleY,
      pdfRect[2] * scaleX,
      pdfRect[3] * scaleY,
    ];
  };

  // Helper function to convert screen coordinates back to PDF coordinates
  const convertScreenToPDF = (screenRect) => {
    if (!metrics) return screenRect;

    // Convert from screen pixels back to PDF points
    const scaleX = metrics.pointsWidth / metrics.pixelWidth;
    const scaleY = metrics.pointsHeight / metrics.pixelHeight;

    return [
      screenRect[0] * scaleX,
      screenRect[1] * scaleY,
      screenRect[2] * scaleX,
      screenRect[3] * scaleY,
    ];
  };

  return (
    <div>
      {/* Admin Dashboard Navigation */}
      <div style={{
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontWeight: '600', color: '#475569' }}>
          🤖 AI Field Mapping Tool
        </div>
        <Link
          to="/admin"
          style={{
            background: '#3b82f6',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '500',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          ← Back to Admin Dashboard
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px 280px",
          gap: 12,
          padding: 12,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 8,
              flexWrap: "wrap",
            }}
          >
            <strong>Mapper</strong>
            <code>
              {app}/{form}
            </code>

            {/* Save Status and Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginLeft: '16px'
            }}>
              <SaveStatusIndicator />

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <SaveButton
                  onClick={handleManualSave}
                  disabled={saveStatus === SAVE_STATUS.SAVING || !unsavedChanges}
                  variant={unsavedChanges ? 'primary' : 'secondary'}
                  title={unsavedChanges ? "Save all changes (Ctrl+S)" : "No changes to save"}
                >
                  {saveStatus === SAVE_STATUS.SAVING ? '⏳ Saving...' :
                    unsavedChanges ? '💾 Save Application' : '✓ Saved'}
                </SaveButton>

                {unsavedChanges && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: '#d97706',
                    backgroundColor: '#fef3c7',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #f59e0b'
                  }}>
                    <span>
                      {autoSaveCountdown > 0 ? `Auto-saving in ${autoSaveCountdown}s...` : 'Changes pending'}
                    </span>
                    {autoSaveCountdown > 0 && (
                      <div style={{
                        width: '40px',
                        height: '4px',
                        backgroundColor: '#f59e0b',
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${(autoSaveCountdown / 2) * 100}%`,
                          height: '100%',
                          backgroundColor: '#10b981',
                          transition: 'width 1s linear'
                        }} />
                      </div>
                    )}
                  </div>
                )}

                {/* Quick save button for immediate save */}
                {unsavedChanges && (
                  <button
                    onClick={handleManualSave}
                    disabled={saveStatus === SAVE_STATUS.SAVING}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: saveStatus === SAVE_STATUS.SAVING ? 'not-allowed' : 'pointer',
                      opacity: saveStatus === SAVE_STATUS.SAVING ? 0.6 : 1
                    }}
                    title="Save immediately (bypass auto-save)"
                  >
                    Save Now
                  </button>
                )}
              </div>
            </div>


            <button
              onClick={toggleEditMode}
              style={{
                background: editMode ? "#dc2626" : "#3b82f6",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                fontWeight: "600",
                cursor: "pointer",
                marginLeft: "8px",
              }}
            >
              {editMode ? "✋ Exit Edit Mode" : "✏️ Edit Fields"}
            </button>

            <button
              onClick={toggleReorderMode}
              style={{
                background: reorderMode ? "#dc2626" : "#8b5cf6",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                fontWeight: "600",
                cursor: "pointer",
                marginLeft: "8px",
              }}
            >
              {reorderMode ? "✋ Exit Reorder Mode" : "🔄 Reorder Fields"}
            </button>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              <button
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ◀ Prev
              </button>
              <div>
                Page {page + 1} / {pages}
              </div>
              <button
                disabled={page >= pages - 1}
                onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              >
                Next ▶
              </button>
            </div>
          </div>

          {/* Save Help Section */}
          {!unsavedChanges && (
            <div style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>💡</span>
                <div>
                  <div style={{ fontWeight: '600', color: '#1e40af' }}>Save System</div>
                  <div style={{ fontSize: '14px', color: '#1d4ed8' }}>
                    • <strong>Auto-save:</strong> Changes are automatically saved after 2 seconds of inactivity
                    • <strong>Manual save:</strong> Click "Save Application" or use <kbd style={{ backgroundColor: '#e5e7eb', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>Ctrl+S</kbd>
                    • <strong>Field save:</strong> Individual field changes are saved automatically
                    • <strong>Escape:</strong> Press <kbd style={{ backgroundColor: '#e5e7eb', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>Esc</kbd> to exit edit mode
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Summary when changes are pending */}
          {unsavedChanges && (
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: '600', color: '#92400e' }}>Unsaved Changes</div>
                  <div style={{ fontSize: '14px', color: '#92400e' }}>
                    You have unsaved changes that will be automatically saved in {autoSaveCountdown > 0 ? `${autoSaveCountdown} seconds` : '2 seconds'}.
                    <br />
                    <strong>Tip:</strong> Use "Save Now" for immediate save or "Save Application" to save all changes at once.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Error Display */}
          {saveError && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', color: '#dc2626' }}>⚠</span>
                <div>
                  <div style={{ fontWeight: '600', color: '#991b1b' }}>Save Error</div>
                  <div style={{ fontSize: '14px', color: '#dc2626' }}>{saveError}</div>
                </div>
                <button
                  onClick={() => setSaveError(null)}
                  style={{
                    marginLeft: 'auto',
                    color: '#f87171',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '4px'
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#dc2626'}
                  onMouseLeave={(e) => e.target.style.color = '#f87171'}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Edit Mode Instructions */}
          {editMode && (
            <div
              style={{
                background: "#fef3c7",
                border: "1px solid #f59e0b",
                borderRadius: "6px",
                padding: "8px 12px",
                marginBottom: "8px",
                fontSize: "14px",
              }}
            >
              <strong>✏️ Edit Mode Active:</strong>
              {editMode && draggedField
                ? " Drag fields to reposition"
                : editMode && resizeHandle
                  ? " Resize field by dragging handles"
                  : " Click and drag fields to move, drag handles to resize"}
            </div>
          )}

          {/* Reorder Mode Instructions */}
          {reorderMode && (
            <div
              style={{
                background: "#f0f9ff",
                border: "1px solid #0ea5e9",
                borderRadius: "6px",
                padding: "8px 12px",
                marginBottom: "8px",
                fontSize: "14px",
              }}
            >
              <strong>🔄 Reorder Mode Active:</strong>
              Drag and drop fields to reorder them. The order will be preserved when users fill out the form.
            </div>
          )}

          <div
            style={{
              border: unsavedChanges ? "2px solid #f59e0b" : "1px solid #ccc",
              maxHeight: "70vh",
              overflow: "auto",
              backgroundColor: unsavedChanges ? "#fef3c7" : "#f9f9f9",
              transition: "all 0.2s ease",
              position: "relative"
            }}
            onDragOver={handleCanvasDragOver}
            onDragLeave={handleCanvasDragLeave}
            onDrop={handleCanvasDrop}
          >
            {unsavedChanges && (
              <div style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                backgroundColor: "#f59e0b",
                color: "white",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "600",
                zIndex: 10
              }}>
                ⚠ Unsaved Changes
              </div>
            )}

            {reorderMode && (
              <div style={{
                position: "absolute",
                top: "8px",
                left: "8px",
                backgroundColor: "#8b5cf6",
                color: "white",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "600",
                zIndex: 10
              }}>
                🔄 Reorder Mode
              </div>
            )}

            {/* Drag Over Indicator */}
            {isDragOver && (
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                backgroundColor: "rgba(59, 130, 246, 0.9)",
                color: "white",
                padding: "16px 24px",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                zIndex: 20,
                pointerEvents: "none",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)"
              }}>
                📝 Drop field here
              </div>
            )}
            <canvas
              ref={canvasRef}
              style={{
                cursor: editMode ? "move" : "crosshair",
                display: "block",
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            />
          </div>
        </div>

        {/* Field Tray */}
        <div style={{
          border: unsavedChanges ? "2px solid #f59e0b" : "1px solid #eee",
          padding: 10,
          borderRadius: 8,
          backgroundColor: unsavedChanges ? '#fef3c7' : 'white',
          transition: 'all 0.2s ease',
          maxHeight: '70vh',
          overflow: 'auto'
        }}>
          <div style={{
            fontWeight: 700,
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🤖 AI Field Tray
            {unsavedChanges && (
              <span style={{
                fontSize: '12px',
                color: '#d97706',
                backgroundColor: '#fef3c7',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #f59e0b'
              }}>
                ⚠ Changes pending
              </span>
            )}
          </div>

          {/* AI Field Upload Section */}
          {!isProcessing && currentStep === "idle" && (
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  border: "2px dashed #d1d5db",
                  borderRadius: "8px",
                  padding: "16px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: "#f9fafb",
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>📄</div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "#374151" }}>
                  Click to upload PDF
                </div>
                <div style={{ fontSize: "10px", color: "#6b7280" }}>
                  or drag and drop
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </div>
          )}

          {/* AI Processing Progress */}
          {isProcessing && (
            <div style={{ marginBottom: '16px', textAlign: 'center' }}>
              <div style={{
                width: '100%',
                height: '8px',
                background: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '8px'
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>
                {currentStep === "analyzing" && "AI analyzing PDF structure..."}
                {currentStep === "mapping" && "Mapping detected fields..."}
                {currentStep === "reviewing" && "Review AI suggestions..."}
              </div>
            </div>
          )}

          {/* AI Error Display */}
          {aiError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '8px',
              borderRadius: '6px',
              marginBottom: '12px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              {aiError}
            </div>
          )}

          {/* AI Success Display */}
          {currentStep === "fields-ready" && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              padding: '8px',
              borderRadius: '6px',
              marginBottom: '12px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ fontSize: '16px' }}>✅</span>
              {selectedFields.length} fields are ready! Drag them from the tray to the PDF where you want them positioned.
            </div>
          )}

          {/* Auto-Placement Success Display */}
          {currentStep === "auto-placed" && (
            <div style={{
              background: '#faf5ff',
              border: '1px solid #d8b4fe',
              color: '#7c2d12',
              padding: '8px',
              borderRadius: '6px',
              marginBottom: '12px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ fontSize: '16px' }}>🪄</span>
              Fields have been automatically placed on the PDF! Review and adjust positions as needed.
            </div>
          )}

          {/* Auto-Placement Progress */}
          {currentStep === "auto-placing" && (
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1e40af',
              padding: '8px',
              borderRadius: '6px',
              marginBottom: '12px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ fontSize: '16px' }}>⏳</span>
              Auto-placing fields on PDF...
            </div>
          )}

          {/* AI Field Suggestions */}
          {currentStep === "reviewing" && aiSuggestions.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                AI Field Suggestions
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {aiSuggestions.map((field) => (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={(e) => handleFieldTrayDragStart(e, field)}
                    style={{
                      border: selectedFields.includes(field.id) ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                      borderRadius: "6px",
                      padding: "8px",
                      transition: "all 0.2s ease",
                      background: selectedFields.includes(field.id) ? "#eff6ff" : "white",
                      cursor: "grab",
                      fontSize: '12px'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
                    onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field.id)}
                        onChange={(e) => handleFieldSelection(field.id, e.target.checked)}
                        style={{ width: '14px', height: '14px' }}
                      />
                      <span style={{ fontWeight: '600', color: '#1f2937', flex: 1 }}>
                        {field.label}
                      </span>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '8px',
                        fontSize: '10px',
                        fontWeight: '600',
                        color: 'white',
                        background: field.confidence > 0.8 ? '#10b981' : field.confidence > 0.6 ? '#f59e0b' : '#ef4444'
                      }}>
                        {Math.round(field.confidence * 100)}%
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>
                      <div>Type: {field.type}</div>
                      <div>Page: {field.page + 1}</div>
                      <div>Size: {Math.round(field.width)}×{Math.round(field.height)} px</div>
                    </div>
                  </div>
                ))}
              </div>

              {aiSuggestions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  <button
                    onClick={handleApplyMapping}
                    disabled={selectedFields.length === 0}
                    style={{
                      background: selectedFields.length > 0 ? '#10b981' : '#9ca3af',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: selectedFields.length > 0 ? 'pointer' : 'not-allowed',
                      fontSize: '12px',
                      width: '100%'
                    }}
                  >
                    {currentStep === "fields-ready"
                      ? `✓ ${selectedFields.length} Fields Ready for Dragging`
                      : `Prepare ${selectedFields.length} Fields for Dragging`
                    }
                  </button>

                  <button
                    onClick={handleAutoPlaceFields}
                    disabled={selectedFields.length === 0 || currentStep === "auto-placing"}
                    style={{
                      background: selectedFields.length > 0 && currentStep !== "auto-placing" ? '#9333ea' : '#9ca3af',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: selectedFields.length > 0 && currentStep !== "auto-placing" ? 'pointer' : 'not-allowed',
                      fontSize: '12px',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                    title="Automatically place fields on PDF using AI-detected positions"
                  >
                    {currentStep === "auto-placing" ? (
                      <>⏳ Placing Fields...</>
                    ) : (
                      <>🪄 Place Fields for Me ({selectedFields.length})</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div style={{
            fontSize: '11px',
            color: '#6b7280',
            lineHeight: '1.4',
            marginTop: '16px',
            padding: '8px',
            background: '#f3f4f6',
            borderRadius: '4px'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>How to use:</div>
            <div>1. 📄 Upload a PDF to extract fields</div>
            <div>2. ✅ Select fields you want to use</div>
            <div><strong>Option A (Manual):</strong></div>
            <div>3a. 🔄 Click "Prepare Fields for Dragging"</div>
            <div>4a. 🖱️ Drag fields from tray to PDF</div>
            <div>5a. 📍 Position fields exactly where needed</div>
            <div><strong>Option B (Auto):</strong></div>
            <div>3b. 🪄 Click "Place Fields for Me"</div>
            <div>4b. 🔧 Review and adjust AI-placed positions</div>
          </div>

          {/* Field Count */}
          {overlay.fields.length > 0 && (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#1e40af' }}>
                Total Fields: {overlay.fields.length}
              </div>
              <div style={{ fontSize: '10px', color: '#3b82f6' }}>
                {overlay.fields.filter(f => f.id.startsWith('ai_field_')).length} AI detected · {overlay.fields.filter(f => f.isAIPlaced || f.id.startsWith('auto_')).length} auto-placed
              </div>
            </div>
          )}
        </div>

        {/* Editor */}
        <div style={{
          border: unsavedChanges ? "2px solid #f59e0b" : "1px solid #eee",
          padding: 10,
          borderRadius: 8,
          backgroundColor: unsavedChanges ? '#fef3c7' : 'white',
          transition: 'all 0.2s ease'
        }}>
          <div style={{
            fontWeight: 700,
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            Field
            {unsavedChanges && (
              <span style={{
                fontSize: '12px',
                color: '#d97706',
                backgroundColor: '#fef3c7',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #f59e0b'
              }}>
                ⚠ Changes pending
              </span>
            )}
          </div>
          {!selected && <div style={{ color: "#666" }}>Click a box to edit</div>}
          {selected && (
            <div style={{ display: "grid", gap: 8 }}>
              <label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ID
                  {unsavedChanges && (
                    <span style={{ fontSize: '10px', color: '#d97706' }}>●</span>
                  )}
                </div>
                <input
                  value={selected.id}
                  onChange={(e) => updateSelected({ id: e.target.value })}
                  style={{
                    border: unsavedChanges ? '1px solid #f59e0b' : '1px solid #d1d5db',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    width: '100%'
                  }}
                />
              </label>
              <label>
                <div>Label</div>
                <input
                  value={selected.label || ""}
                  onChange={(e) => updateSelected({ label: e.target.value })}
                />
              </label>
              <label>
                <div>Type</div>
                <select
                  value={selected.type || "text"}
                  onChange={(e) => updateSelected({ type: e.target.value })}
                >
                  <option value="text">text</option>
                  <option value="checkbox">checkbox</option>
                  <option value="signature">signature</option>
                </select>
              </label>
              <label>
                <div>Font Size</div>
                <input
                  type="number"
                  value={selected.fontSize || 11}
                  onChange={(e) =>
                    updateSelected({ fontSize: Number(e.target.value || 11) })
                  }
                />
              </label>
              <label>
                <div>Align</div>
                <select
                  value={selected.align || "left"}
                  onChange={(e) => updateSelected({ align: e.target.value })}
                >
                  <option>left</option>
                  <option>center</option>
                  <option>right</option>
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={!!selected.shrink}
                  onChange={(e) => updateSelected({ shrink: e.target.checked })}
                />
                <span style={{ marginLeft: 6 }}>Shrink to fit</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={!!selected.uppercase}
                  onChange={(e) =>
                    updateSelected({ uppercase: e.target.checked })
                  }
                />
                <span style={{ marginLeft: 6 }}>Uppercase</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={!!selected.bg}
                  onChange={(e) => updateSelected({ bg: e.target.checked })}
                />
                <span style={{ marginLeft: 6 }}>White-out BG</span>
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={delSelected}
                  style={{
                    color: "#dc2626",
                    background: 'none',
                    border: '1px solid #dc2626',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#dc2626';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#dc2626';
                  }}
                >
                  Delete
                </button>
                <SaveButton
                  onClick={() => updateSelected({})}
                  variant="success"
                  disabled={saveStatus === SAVE_STATUS.SAVING}
                  title="Save field changes (auto-saves in 2s)"
                >
                  {saveStatus === SAVE_STATUS.SAVING ? '⏳ Saving...' : '💾 Save Field'}
                </SaveButton>
              </div>
            </div>
          )}
          <hr style={{ margin: "12px 0" }} />

          {/* Field Order Management */}
          {reorderMode && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ marginBottom: "8px" }}>
                <strong>Field Order (Page {page + 1}):</strong>
              </div>
              <div style={{
                fontSize: "12px",
                color: "#666",
                maxHeight: "200px",
                overflowY: "auto",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                padding: "8px"
              }}>
                {overlay.fields
                  .filter(f => f.page === page)
                  .map((field, index) => (
                    <div
                      key={field.id}
                      draggable={reorderMode}
                      onDragStart={(e) => handleFieldDragStart(e, field.id)}
                      onDragOver={(e) => handleFieldDragOver(e, field.id)}
                      onDrop={(e) => handleFieldDrop(e, field.id)}
                      onDragEnd={handleFieldDragEnd}
                      style={{
                        padding: "6px 8px",
                        margin: "2px 0",
                        backgroundColor: draggedFieldId === field.id ? "#fef3c7" :
                          dragOverFieldId === field.id ? "#dbeafe" : "#f9fafb",
                        border: draggedFieldId === field.id ? "1px solid #f59e0b" :
                          dragOverFieldId === field.id ? "1px solid #3b82f6" : "1px solid #e5e7eb",
                        borderRadius: "4px",
                        cursor: reorderMode ? "grab" : "default",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      <span style={{
                        fontSize: "10px",
                        color: "#6b7280",
                        minWidth: "20px"
                      }}>
                        {index + 1}
                      </span>
                      <span style={{ flex: 1, fontSize: "11px" }}>
                        {field.label || field.id}
                      </span>
                      <span style={{
                        fontSize: "10px",
                        color: field.id.startsWith("ai_field_") ? "#3b82f6" : "#10b981"
                      }}>
                        {field.id.startsWith("ai_field_") ? "🤖" : "✏️"}
                      </span>
                    </div>
                  ))}
              </div>
              <div style={{
                fontSize: "11px",
                color: "#6b7280",
                marginTop: "8px",
                fontStyle: "italic"
              }}>
                Drag fields to reorder. Order affects form display sequence.
              </div>

              {/* Field Order Actions */}
              <div style={{
                marginTop: "12px",
                display: "flex",
                gap: "8px",
                flexDirection: "column"
              }}>
                <button
                  onClick={() => {
                    const orderData = {
                      app: app,
                      form: form,
                      page: page,
                      fieldOrder: overlay.fields
                        .filter(f => f.page === page)
                        .map(f => ({ id: f.id, label: f.label }))
                    };
                    const blob = new Blob([JSON.stringify(orderData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${app}_${form}_page${page + 1}_field_order.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{
                    padding: "6px 12px",
                    fontSize: "11px",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                  title="Export current field order"
                >
                  📤 Export Order
                </button>

                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          try {
                            const orderData = JSON.parse(e.target.result);
                            if (orderData.app === app && orderData.form === form && orderData.page === page) {
                              // Reorder fields based on imported order
                              const newOrder = orderData.fieldOrder.map(f => f.id);
                              const pageFields = overlay.fields.filter(f => f.page === page);
                              const otherFields = overlay.fields.filter(f => f.page !== page);

                              // Sort page fields according to imported order
                              const sortedPageFields = newOrder.map(id =>
                                pageFields.find(f => f.id === id)
                              ).filter(Boolean);

                              // Add any fields not in the imported order
                              const missingFields = pageFields.filter(f => !newOrder.includes(f.id));
                              sortedPageFields.push(...missingFields);

                              const newOverlay = {
                                ...overlay,
                                fields: [...otherFields, ...sortedPageFields]
                              };

                              setOverlay(newOverlay);
                              scheduleAutoSave();
                              alert('Field order imported successfully!');
                            } else {
                              alert('Import file does not match current form/page');
                            }
                          } catch (error) {
                            alert('Invalid import file format');
                          }
                        };
                        reader.readAsText(file);
                      }
                    };
                    input.click();
                  }}
                  style={{
                    padding: "6px 12px",
                    fontSize: "11px",
                    backgroundColor: "#f59e0b",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                  title="Import field order from file"
                >
                  📥 Import Order
                </button>

                <button
                  onClick={logFieldOrder}
                  style={{
                    padding: "6px 12px",
                    fontSize: "11px",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                  title="Log current field order to console for debugging"
                >
                  🐛 Debug Order
                </button>
              </div>

              {/* Quick Insert Field */}
              <div style={{ marginTop: "12px" }}>
                <button
                  onClick={() => {
                    const newField = {
                      id: `f_${Date.now()}`,
                      label: `New Field ${overlay.fields.filter(f => f.page === page).length + 1}`,
                      page: page,
                      type: "text",
                      rect: [100, 100, 200, 120],
                      fontSize: 11,
                      align: "left",
                      shrink: true,
                    };
                    insertFieldAtPosition(0, newField); // Insert at top
                  }}
                  style={{
                    padding: "6px 12px",
                    fontSize: "11px",
                    backgroundColor: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    width: "100%"
                  }}
                  title="Add new field at the top of this page"
                >
                  ➕ Insert Field at Top
                </button>

                <button
                  onClick={() => setShowInsertDialog(true)}
                  style={{
                    padding: "6px 12px",
                    fontSize: "11px",
                    backgroundColor: "#8b5cf6",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    width: "100%",
                    marginTop: "8px"
                  }}
                  title="Insert field at specific position"
                >
                  📍 Insert at Position
                </button>
              </div>
            </div>
          )}

          <div>
            <div style={{ marginBottom: "8px" }}>
              <strong>Field Statistics:</strong>
            </div>
            <div style={{ fontSize: "14px", color: "#666" }}>
              <div>📊 Total: {fieldStats.total}</div>
              <div>🤖 AI Detected: {fieldStats.ai}</div>
              <div>🪄 Auto-Placed: {fieldStats.autoPlaced}</div>
              <div>✏️ Manual: {fieldStats.manual}</div>
            </div>
          </div>
        </div>



        {/* Insert Field Dialog */}
        {showInsertDialog && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.5)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                maxWidth: "400px",
                width: "100%",
                padding: "24px",
                position: "relative",
              }}
            >
              <h3 style={{ margin: "0 0 16px 0", color: "#1f2937" }}>
                📍 Insert Field at Position
              </h3>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Position (1-{overlay.fields.filter(f => f.page === page).length + 1}):
                </label>
                <input
                  type="number"
                  min="1"
                  max={overlay.fields.filter(f => f.page === page).length + 1}
                  value={insertPosition + 1}
                  onChange={(e) => setInsertPosition(Math.max(0, parseInt(e.target.value) - 1))}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #d1d5db",
                    borderRadius: "4px",
                    fontSize: "14px"
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Field Label:
                </label>
                <input
                  type="text"
                  id="newFieldLabel"
                  placeholder="Enter field label"
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #d1d5db",
                    borderRadius: "4px",
                    fontSize: "14px"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowInsertDialog(false)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const label = document.getElementById('newFieldLabel').value || `New Field ${insertPosition + 1}`;
                    const newField = {
                      id: `f_${Date.now()}`,
                      label: label,
                      page: page,
                      type: "text",
                      rect: [100, 100 + (insertPosition * 30), 200, 120 + (insertPosition * 30)],
                      fontSize: 11,
                      align: "left",
                      shrink: true,
                    };
                    insertFieldAtPosition(insertPosition, newField);
                    setShowInsertDialog(false);
                    document.getElementById('newFieldLabel').value = '';
                  }}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  Insert Field
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
