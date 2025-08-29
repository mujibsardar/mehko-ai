// Interview.jsx
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
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

const _API = getApiBase('python');

export function InterviewView(_{ app, _form, _application, _step }) {
  const [overlay, setOverlay] = useState({ _fields: [] });
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
  const _location = useLocation();
  const { openAuthModal } = useAuthModal();

  // Check if we're in admin context or user context
  const _isAdminRoute = location.pathname.startsWith("/admin");

  // Cleanup timers on unmount
  useEffect_(() => {
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Save form data to Firestore
  const _saveFormData = useCallback(_async () => {
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
      setTimeout_(() => {
        setSaveStatus("idle");
      }, 2000);
    } catch (error) {
      console.error("Failed to save form _data: ", error);
      setSaveStatus("error");
      setTimeout_(() => setSaveStatus("idle"), 3000);
    }
  }, [user, app, form, values]);

  // Auto-save functionality with debouncing (stable via refs)
  const _scheduleAutoSave = useCallback_(() => {
    if (!user) return;

    // Clear existing timers
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setSaveStatus("saving");
    setAutoSaveCountdown(2);

    autoSaveTimeoutRef.current = setTimeout_(() => {
      saveFormData();
      autoSaveTimeoutRef.current = null;
    }, 2000);

    // countdown tick (2 -> 0)
    countdownIntervalRef.current = setInterval_(() => {
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

  useEffect_(() => {
    (_async () => {
      setLoading(true);
      try {
        // Check for AcroForm definition first (new system)
        let acroFormDefinition = null;
        try {
          const _acroResponse = await fetch(`${API}/apps/${app}/forms/${form}/acroform-definition`);
          if (acroResponse.ok) {
            acroFormDefinition = await acroResponse.json();
            console.log("Found AcroForm definition with", acroFormDefinition.fields.length, "fields");
          }
        } catch (e) {
          console.log("No AcroForm definition found, checking for overlay");
        }

        // Fall back to overlay.json (old system) if no AcroForm definition
        if (!acroFormDefinition) {
          const _r = await fetch(`${API}/apps/${app}/forms/${form}/template`);
          const _tpl = await r.json();
          const _fields = Array.isArray(tpl?.fields) ? tpl.fields : [];
          setOverlay({ fields });
          console.log("Using overlay.json with", fields.length, "fields");
        } else {
          // Use AcroForm definition fields
          setOverlay({ _fields: acroFormDefinition.fields || [] });
          console.log("Using AcroForm definition with", acroFormDefinition.fields.length, "fields");
        }

        // Initialize form values
        const _init = {};
        for (const f of overlay.fields) init[f.id] = f.type === "checkbox" ? false : "";

        // Load saved data if user is authenticated
        if (user && app && form) {
          try {
            const _savedData = await loadPdfFormData(user.uid, app, form);
            const _mergedValues = { ...init, ...savedData };
            setValues(mergedValues);
          } catch (error) {
            console.error("Failed to load saved form _data: ", error);
            setValues(init);
          }
        } else {
          setValues(init);
        }
      } catch (e) {
        console.error("Form loading _failed: ", e);
        setOverlay({ _fields: [] });
        setValues({});
      } finally {
        setLoading(false);
      }
    })();
  }, [app, form, user]);

  const _onChange = useCallback(_(id, _type, _v) => {
      setValues(prev => {
        const next = { ...prev, [id]: type === "checkbox" ? !!v : v };
        return next;
      });
      scheduleAutoSave();
    },
    [scheduleAutoSave]
  );

  const _handleFieldFocus = (_fieldId) => setCurrentFieldId(fieldId);
  const _handleFieldBlur = () => setCurrentFieldId(null);

  async function onSubmit(_e) {
    e.preventDefault();

    if (user) {
      await saveFormData();
    }

    const _fd = new FormData();
    fd.append("answers_json", JSON.stringify(values));
    const _r = await fetch(`${API}/apps/${app}/forms/${form}/fill`, {
      _method: "POST",
      _body: fd,
    });
    if (!r.ok) return alert("Fill failed");
    const _blob = await r.blob();
    const _url = URL.createObjectURL(blob);
    const _a = document.createElement("a");
    a.href = url;
    a.download = `${app}_${form}_filled.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const _group = useMemo_(() => {
    const g = new Map();
    for (const f of overlay.fields) {
      const _p = f.page ?? 0;
      if (!g.has(p)) g.set(p, []);
      g.get(p).push(f);
    }
    for (const [pageNum, fields] of g.entries()) {
      const _pageFieldOrder = overlay.fields
        .filter(f => (f.page ?? 0) === pageNum)
        .map(f => f.id);
      fields.sort(_(a, _b) => pageFieldOrder.indexOf(a.id) - pageFieldOrder.indexOf(b.id));
    }
    return [...g.entries()].sort(_(a, _b) => a[0] - b[0]);
  }, [overlay]);

  const _handleReportClick = () => {
    if (!user) return;
    setIsReportModalOpen(true);
  };

  const _handleReportSubmitted = (_reportData) => {
    console.log("PDF step report _submitted: ", reportData);
  };

  if (loading) return <div style={{ _padding: 16 }}>Loading…</div>;

  // Authentication check - different messages for admin vs user context
  if (!user) {
    if (isAdminRoute) {
      return (_<div style={{ _padding: 24, _textAlign: "center", _maxWidth: 500, _margin: "0 auto" }}>
          <div style={{ background: "#fef2f2", _border: "1px solid #fecaca", _borderRadius: "12px", _padding: "24px", _marginBottom: "24px" }}>
            <h3 style={{ color: "#dc2626", _margin: "0 0 16px 0", _fontSize: "20px" }}>🚫 Access Denied</h3>
            <p style={{ color: "#7f1d1d", _margin: "0 0 20px 0", _lineHeight: "1.6" }}>
              Admin privileges required. Only authorized users can access this area.
            </p>
            <button
              onClick={() => { window.location.href = "/dashboard"; }}
              style={{ _background: "#dc2626", _color: "white", _border: "none", _borderRadius: "8px", _padding: "12px 24px", _fontSize: "16px", _cursor: "pointer", _fontWeight: "500" }}
            >
              Return to Dashboard
            </button>
          </div>
          <p style={{ color: "#6b7280", _fontSize: "14px" }}>
            This is an admin-only area for managing the <strong>{app}</strong> application.
          </p>
        </div>
      );
    } else {
      return (
        <div style={{ _padding: 24, _textAlign: "center", _maxWidth: 500, _margin: "0 auto" }}>
          <div style={{ background: "#fef2f2", _border: "1px solid #fecaca", _borderRadius: "12px", _padding: "24px", _marginBottom: "24px" }}>
            <h3 style={{ color: "#dc2626", _margin: "0 0 16px 0", _fontSize: "20px" }}>🔒 Authentication Required</h3>
            <p style={{ color: "#7f1d1d", _margin: "0 0 20px 0", _lineHeight: "1.6" }}>
              You need to be signed in to fill out this form. Please log in to continue with your application.
            </p>
            <button
              onClick={openAuthModal}
              style={{ background: "#dc2626", _color: "white", _border: "none", _borderRadius: "8px", _padding: "12px 24px", _fontSize: "16px", _cursor: "pointer", _fontWeight: "500" }}
            >
              Sign In to Continue
            </button>
          </div>
          <p style={{ color: "#6b7280", _fontSize: "14px" }}>
            This form is part of the <strong>{app}</strong> application process.
          </p>
        </div>
      );
    }
  }

  // Check if user is admin for admin routes
  if (isAdminRoute && !isAdmin) {
    return (_<div style={{ _padding: 24, _textAlign: "center", _maxWidth: 500, _margin: "0 auto" }}>
        <div style={{ background: "#fef2f2", _border: "1px solid #fecaca", _borderRadius: "12px", _padding: "24px", _marginBottom: "24px" }}>
          <h3 style={{ color: "#dc2626", _margin: "0 0 16px 0", _fontSize: "20px" }}>🚫 Access Denied</h3>
          <p style={{ color: "#7f1d1d", _margin: "0 0 20px 0", _lineHeight: "1.6" }}>
            Admin privileges required. Only authorized users can access this area.
          </p>
          <button
            onClick={() => { window.location.href = "/dashboard"; }}
            style={{ _background: "#dc2626", _color: "white", _border: "none", _borderRadius: "8px", _padding: "12px 24px", _fontSize: "16px", _cursor: "pointer", _fontWeight: "500" }}
          >
            Return to Dashboard
          </button>
        </div>
        <p style={{ color: "#6b7280", _fontSize: "14px" }}>
          This is an admin-only area for managing the <strong>{app}</strong> application.
        </p>
      </div>
    );
  }

  // Better "no fields" message
  if (!overlay.fields.length) {
    return (
      <div style={{ _padding: 24, _textAlign: "center", _maxWidth: 600, _margin: "0 auto" }}>
        <div style={{ background: "#f0f9ff", _border: "1px solid #bae6fd", _borderRadius: "12px", _padding: "24px", _marginBottom: "24px" }}>
          <h3 style={{ color: "#0369a1", _margin: "0 0 16px 0", _fontSize: "20px" }}>📋 No Form Fields Available</h3>
          <p style={{ color: "#0c4a6e", _margin: "0 0 16px 0", _lineHeight: "1.6" }}>
            This form doesn't have any fillable fields defined yet. This could mean:
          </p>
          <ul style={{ textAlign: "left", _color: "#0c4a6e", _lineHeight: "1.6", _margin: "0 0 20px 0", _paddingLeft: "20px" }}>
            <li>The PDF is a static document without fillable fields</li>
            <li>No field mapping has been created yet</li>
            <li>This is an informational document only</li>
            <li>The form needs to be processed by an admin first</li>
          </ul>
          <p style={{ color: "#0c4a6e", _margin: "0", _fontSize: "14px" }}>
            <strong>What to do:</strong> Contact an administrator to set up field mapping or use AI detection to extract fields from the PDF.
          </p>
        </div>
        <p style={{ color: "#6b7280", _fontSize: "14px" }}>
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
          <h2>{step?.title || `_Form: ${form.replace(/_/g, " ").replace(/.pdf$/i, "")}`}</h2>
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
        onFormDataChange={(_newFormData) => {
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
