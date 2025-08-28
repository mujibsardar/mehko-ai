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
            </button>
          </div>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            This form is part of the <strong>{app}</strong> application process.
          </p>
        </div>
      );
    }
  }

  // Check if user is admin for admin routes
  if (isAdminRoute && !isAdmin) {
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
  }

  // Better "no fields" message
  if (!overlay.fields.length) {
    return (
      <div style={{ padding: 24, textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ color: "#0369a1", margin: "0 0 16px 0", fontSize: "20px" }}>📋 No Form Fields Available</h3>
          <p style={{ color: "#0c4a6e", margin: "0 0 16px 0", lineHeight: "1.6" }}>
            This form doesn't have any fillable fields defined yet. This could mean:
          </p>
          <ul style={{ textAlign: "left", color: "#0c4a6e", lineHeight: "1.6", margin: "0 0 20px 0", paddingLeft: "20px" }}>
            <li>The PDF is a static document without fillable fields</li>
            <li>No field mapping has been created yet</li>
            <li>This is an informational document only</li>
            <li>The form needs to be processed by an admin first</li>
          </ul>
          <p style={{ color: "#0c4a6e", margin: "0", fontSize: "14px" }}>
            <strong>What to do:</strong> Contact an administrator to set up field mapping or use AI detection to extract fields from the PDF.
          </p>
        </div>
        <p style={{ color: "#6b7280", fontSize: "14px" }}>
          Form: <strong>{form}</strong> | Application: <strong>{app}</strong>
        </p>
      </div>
    );
  }

  return (
    <div className="pdf-form-container">
      {/* Step Header with Report Issue Button */}
      <div className="step-header">
        <div className="header-content">
          <h2>{step?.title || `Form: ${form.replace(/_/g, " ").replace(/.pdf$/i, "")}`}</h2>
          <p>Fill out the form fields directly on the PDF below</p>
        </div>
        {user && (
          <ReportButton onClick={handleReportClick} size="small" variant="subtle">
            Report Issue
          </ReportButton>
        )}
      </div>

      {/* Use AcroFormViewer for modern form filling experience */}
      <AcroFormViewer
        app={app}
        form={form}
        application={application}
        step={step}
        initialFormData={values}
        onFormDataChange={(newFormData) => {
          setValues(newFormData);
          scheduleAutoSave();
        }}
      />

      {/* Report Issue Modal */}
      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        application={application}
        step={step}
        onReportSubmitted={handleReportSubmitted}
      />

      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        application={application}
        step={step}
        onReportSubmitted={handleReportSubmitted}
      />
    </div>
  );
}

// Route wrapper (kept for direct navigation)
export default function Interview() {
  const { app, form } = useParams();
  return <InterviewView app={app} form={form} />;
}
