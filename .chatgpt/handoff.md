# Handoff
**Issue:** San Diego mehkosop.pdf shows 'No Form Fields Available' - need to add form fields and convert to AcroForm type using admin dashboard
**Ask:** Find root cause and provide complete solution: 1) Use admin dashboard to add form fields, 2) Convert form to AcroForm type, 3) Ensure proper field mapping and validation

## Repro
```bash
#!/usr/bin/env bash
set -e
# minimal run to view the form
npm -v || true
echo "Open the app and navigate to San Diego > SOP PDF step. Expect fields to render."
```

## Env & Checks
```bash
$ git rev-parse --short HEAD
3755d03
```
```bash
$ wc -l data/applications/san_diego_county_mehko/forms/*/acroform-definition.json
      10 data/applications/san_diego_county_mehko/forms/mehkosop.pdf/acroform-definition.json
    1039 data/applications/san_diego_county_mehko/forms/publications_permitapp152.pdf/acroform-definition.json
    1049 total
```
```bash
$ jq '.fields|length' data/applications/san_diego_county_mehko/forms/mehkosop.pdf/overlay.json 2>/dev/null || echo 0
0
```
```bash
$ ls -la data/applications/san_diego_county_mehko/forms/mehkosop.pdf/
total 1752
drwxr-xr-x  6 avan  staff     192 Aug 29 16:47 .
drwxr-xr-x  4 avan  staff     128 Aug 29 16:47 ..
-rw-r--r--  1 avan  staff     382 Aug 29 16:47 acroform-definition.json
-rw-r--r--  1 avan  staff  884330 Aug 29 16:47 form.pdf
-rw-r--r--  1 avan  staff     336 Aug 29 16:47 meta.json
-rw-r--r--  1 avan  staff     180 Aug 29 16:47 overlay.json
```
```bash
$ jq '.type' data/applications/san_diego_county_mehko/forms/mehkosop.pdf/acroform-definition.json 2>/dev/null || echo 'no_type'
"template"
```
```bash
$ find src/components -name '*Admin*' -o -name '*Mapper*' -o -name '*Form*' | head -10
src/components/forms/AcroFormViewer.jsx
src/components/forms/DynamicForm.jsx
src/components/forms/DynamicForm.scss
src/components/forms/AcroFormViewer.scss
src/components/auth/ProtectedAdminRoute.jsx
src/components/admin/Admin.scss
src/components/admin/Admin.jsx
src/components/ai/AIFieldMapper.scss
src/components/ai/AIFieldMapper.jsx
src/components/overlay/Mapper.scss
```

## Key files (truncated)


**src/components/overlay/Interview.jsx** (first 260 lines)
```
// Interview.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";

import AcroFormViewer from "../forms/AcroFormViewer";
import useAuth from "../../hooks/useAuth";
import { useAuthModal } from "../../providers/AuthModalProvider";
import { savePdfFormData, loadPdfFormData } from "../../firebase/userData";
import ReportButton from "../generic/ReportButton";
import ReportIssueModal from "../modals/ReportIssueModal";
import { isSignatureField } from "../../helpers/signatureUtils";
import SignatureField from "./SignatureField";
import "./Interview.scss";

import { getApiBase } from "../../config/api";

const API = getApiBase('python');

export function InterviewView({ app, form, application, step }) {
  const [overlay, setOverlay] = useState({ fields: [] });
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [currentFieldId, setCurrentFieldId] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Auto-save state
  const autoSaveTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const [autoSaveCountdown, setAutoSaveCountdown] = useState(0);
  const [saveStatus, setSaveStatus] = useState("idle"); // "idle" | "saving" | "saved" | "error"
  const [lastSaved, setLastSaved] = useState(null);

  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const { openAuthModal } = useAuthModal();

  // Check if we're in admin context or user context
  const isAdminRoute = location.pathname.startsWith("/admin");

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Save form data to Firestore
  const saveFormData = useCallback(async () => {
    if (!user || !app || !form) return;
    try {
      setSaveStatus("saving");
      await savePdfFormData(user.uid, app, form, values);
      setSaveStatus("saved");
      setLastSaved(new Date());

      // Clear any pending auto-save
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }

      // Reset to idle after a short delay
      setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    } catch (error) {
      console.error("Failed to save form data:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [user, app, form, values]);

  // Auto-save functionality with debouncing (stable via refs)
  const scheduleAutoSave = useCallback(() => {
    if (!user) return;

    // Clear existing timers
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setSaveStatus("saving");
    setAutoSaveCountdown(2);

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveFormData();
      autoSaveTimeoutRef.current = null;
    }, 2000);

    // countdown tick (2 -> 0)
    countdownIntervalRef.current = setInterval(() => {
      setAutoSaveCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [user, saveFormData]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Check for AcroForm definition first (new system)
        let acroFormDefinition = null;
        try {
          const acroResponse = await fetch(`${API}/apps/${app}/forms/${form}/acroform-definition`);
          if (acroResponse.ok) {
            acroFormDefinition = await acroResponse.json();
            console.log("Found AcroForm definition with", acroFormDefinition.fields.length, "fields");
          }
        } catch (e) {
          console.log("No AcroForm definition found, checking for overlay");
        }

        // Fall back to overlay.json (old system) if no AcroForm definition
        if (!acroFormDefinition) {
          const r = await fetch(`${API}/apps/${app}/forms/${form}/template`);
          const tpl = await r.json();
          const fields = Array.isArray(tpl?.fields) ? tpl.fields : [];
          setOverlay({ fields });
          console.log("Using overlay.json with", fields.length, "fields");
        } else {
          // Use AcroForm definition fields
          setOverlay({ fields: acroFormDefinition.fields || [] });
          console.log("Using AcroForm definition with", acroFormDefinition.fields.length, "fields");
        }

        // Initialize form values
        const init = {};
        for (const f of overlay.fields) init[f.id] = f.type === "checkbox" ? false : "";

        // Load saved data if user is authenticated
        if (user && app && form) {
          try {
            const savedData = await loadPdfFormData(user.uid, app, form);
            const mergedValues = { ...init, ...savedData };
            setValues(mergedValues);
          } catch (error) {
            console.error("Failed to load saved form data:", error);
            setValues(init);
          }
        } else {
          setValues(init);
        }
      } catch (e) {
        console.error("Form loading failed:", e);
        setOverlay({ fields: [] });
        setValues({});
      } finally {
        setLoading(false);
      }
    })();
  }, [app, form, user]);

  const onChange = useCallback(
    (id, type, v) => {
      setValues(prev => {
        const next = { ...prev, [id]: type === "checkbox" ? !!v : v };
        return next;
      });
      scheduleAutoSave();
    },
    [scheduleAutoSave]
  );

  const handleFieldFocus = (fieldId) => setCurrentFieldId(fieldId);
  const handleFieldBlur = () => setCurrentFieldId(null);

  async function onSubmit(e) {
    e.preventDefault();

    if (user) {
      await saveFormData();
    }

    const fd = new FormData();
    fd.append("answers_json", JSON.stringify(values));
    const r = await fetch(`${API}/apps/${app}/forms/${form}/fill`, {
      method: "POST",
      body: fd,
    });
    if (!r.ok) return alert("Fill failed");
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${app}_${form}_filled.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const group = useMemo(() => {
    const g = new Map();
    for (const f of overlay.fields) {
      const p = f.page ?? 0;
      if (!g.has(p)) g.set(p, []);
      g.get(p).push(f);
    }
    for (const [pageNum, fields] of g.entries()) {
      const pageFieldOrder = overlay.fields
        .filter(f => (f.page ?? 0) === pageNum)
        .map(f => f.id);
      fields.sort((a, b) => pageFieldOrder.indexOf(a.id) - pageFieldOrder.indexOf(b.id));
    }
    return [...g.entries()].sort((a, b) => a[0] - b[0]);
  }, [overlay]);

  const handleReportClick = () => {
    if (!user) return;
    setIsReportModalOpen(true);
  };

  const handleReportSubmitted = (reportData) => {
    console.log("PDF step report submitted:", reportData);
  };

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  // Authentication check - different messages for admin vs user context
  if (!user) {
    if (isAdminRoute) {
      return (
        <div style={{ padding: 24, textAlign: "center", maxWidth: 500, margin: "0 auto" }}>
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
            <h3 style={{ color: "#dc2626", margin: "0 0 16px 0", fontSize: "20px" }}>🚫 Access Denied</h3>
            <p style={{ color: "#7f1d1d", margin: "0 0 20px 0", lineHeight: "1.6" }}>
              Admin privileges required. Only authorized users can access this area.
            </p>
            <button
              onClick={() => { window.location.href = "/dashboard"; }}
              style={{ background: "#dc2626", color: "white", border: "none", borderRadius: "8px", padding: "12px 24px", fontSize: "16px", cursor: "pointer", fontWeight: "500" }}
            >
              Return to Dashboard
            </button>
          </div>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            This is an admin-only area for managing the <strong>{app}</strong> application.
          </p>
        </div>
      );
    } else {
      return (
        <div style={{ padding: 24, textAlign: "center", maxWidth: 500, margin: "0 auto" }}>
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
            <h3 style={{ color: "#dc2626", margin: "0 0 16px 0", fontSize: "20px" }}>🔒 Authentication Required</h3>
            <p style={{ color: "#7f1d1d", margin: "0 0 20px 0", lineHeight: "1.6" }}>
              You need to be signed in to fill out this form. Please log in to continue with your application.
            </p>
            <button
              onClick={openAuthModal}
              style={{ background: "#dc2626", color: "white", border: "none", borderRadius: "8px", padding: "12px 24px", fontSize: "16px", cursor: "pointer", fontWeight: "500" }}
            >
              Sign In to Continue
```

**src/components/overlay/Mapper.jsx** (first 260 lines)
```
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
```

**src/components/ai/AIFieldMapper.jsx** (first 260 lines)
```
import { useState, useRef, useEffect } from "react";
import "./AIFieldMapper.scss";
import { ENDPOINTS } from "../../config/api";
const AIFieldMapper = ({ app, form, onMappingComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [currentStep, setCurrentStep] = useState("idle"); // idle, analyzing, mapping, reviewing
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [overlay, setOverlay] = useState({ fields: [] });
  const fileInputRef = useRef(null);
  const _canvasRef = useRef(null);
  // Load existing overlay if available
  useEffect(() => {
    loadExistingOverlay();
  }, [app, form]);
  const loadExistingOverlay = async () => {
    try {
      const response = await fetch(`/api/apps/${app}/forms/${form}/template`);
      const data = await response.json();
      setOverlay(data);
    } catch (_err) {
      // Ignore errors when loading existing overlay
    }
  };
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !file.type.includes("pdf")) {
      setError("Please select a valid PDF file");
      return;
    }
    setIsProcessing(true);
    setCurrentStep("analyzing");
    setProgress(0);
    setError(null);
    try {
      // Step 1: Upload PDF and get AI analysis
      setProgress(20);
      const formData = new FormData();
      formData.append("pdf", file);
      console.log(
        "Sending request to:",
        ENDPOINTS.AI_ANALYZE_PDF()
      ); // Debug log
      const uploadResponse = await fetch(
        ENDPOINTS.AI_ANALYZE_PDF(),
        {
          method: "POST",
          body: formData,
        }
      );
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("Upload failed with response:", errorText); // Debug log
        throw new Error(
          `Failed to upload PDF for analysis: ${uploadResponse.status} ${errorText}`
        );
      }
      const analysisData = await uploadResponse.json();
      setProgress(60);
      // Step 2: Process AI suggestions
      setCurrentStep("mapping");
      const suggestions = processAISuggestions(analysisData.fields);
      setAiSuggestions(suggestions);
      setProgress(80);
      // Step 3: Auto-select high-confidence fields
      setCurrentStep("reviewing");
      const highConfidenceFields = suggestions.filter(
        (f) => f.confidence > 0.8
      );
      setSelectedFields(highConfidenceFields.map((f) => f.id));
      setProgress(100);
    } catch (err) {
      console.error("Error in handleFileUpload:", err); // Debug log
      setError(err.message);
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
      setError("Please select at least one field to apply");
      return;
    }
    try {
      const selectedFieldData = aiSuggestions.filter((f) =>
        selectedFields.includes(f.id)
      );
      // Convert to overlay format
      const newOverlay = {
        ...overlay,
        fields: [
          ...overlay.fields,
          ...selectedFieldData.map((f) => ({
            id: f.id,
            label: f.label,
            page: f.page,
            type: f.type,
            rect: f.rect,
            fontSize: f.fontSize,
            align: f.align,
            shrink: f.shrink,
          })),
        ],
      };
      // Save the new overlay
      const formData = new FormData();
      formData.append("overlay_json", JSON.stringify(newOverlay));
      const response = await fetch(`/api/apps/${app}/forms/${form}/template`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Failed to save field mapping");
      }
      setOverlay(newOverlay);
      onMappingComplete?.(newOverlay);
      // Reset for next use
      setAiSuggestions([]);
      setSelectedFields([]);
      setCurrentStep("idle");
    } catch (err) {
      setError(err.message);
    }
  };
  const renderProgressBar = () => (
    <div className="progress-container">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="progress-text">
        {currentStep === "analyzing" && "AI analyzing PDF structure..."}
        {currentStep === "mapping" && "Mapping detected fields..."}
        {currentStep === "reviewing" && "Review AI suggestions..."}
      </div>
    </div>
  );
  const renderFieldSuggestions = () => (
    <div className="field-suggestions">
      <h3>AI Field Suggestions</h3>
      <div className="suggestions-grid">
        {aiSuggestions.map((field) => (
          <div
            key={field.id}
            className={`field-suggestion ${selectedFields.includes(field.id) ? "selected" : ""
              }`}
          >
            <div className="field-header">
              <input
                type="checkbox"
                checked={selectedFields.includes(field.id)}
                onChange={(e) =>
                  handleFieldSelection(field.id, e.target.checked)
                }
              />
              <span className="field-label">{field.label}</span>
              <span
                className={`confidence-badge confidence-${Math.floor(
                  field.confidence * 10
                )}`}
              >
                {Math.round(field.confidence * 100)}%
              </span>
            </div>
            <div className="field-details">
              <div className="field-type">Type: {field.type}</div>
              <div className="field-page">Page: {field.page + 1}</div>
              <div className="field-dimensions">
                Size: {Math.round(field.width)}×{Math.round(field.height)} px
              </div>
              <div className="ai-reasoning">{field.aiReasoning}</div>
            </div>
          </div>
        ))}
      </div>
      {aiSuggestions.length > 0 && (
        <div className="mapping-actions">
          <button
            className="apply-mapping-btn"
            onClick={handleApplyMapping}
            disabled={selectedFields.length === 0}
          >
            Apply Selected Fields ({selectedFields.length})
          </button>
        </div>
      )}
    </div>
  );
  return (
    <div className="ai-field-mapper">
      <div className="mapper-header">
        <h2>🤖 AI-Powered Field Mapping</h2>
        <p>Upload a PDF and let AI automatically detect and map form fields</p>
      </div>
      {!isProcessing && currentStep === "idle" && (
        <div className="upload-section">
          <div
            className="upload-area"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-icon">📄</div>
            <div className="upload-text">
              <strong>Click to upload PDF</strong>
              <span>or drag and drop</span>
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
      {isProcessing && (
        <div className="processing-section">{renderProgressBar()}</div>
      )}
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}
      {currentStep === "reviewing" &&
        aiSuggestions.length > 0 &&
        renderFieldSuggestions()}
      {overlay.fields.length > 0 && (
        <div className="existing-fields">
          <h3>Existing Mapped Fields</h3>
          <div className="fields-count">
            {overlay.fields.length} field(s) already mapped
```

**src/components/admin/Admin.jsx** (first 300 lines)
```
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { db } from "../../firebase/firebase";
import useAuth from "../../hooks/useAuth";
import {
  doc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
} from "firebase/firestore";
import ReportsViewer from "./ReportsViewer";
import "./Admin.scss";
const API = "/api/apps";
export default function Admin() {
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("apps"); // "apps" | "reports" | "import"
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
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
      </div>
    );
  }
  // App list + selection
  const [apps, setApps] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [showNewAppForm, setShowNewAppForm] = useState(false);
  const selectedApp = apps.find((a) => a.id === selectedAppId) || null;
  // App form (prefilled when selecting)
  const [appId, setAppId] = useState("");
  const [appTitle, setAppTitle] = useState("");
  const [rootDomain, setRootDomain] = useState("");
  const [description, setDescription] = useState("");
  // Existing steps for selected app
  const [steps, setSteps] = useState([]);
  // New step queue (add multiple, then Save)
  const [newType, setNewType] = useState("info");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newFormName, setNewFormName] = useState("");
  const [newFormId, setNewFormId] = useState("");
  const [newPdfFile, setNewPdfFile] = useState(null);
  const [queuedSteps, setQueuedSteps] = useState([]);
  // Bulk import state
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  // AcroForm conversion state
  const [isConverting, setIsConverting] = useState(false);
  const [conversionStatus, setConversionStatus] = useState(null);
  // UI feedback
  const [status, setStatus] = useState("");
  // ----------- Helpers -----------
  const pushStatus = (msg) => {
    setStatus(msg);
    setTimeout(() => setStatus(""), 2500);
  };
  async function loadApps() {
    const snap = await getDocs(collection(db, "applications"));
    const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setApps(arr.sort((a, b) => a.id.localeCompare(b.id)));
  }
  // Prefill app form when selecting from sidebar
  function selectApp(id) {
    setSelectedAppId(id);
    setShowNewAppForm(false);
    const a = apps.find((x) => x.id === id);
    if (a) {
      setAppId(a.id);
      setAppTitle(a.title || "");
      setRootDomain(a.rootDomain || "");
      setDescription(a.description || "");
      setSteps(Array.isArray(a.steps) ? a.steps : []);
    }
    setQueuedSteps([]);
  }
  // New app form (clear)
  function newApp() {
    setSelectedAppId("");
    setShowNewAppForm(true);
    setAppId("");
    setAppTitle("");
    setRootDomain("");
    setDescription("");
    setSteps([]);
    setQueuedSteps([]);
  }
  useEffect(() => {
    loadApps();
  }, []);
  // ----------- Bulk Import Functions -----------
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const jsonFiles = files.filter(
      (file) => file.type === "application/json" || file.name.endsWith(".json")
    );
    if (jsonFiles.length > 0) {
      setBulkFiles((prev) => [...prev, ...jsonFiles]);
      pushStatus(`Added ${jsonFiles.length} JSON file(s)`);
    } else {
      pushStatus("No JSON files found. Please drop .json files only.");
    }
  };
  const handleFileSelect = (e) => {
    console.log('File select triggered', e.target.files);
    const files = Array.from(e.target.files);
    console.log('Files selected:', files);
    const jsonFiles = files.filter(
      (file) => file.type === "application/json" || file.name.endsWith(".json")
    );
    console.log('JSON files filtered:', jsonFiles);
    if (jsonFiles.length > 0) {
      setBulkFiles((prev) => [...prev, ...jsonFiles]);
      pushStatus(`Added ${jsonFiles.length} JSON file(s)`);
    } else {
      pushStatus("No JSON files found. Please select .json files only.");
    }
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };
  const removeFile = (index) => {
    setBulkFiles((prev) => prev.filter((_, i) => i !== index));
    setBulkPreview((prev) => prev.filter((_, i) => i !== index));
  };
  const previewFiles = async () => {
    if (bulkFiles.length === 0) return;
    const previews = [];
    for (const file of bulkFiles) {
      try {
        const content = await file.text();
        const data = JSON.parse(content);
        previews.push({
          filename: file.name,
          data: data,
          valid:
            data.id && data.title && data.steps && Array.isArray(data.steps),
          error: null,
        });
      } catch (error) {
        previews.push({
          filename: file.name,
          data: null,
          valid: false,
          error: error.message,
        });
      }
    }
    setBulkPreview(previews);
  };
  // Note: PDF downloads will be handled by the Python server
  // The Python server has the working PDF download logic
  const processBulkImport = async () => {
    if (bulkPreview.length === 0) return;
    setIsProcessing(true);
    setBulkStatus("Processing applications...");
    let successCount = 0;
    let errorCount = 0;
    for (const preview of bulkPreview) {
      if (!preview.valid) {
        errorCount++;
        continue;
      }
      try {
        // Use the new Python FastAPI process-county endpoint
        console.log('Application data:', preview.data);
        const response = await fetch(`${API}/process-county`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preview.data),
        });
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        if (response.ok) {
          const result = await response.json();
          console.log('Success result:', result);
          successCount++;
        } else {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          errorCount++;
        }
      } catch (_error) {
        errorCount++;
      }
    }
    setBulkStatus(
      `Import complete: ${successCount} successful, ${errorCount} failed`
    );
    setIsProcessing(false);
    setBulkFiles([]);
    setBulkPreview([]);
    loadApps();
  };
  // ----------- Step Management Functions -----------
  const addStepToQueue = () => {
    if (!newTitle.trim()) {
      pushStatus("Please enter a step title");
      return;
    }
    const step = {
      id: `step_${Date.now()}`,
      title: newTitle.trim(),
      type: newType,
      content: newContent.trim(),
      formName: newFormName.trim(),
      formId: newFormId.trim(),
      _file: newPdfFile,
    };
    setQueuedSteps((prev) => [...prev, step]);
    setNewTitle("");
    setNewContent("");
    setNewFormName("");
    setNewFormId("");
    setNewPdfFile(null);
    pushStatus("Step added to queue");
  };
  const removeQueued = (index) => {
    setQueuedSteps((prev) => prev.filter((_, i) => i !== index));
  };
  const saveQueuedSteps = async () => {
    if (!appId || queuedSteps.length === 0) return;
    try {
      const updatedSteps = [...steps];
      for (const queuedStep of queuedSteps) {
        const { _file, ...stepData } = queuedStep;
        if (stepData.type === "pdf" && _file) {
          // Handle PDF upload
          const formData = new FormData();
          formData.append("pdf", _file);
          formData.append("formId", stepData.formId);
          const uploadResponse = await fetch(`${API}/apps/${appId}/forms/${stepData.formId}/upload`, {
            method: "POST",
            body: formData,
          });
          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload PDF for ${stepData.formId}`);
          }
        }
        updatedSteps.push(stepData);
      }
      // Update the application
      const appRef = doc(db, "applications", appId);
      await updateDoc(appRef, { steps: updatedSteps });
      setSteps(updatedSteps);
      setQueuedSteps([]);
      pushStatus("Steps saved successfully");
      loadApps();
    } catch (error) {
      pushStatus(`Error saving steps: ${error.message}`);
    }
  };
  // ----------- AcroForm Conversion Functions -----------
  const convertToAcroForm = async (step) => {
    if (step.type !== "pdf") return;
    setIsConverting(true);
    setConversionStatus("Converting to AcroForm...");
    try {
      // Convert the PDF step to AcroForm
```

**src/components/forms/AcroFormViewer.jsx** (first 200 lines)
```
import React, { useState, useEffect, useRef } from "react";
import { getApiBase } from "../../config/api";
import "./AcroFormViewer.scss";

const AcroFormViewer = ({
    app,
    form,
    application,
    step,
    onFormDataChange,
    initialFormData = {},
}) => {
    const [pdfUrl, setPdfUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [isAcroFormAvailable, setIsAcroFormAvailable] = useState(false);

    const iframeRef = useRef(null);
    const formDataRef = useRef(formData);

    const API_BASE = getApiBase('python');

    useEffect(() => {
        loadPdfData();
    }, [app, form]);

    useEffect(() => {
        formDataRef.current = formData;
    }, [formData]);

    const loadPdfData = async () => {
        setLoading(true);
        setError(null);

        try {
            // First, try to create/get AcroForm PDF
            const acroformResponse = await fetch(
                `${API_BASE}/apps/${app}/forms/${form}/create-acroform`,
                { method: "POST" }
            );

            if (acroformResponse.ok) {
                // AcroForm available - get the inline version
                setPdfUrl(`${API_BASE}/apps/${app}/forms/${form}/acroform-pdf?inline=true`);
                setIsAcroFormAvailable(true);
            } else {
                // Fall back to regular PDF with overlay fields
                setPdfUrl(`${API_BASE}/apps/${app}/forms/${form}/pdf?inline=true`);
                setIsAcroFormAvailable(false);
            }
        } catch (err) {
            console.error("Failed to load PDF:", err);
            setError("Failed to load the form. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleFormFieldChange = (fieldName, value) => {
        const newFormData = { ...formDataRef.current, [fieldName]: value };
        setFormData(newFormData);

        if (onFormDataChange) {
            onFormDataChange(newFormData);
        }
    };

    const handleIframeLoad = () => {
        if (iframeRef.current) {
            // Listen for messages from the PDF viewer
            window.addEventListener('message', (event) => {
                if (event.data.type === 'form-field-changed') {
                    handleFormFieldChange(event.data.fieldName, event.data.value);
                }
            });
        }
    };

    const downloadFilledPdf = async () => {
        try {
            const response = await fetch(`${API_BASE}/apps/${app}/forms/${form}/fill`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `answers_json=${encodeURIComponent(JSON.stringify(formData))}`,
            });

            if (!response.ok) {
                throw new Error("Failed to generate filled PDF");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${app}_${form}_filled.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to download PDF:", err);
            setError("Failed to download the filled PDF. Please try again.");
        }
    };

    const resetForm = () => {
        setFormData({});
        if (onFormDataChange) {
            onFormDataChange({});
        }
    };

    if (loading) {
        return (
            <div className="acroform-viewer">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading form...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="acroform-viewer">
                <div className="error-container">
                    <div className="error-icon">❌</div>
                    <h3>Error Loading Form</h3>
                    <p>{error}</p>
                    <button onClick={loadPdfData} className="retry-button">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="acroform-viewer">


            <div className="pdf-container">
                {pdfUrl && (
                    <iframe
                        ref={iframeRef}
                        src={pdfUrl}
                        className="pdf-iframe"
                        title="PDF Form"
                        onLoad={handleIframeLoad}
                    />
                )}
            </div>

            {/* Fallback form fields for non-AcroForm PDFs */}
            {!isAcroFormAvailable && Object.keys(formData).length > 0 && (
                <div className="fallback-form">
                    <h3>Form Data</h3>
                    <div className="form-fields">
                        {Object.entries(formData).map(([fieldName, value]) => (
                            <div key={fieldName} className="form-field">
                                <label>{fieldName}:</label>
                                <input
                                    type="text"
                                    value={value || ""}
                                    onChange={(e) => handleFormFieldChange(fieldName, e.target.value)}
                                    placeholder={`Enter ${fieldName}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AcroFormViewer;
```

**src/components/forms/DynamicForm.jsx** (first 200 lines)
```
import React, { useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth";
import { ENDPOINTS } from "../../config/api";
import {
  saveFormData,
  loadFormData,
  pinApplication,
} from "../../firebase/userData";
import useProgress from "../../hooks/useProgress";
import ReportButton from "../generic/ReportButton";
import ReportIssueModal from "../modals/ReportIssueModal";
import "./DynamicForm.scss";

export default function DynamicForm({
  applicationId,
  formName,
  stepId,
  hideCompleteToggle = false,
  application,
  step,
}) {
  const { user } = useAuth();
  const { completedSteps, markStepComplete, markStepIncomplete } = useProgress(
    user?.uid,
    applicationId
  );
  const isComplete = completedSteps.includes(stepId);
  const [fieldNames, setFieldNames] = useState([]);
  const [formData, setFormData] = useState({});
  const [status, setStatus] = useState("idle"); // "idle" | "saving" | "saved" | "error"
  const [isLoading, setIsLoading] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    const fetchFieldNamesAndData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `${ENDPOINTS.FORM_FIELDS()}?applicationId=${applicationId}&formName=${formName}`
        );
        const data = await res.json();
        setFieldNames(data.fields || []);

        if (user) {
          const savedData = await loadFormData(
            user.uid,
            applicationId,
            formName
          );
          setFormData(savedData || {});
        }
      } catch (err) {
        console.error("Error fetching fields or saved form data", err);
      }
      setIsLoading(false);
    };

    fetchFieldNamesAndData();
  }, [applicationId, formName, user]);

  const handleChange = async (e) => {
    const newData = {
      ...formData,
      [e.target.name]: e.target.value,
    };

    setFormData(newData);
    setStatus("saving");

    if (user) {
      try {
        await saveFormData(user.uid, applicationId, formName, newData);
        await pinApplication(user.uid, applicationId, "form");
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 1500);
      } catch (err) {
        console.error("Failed to save form data", err);
        setStatus("error");
      }
    }
  };

  const handleReset = () => {
    setFormData({});
    setStatus("idle");
  };

  const handleDownload = async () => {
    try {
      const res = await fetch("/api/fill-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, formName, formData }),
      });

      if (!res.ok) throw new Error("PDF generation failed");

      // The response is JSON with { url }
      const { url } = await res.json();
      // Redirect the browser to download the file
      window.location.href = url;
    } catch (err) {
      console.error("Error downloading PDF:", err);
      alert("Something went wrong generating the PDF.");
    }
  };

  const handleReportClick = () => {
    if (!user) return;
    setIsReportModalOpen(true);
  };

  const handleReportSubmitted = (reportData) => {
    console.log("Form step report submitted:", reportData);
  };

  if (!user) return <p>Please log in to use this feature.</p>;

  if (isLoading) {
    return (
      <div className="dynamic-form">
        <div className="form-header">
          <h2>Loading form...</h2>
        </div>
        <div className="loading">Loading form fields...</div>
      </div>
    );
  }

  return (
    <div className="dynamic-form">
      <div className="form-header">
        <h2>{formName.replace(".pdf", "").replace(/[_-]/g, " ")}</h2>
        {user && (
          <ReportButton
            onClick={handleReportClick}
            size="small"
            variant="subtle"
          >
            Report Issue
          </ReportButton>
        )}
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        {!hideCompleteToggle && (
          <div className="step-complete-checkbox">
            <label>
              <input
                type="checkbox"
                checked={isComplete}
                onChange={(e) => {
                  if (e.target.checked) {
                    markStepComplete(stepId);
                  } else {
                    markStepIncomplete(stepId);
                  }
                }}
              />
              Mark this step as complete
            </label>
          </div>
        )}

        <div className="form-status">
          <span className={`status ${status}`}>
            {status === "saving"
              ? "Saving..."
              : status === "saved"
                ? "Saved ✅"
                : status === "error"
                  ? "Error ❌"
                  : ""}
          </span>
        </div>

        {fieldNames.map((field, index) => {
          return (
            <div key={`${field.label}-${index}`} className="form-field">
              <label>{field.label || field.name}</label>
              <input
                type="text"
                name={field.name}
                value={formData[field.name] || ""}
                onChange={handleChange}
              />
              {field.description && (
                <small className="field-description">{field.description}</small>
              )}
            </div>
          );
        })}

        <div className="form-actions">
          <button type="button" onClick={handleReset}>
            Reset Form
          </button>
          <button type="button" onClick={handleDownload}>
            Download Filled PDF
          </button>
```

**scripts/generate-form-labels.js** (first 260 lines)
```
// scripts/generate-form-labels.js (Assistants API with proper attachments and thread creation)
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createRequire } from "module";
import OpenAI from "openai";
import admin from "firebase-admin";
dotenv.config();
const _require = createRequire(import.meta.url);
const openai = new OpenAI({ [REDACTED]
// 🔥 Firebase Admin Init
const serviceAccount = JSON.parse(
  fs.readFileSync("./config/[REDACTED]")
);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
// Assistant ID from .env or hardcoded fallback
const _ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;
async function extractFieldsFromPDF(pdfPath) {
  // 1️⃣ Upload PDF
  const uploadedFile = await openai.files.create({
    file: fs.createReadStream(pdfPath),
    purpose: "assistants",
  });
  // 2️⃣ Create Assistant explicitly (temporary, ensures correct config)
  const assistant = await openai.beta.assistants.create({
    name: "MEHKO Field Extractor",
    instructions:
      "Extract all fillable fields from the uploaded PDF form in top-to-bottom visual order. Return JSON array only.",
    model: "gpt-4-turbo", // Confirmed valid model
    tools: [{ type: "file_search" }],
  });
  // 3️⃣ Create Thread with proper file attachments and tool resources
  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content: "Extract all fillable fields. JSON only.",
        attachments: [
          { file_id: uploadedFile.id, tools: [{ type: "file_search" }] },
        ],
      },
    ],
    tool_resources: {
      file_search: { vector_store_ids: [] },
    },
  });
  if (!thread?.id)
    throw new Error(`Invalid thread creation: ${JSON.stringify(thread)}`);
  // 4️⃣ Start the Assistant run
  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistant.id,
  });
  // 5️⃣ Poll for completion
  let status;
  do {
    await new Promise((res) => setTimeout(res, 1500));
    const check = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    status = check.status;
  } while (status === "queued" || status === "in_progress");
  if (status !== "completed") throw new Error(`Run failed: ${status}`);
  // 6️⃣ Retrieve results clearly
  const messages = await openai.beta.threads.messages.list(thread.id);
  const lastMessage = messages.data.find((m) => m.role === "assistant");
  const content = lastMessage.content[0].text.value
    .replace(/```json|```/g, "")
    .trim();
  // ✅ Cleanup temporary assistant (optional but recommended)
  await openai.beta.assistants.del(assistant.id);
  // Return JSON
  return JSON.parse(content);
}
export async function processForms() {
  const formsDir = path.resolve("src/data/forms");
  const applications = fs
    .readdirSync(formsDir)
    .filter((entry) => fs.statSync(path.join(formsDir, entry)).isDirectory());
  for (const appId of applications) {
    const appPath = path.join(formsDir, appId);
    const formFiles = fs.readdirSync(appPath).filter((f) => f.endsWith(".pdf"));
    for (const formName of formFiles) {
      const pdfPath = path.join(appPath, formName);
      const cacheKey = `${appId}_${formName}`;
      const docRef = db.collection("formLabels").doc(cacheKey);
      const existing = await docRef.get();
      if (existing.exists) {
        continue;
      }
      console.log(`🧠 Processing ${cacheKey}...`);
      try {
        const labeledFields = await extractFieldsFromPDF(pdfPath);
        await docRef.set({
          fields: labeledFields,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.error(`❌ Failed on ${cacheKey}:`, err.message);
      }
    }
  }
  console.log("🏁 Done.");
}
processForms();```

**python/overlay/fill_overlay.py** (first 150 lines)
```
import fitz
from typing import Dict, Any, List
ALIGN={"left":0,"center":1,"right":2}

def _clear_all_widgets(doc: fitz.Document):
    for p in doc:
        for w in (p.widgets() or []):
            try: p.delete_widget(w)
            except Exception: pass

def _bg(p: fitz.Page, r: List[float], color=(1,1,1)):
    p.draw_rect(fitz.Rect(*r), fill=color, width=0, overlay=True)

def _checkbox(p: fitz.Page, rect: List[float], v: bool):
    R = fitz.Rect(*rect)
    p.draw_rect(R, width=1.0, color=(0,0,0), overlay=True)
    if v:
        p.draw_line(R.tl, R.br, width=1.5, color=(0,0,0), overlay=True)
        p.draw_line(R.tr, R.bl, width=1.5, color=(0,0,0), overlay=True)

def _signature(p: fitz.Page, rect: List[float], png_bytes: bytes):
    r = fitz.Rect(*rect)
    p.insert_image(r, stream=png_bytes, keep_proportion=True, overlay=True)

def _text(p: fitz.Page, rect: List[float], text: str, size=11, align="left", shrink=True):
    R = fitz.Rect(*rect)
    if not text: return
    for fs in (size, 12, 11, 10, 9, 8) if shrink else (size,):
        placed = p.insert_textbox(R, text, fontsize=float(fs),
                                  fontname="Helvetica", color=(0,0,0),
                                  align=ALIGN.get(align,0), overlay=True)
        if placed > 0: return
    p.insert_text(R.tl, text, fontsize=8, fontname="Helvetica", color=(0,0,0))

def fill_pdf_overlay_bytes(pdf_bytes: bytes, overlay: Dict[str,Any], answers: Dict[str,Any]) -> bytes:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    _clear_all_widgets(doc)
    for f in overlay.get("fields", []):
        fid = f["id"]; val = answers.get(fid)
        if val in (None, ""): continue
        page = doc[int(f["page"])]

        ftype = (f.get("type","text") or "text").lower()
        if ftype == "checkbox":
            _checkbox(page, f["rect"], bool(val))
            continue

        if ftype == "signature":
            # accept either raw PNG bytes or a base64/data URL string
            png = val
            if isinstance(val, str) and val.startswith("data:image/png;base64,"):
                import base64
                png = base64.b64decode(val.split(",",1)[1])
            _bg(page, f["rect"], color=(1,1,1)) if f.get("bg") else None
            _signature(page, f["rect"], png)
            continue

        # text (existing)
        txt = str(val)
        if f.get("uppercase"): txt = txt.upper()
        if f.get("bg"): _bg(page, f["rect"])  # white-out under text if needed

        _text(page, f["rect"], txt,
              size=float(f.get("fontSize", 11)),
              align=str(f.get("align","left")),
              shrink=bool(f.get("shrink", True)))
    return doc.tobytes(deflate=True, garbage=4)
```

**package.json** (first 120 lines)
```
{
  "name": "react-portfolio",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "seed:dry": "node seed/seed-apps.mjs --path seed/apps --dry-run",
    "seed": "node seed/seed-apps.mjs --path seed/apps",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:headed": "playwright test --headed",
    "test:all": "npm run test && npm run test:e2e",
    "test:setup-user": "node scripts/setup-test-user.mjs",
    "gateway": "node scripts/api-gateway.js",
    "dev:gateway": "concurrently \"npm run gateway\" \"npm run dev\"",
    "ai:rules": "echo '🤖 READ .cursor/rules/README.md BEFORE MAKING CHANGES!'",
    "ai:check": "echo '📋 AI: Check .cursor/rules/ and ask permission before changes'",
    "ai:test": "echo '🧪 Testing AI compliance - run: npm run ai:check'"
  },
  "dependencies": {
    "@daybrush/utils": "^1.13.0",
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/utilities": "^3.2.2",
    "@emailjs/browser": "^4.4.1",
    "@fortawesome/fontawesome-free": "^6.6.0",
    "@scena/guides": "^0.29.2",
    "bootstrap": "^5.3.3",
    "chart.js": "^4.4.4",
    "cheerio": "^1.1.2",
    "cors": "^2.8.5",
    "dotenv": "^17.0.0",
    "express": "^5.1.0",
    "firebase": "^11.9.1",
    "firebase-admin": "^13.4.0",
    "http-proxy-middleware": "^3.0.5",
    "multer": "^2.0.2",
    "node-fetch": "^3.3.2",
    "openai": "^5.8.2",
    "pdf-lib": "^1.17.1",
    "pdf2pic": "^3.2.0",
    "pdfjs-dist": "^3.11.174",
    "puppeteer": "^23.0.0",
    "react": "^18.3.1",
    "react-bootstrap": "^2.10.4",
    "react-chartjs-2": "^5.2.0",
    "react-dom": "^18.3.1",
    "react-markdown": "^10.1.0",
    "react-moveable": "^0.56.0",
    "react-rnd": "^10.5.2",
    "react-router-dom": "^7.8.1",
    "sharp": "^0.34.3",
    "smooth-scrollbar": "^8.8.4",
    "swiper": "^11.1.14"
  },
  "devDependencies": {
    "@babel/eslint-parser": "^7.28.0",
    "@babel/preset-react": "^7.27.1",
    "@eslint/js": "^9.9.0",
    "@playwright/test": "^1.40.0",
    "@tailwindcss/postcss": "^4.1.12",
    "@testing-library/jest-dom": "^6.7.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.7.0",
    "autoprefixer": "^10.4.21",
    "concurrently": "^9.2.1",
    "diff2html": "^3.4.52",
    "eslint": "^9.9.0",
    "eslint-plugin-react": "^7.35.0",
    "eslint-plugin-react-hooks": "^5.1.0-rc.0",
    "eslint-plugin-react-refresh": "^0.4.9",
    "globals": "^15.9.0",
    "jsdom": "^26.1.0",
    "postcss": "^8.5.6",
    "sass-embedded": "^1.78.0",
    "simple-git": "^3.28.0",
    "tailwindcss": "^4.1.12",
    "vite": "^5.4.1",
    "vitest": "^3.2.4"
  }
}```

**docs/ADMIN_DASHBOARD_COUNTY_PROCESSOR.md** (first 200 lines)
```
# 🚀 Admin Dashboard County Processor

## Overview

The admin dashboard includes a **County Processor** tab that allows administrators to upload and process county JSON files directly through the web interface. This eliminates the need for command-line operations and provides a user-friendly way to manage county applications.

## 🏗️ **System Architecture**

The county processor works with our **dual-server architecture**:

- **Node.js Server (Port 3000)**: Handles county data processing and Firebase sync
- **Python Server (Port 8000)**: Handles PDF processing and storage
- **Frontend**: Loads from Firebase, processes through Node.js server

## ✨ **Features**

### **1. Drag & Drop Upload**

- **Drag & drop** JSON files directly into the interface
- **Click to select** files from your computer
- **Multiple file support** for batch processing
- **File validation** before processing

### **2. Automatic Processing**

- **JSON validation** with clear error messages
- **Manifest updates** automatically
- **Directory creation** for applications
- **PDF downloads** for all required forms
- **Real-time status** updates

### **3. User-Friendly Interface**

- **Visual feedback** during processing
- **Clear results** showing success/failure
- **Detailed information** about processed counties
- **Responsive design** for all devices

## 🎯 **How to Use**

### **Step 1: Access Admin Dashboard**

1. Navigate to `/admin` in your application
2. Ensure you have admin privileges
3. Click on the **"County Processor"** tab

### **Step 2: Upload County Files**

1. **Drag & drop** JSON files into the upload zone
2. **Or click** the upload zone to select files
3. **Review** the list of files to be processed
4. **Remove** any unwanted files if needed

### **Step 3: Process Counties**

1. Click the **"Process Counties"** button
2. **Watch real-time progress** as files are processed
3. **View results** for each county
4. **See detailed information** about what was created

## 📁 **What Gets Created**

For each processed county, the system automatically creates:

```
data/
├── applications/
│   └── county_name_mehko/
│       └── forms/
│           ├── FORM_ID_1/
│           │   ├── form.pdf          # Downloaded PDF
│           │   └── meta.json         # Form metadata
│           └── FORM_ID_2/
│               ├── form.pdf          # Downloaded PDF
│               └── meta.json         # Form metadata
├── manifest.json                      # Updated with new county
└── county_name_mehko.json            # County data file
```

## 🔧 **Backend Integration**

### **API Endpoint**

```
POST /api/admin/process-county
```

**Server**: Node.js server (Port 3000)

### **Request Format**

```json
{
  "countyData": "JSON string content",
  "filename": "county_name.json"
}
```

### **Response Format**

```json
{
  "success": true,
  "message": "Successfully processed County Name",
  "countyId": "county_name_mehko",
  "title": "County Name MEHKO",
  "steps": 10,
  "pdfForms": 2,
  "downloadedForms": 2,
  "configSaved": "data/county_name_mehko.json",
  "manifestUpdated": "data/manifest.json"
}
```

## 🔄 **Data Flow**

### **Processing Pipeline**

```
1. Admin uploads county JSON → Node.js server
2. Node.js validates JSON structure and content
3. Node.js saves county data to data/ directory
4. Node.js updates manifest.json
5. Node.js creates application directory structure
6. Node.js downloads PDFs from URLs in steps
7. Node.js syncs data to Firebase (applications collection)
8. Python server can now access PDFs for processing
```

### **Firebase Integration**

The Node.js server automatically creates:

- **Application document** in `applications/{countyId}` collection
- **Steps subcollection** with individual step documents
- **Metadata** including creation timestamps and source information

## 📋 **County JSON Requirements**

### **Required Structure**

```json
{
  "id": "county_name_mehko",
  "title": "County Name MEHKO",
  "description": "Brief description with key limits and fees",
  "rootDomain": "county.gov",
  "supportTools": {
    "aiEnabled": true,
    "commentsEnabled": true
  },
  "steps": [
    {
      "id": "step_id",
      "title": "Step Title",
      "type": "info|pdf",
      "action_required": true|false,
      "fill_pdf": true|false,
      "content": "Step content with markdown formatting",
      "searchTerms": ["search phrase 1", "search phrase 2"],
      "formId": "FORM_ID_HERE", // Required for PDF steps only
      "pdfUrl": "https://county.gov/forms/form.pdf", // Required for PDF steps only
      "appId": "county_name_mehko" // Must match the main ID
    }
  ]
}
```

### **Validation Rules**

- **ID format**: Must match regex `/^[a-z0-9_]+$/`
- **PDF steps**: Must have `formId` and `pdfUrl`
- **Step references**: Must use proper step reference format
- **Content structure**: Must follow established content template

## 🚨 **Error Handling**

### **Common Validation Errors**

- **Missing required fields**: Clear indication of what's missing
- **Invalid ID format**: Explanation of proper naming conventions
- **PDF step issues**: Validation of formId and pdfUrl
- **Content format**: Guidance on proper content structure

### **Processing Errors**

- **PDF download failures**: Individual PDF status reporting
- **Firebase sync issues**: Clear error messages and retry options
- **File system errors**: Directory creation and permission issues

## 🧪 **Testing**

### **Test County Data**

Use the provided test county data in `data/` directory:

- `data/example-county.json` - Basic county structure
- `data/county-template.json` - Template with all required fields

### **Validation Testing**
```

**docs/ADMIN_ROLE_SYSTEM.md** (first 150 lines)
```
# Admin Role System

## Overview

The Mehko AI project now uses a secure, role-based admin system instead of hardcoded email checks. This provides better security and maintainability.

## How It Works

### 1. Firebase Custom Claims (Recommended)

- **Most Secure**: Admin status is stored in Firebase Auth custom claims
- **Immediate**: Changes take effect after user re-authentication
- **Server-side**: Cannot be modified by client-side code

### 2. Firestore User Document (Fallback)

- **Alternative**: Admin status stored in Firestore user collection
- **Flexible**: Easy to manage and update
- **Client-side**: Checked during authentication

## Setting Up Admin Users

### Option 1: Using the Utility Script (Recommended)

```bash
# Set admin role via custom claims (most secure)
node scripts/set-admin-role.mjs --email=admin@example.com --method=claims

# Set admin role via Firestore document
node scripts/set-admin-role.mjs --email=admin@example.com --method=firestore

# Remove admin role
node scripts/set-admin-role.mjs --email=admin@example.com --remove
```

### Option 2: Manual Firebase Console

#### Custom Claims Method:

1. Go to Firebase Console > Authentication > Users
2. Find the user and click on their UID
3. Go to "Custom claims" tab
4. Add: `{ "admin": true }`
5. Save changes

#### Firestore Method:

1. Go to Firebase Console > Firestore Database
2. Create/update document in `users/{userId}` collection
3. Add field: `role: "admin"`

## Code Changes Made

### Updated Components:

- `src/hooks/useAuth.jsx` - Added admin role checking
- `src/components/layout/Header.jsx` - Added admin dashboard link
- `src/components/auth/ProtectedAdminRoute.jsx` - Uses new role system
- `src/components/admin/Admin.jsx` - Removed hardcoded email check
- `src/components/overlay/Mapper.jsx` - Removed hardcoded email check
- `src/components/overlay/Interview.jsx` - Removed hardcoded email check

### New Features:

- Admin dashboard link appears in header for admin users
- Secure role-based access control
- Fallback authentication methods
- Utility script for managing admin roles

## Security Benefits

1. **No Hardcoded Emails**: Admin access is not tied to specific email addresses
2. **Role-Based Access**: Easy to manage multiple admin users
3. **Firebase Security**: Leverages Firebase's built-in security features
4. **Audit Trail**: Changes to admin roles can be tracked
5. **Flexible**: Easy to add/remove admin privileges

## Migration from Old System

The old hardcoded email check (`avansardar@outlook.com`) has been replaced with the new role system. To migrate:

1. **Set up admin role** for existing admin users using the utility script
2. **Test admin access** to ensure everything works correctly
3. **Remove old hardcoded checks** (already completed in this update)

## Troubleshooting

### Admin Link Not Showing

- Ensure user has admin role set
- Check browser console for authentication errors
- Verify Firebase configuration

### Access Denied Errors

- Confirm admin role is properly set
- Check if using correct authentication method
- Verify user is signed in

### Role Changes Not Taking Effect

- **Custom Claims**: User must sign out and sign back in
- **Firestore**: Changes take effect on next authentication

## Best Practices

1. **Use Custom Claims** for production environments
2. **Regular Audits** of admin user list
3. **Principle of Least Privilege** - only grant admin access when needed
4. **Monitor Access** to admin areas
5. **Backup Admin Users** - ensure multiple users have admin access

## Future Enhancements

- Role hierarchy (super admin, regular admin, etc.)
- Time-based admin access
- Admin action logging
- Bulk admin role management
- Integration with external identity providers
```
