// Interview.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import PDFPreviewPanel from "../applications/PDFPreviewPanel";
import useAuth from "../../hooks/useAuth";
import { useAuthModal } from "../../providers/AuthModalProvider";
import ReportButton from "../generic/ReportButton";
import ReportIssueModal from "../modals/ReportIssueModal";
import "./Interview.scss";

const API = "http://127.0.0.1:8000";

export function InterviewView({ app, form, application, step }) {
  const [overlay, setOverlay] = useState({ fields: [] });
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [currentFieldId, setCurrentFieldId] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const { openAuthModal } = useAuthModal();

  // Check if we're in admin context or user context
  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
    (async () => {
      setLoading(true);
      console.log("InterviewView fetching:", app, form); // debug
      const r = await fetch(`${API}/apps/${app}/forms/${form}/template`);
      const tpl = await r.json();
      console.log("template response:", tpl); // debug
      const fields = Array.isArray(tpl?.fields) ? tpl.fields : [];
      setOverlay({ fields });
      const init = {};
      for (const f of fields) init[f.id] = f.type === "checkbox" ? false : "";
      setValues(init);
      setLoading(false);
    })();
  }, [app, form]);

  function onChange(id, type, v) {
    setValues((prev) => ({ ...prev, [id]: type === "checkbox" ? !!v : v }));
  }

  const handleFieldFocus = (fieldId) => {
    setCurrentFieldId(fieldId);
  };

  const handleFieldBlur = () => {
    setCurrentFieldId(null);
  };

  async function onSubmit(e) {
    e.preventDefault();
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
      // Admin route - show admin access denied
      return (
        <div
          style={{
            padding: 24,
            textAlign: "center",
            maxWidth: 500,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "12px",
              padding: "24px",
              marginBottom: "24px",
            }}
          >
            <h3
              style={{
                color: "#dc2626",
                margin: "0 0 16px 0",
                fontSize: "20px",
              }}
            >
              🚫 Access Denied
            </h3>
            <p
              style={{
                color: "#7f1d1d",
                margin: "0 0 20px 0",
                lineHeight: "1.6",
              }}
            >
              Admin privileges required. Only authorized users can access this
              area.
            </p>
            <button
              onClick={() => {
                window.location.href = "/dashboard";
              }}
              style={{
                background: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                fontSize: "16px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Return to Dashboard
            </button>
          </div>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            This is an admin-only area for managing the <strong>{app}</strong>{" "}
            application.
          </p>
        </div>
      );
    } else {
      // User route - show authentication required message
      return (
        <div
          style={{
            padding: 24,
            textAlign: "center",
            maxWidth: 500,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "12px",
              padding: "24px",
              marginBottom: "24px",
            }}
          >
            <h3
              style={{
                color: "#dc2626",
                margin: "0 0 16px 0",
                fontSize: "20px",
              }}
            >
              🔒 Authentication Required
            </h3>
            <p
              style={{
                color: "#7f1d1d",
                margin: "0 0 20px 0",
                lineHeight: "1.6",
              }}
            >
              You need to be signed in to fill out this form. Please log in to
              continue with your application.
            </p>
            <button
              onClick={openAuthModal}
              style={{
                background: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                fontSize: "16px",
                cursor: "pointer",
                fontWeight: "500",
              }}
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
      <div
        style={{
          padding: 24,
          textAlign: "center",
          maxWidth: 500,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <h3
            style={{
              color: "#dc2626",
              margin: "0 0 16px 0",
              fontSize: "20px",
            }}
          >
            🚫 Access Denied
          </h3>
          <p
            style={{
              color: "#7f1d1d",
              margin: "0 0 20px 0",
              lineHeight: "1.6",
            }}
          >
            Admin privileges required. Only authorized users can access this
            area.
          </p>
          <button
            onClick={() => {
              window.location.href = "/dashboard";
            }}
            style={{
              background: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "12px 24px",
              fontSize: "16px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Return to Dashboard
          </button>
        </div>
        <p style={{ color: "#6b7280", fontSize: "14px" }}>
          This is an admin-only area for managing the <strong>{app}</strong>{" "}
          application.
        </p>
      </div>
    );
  }

  // Better "no fields" message
  if (!overlay.fields.length) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: "center",
          maxWidth: 600,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#f0f9ff",
            border: "1px solid #bae6fd",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <h3
            style={{
              color: "#0369a1",
              margin: "0 0 16px 0",
              fontSize: "20px",
            }}
          >
            📋 No Form Fields Available
          </h3>
          <p
            style={{
              color: "#0c4a6e",
              margin: "0 0 16px 0",
              lineHeight: "1.6",
            }}
          >
            This form doesn't have any fillable fields defined yet. This usually
            means:
          </p>
          <ul
            style={{
              textAlign: "left",
              color: "#0c4a6e",
              lineHeight: "1.6",
              margin: "0 0 20px 0",
              paddingLeft: "20px",
            }}
          >
            <li>The form is still being processed</li>
            <li>This is an informational document only</li>
            <li>Field extraction is in progress</li>
          </ul>
          <p
            style={{
              color: "#0c4a6e",
              margin: "0",
              fontSize: "14px",
            }}
          >
            <strong>What to do:</strong> Check back later or contact support if
            you need this form to be fillable.
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
      <div className="pdf-form-header">
        <div className="header-content">
          <h2>PDF Form: {form}</h2>
          <p>Fill out the form fields below to generate your completed PDF</p>
        </div>

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

      {/* PDF Preview Toggle Button */}
      <div className="pdf-preview-toggle">
        <button
          type="button"
          onClick={() => setIsPdfPreviewOpen(true)}
          className="preview-button"
          title="Open PDF Preview"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10,9 9,9 8,9"></polyline>
          </svg>
          PDF Preview
        </button>
      </div>

      <form onSubmit={onSubmit} className="pdf-form">
        {group.map(([page, fields]) => (
          <fieldset key={page} className="form-page">
            <legend className="page-legend">Page {Number(page) + 1}</legend>
            <div className="fields-container">
              {fields.map((f) => (
                <div key={f.id} className="form-field">
                  <label htmlFor={f.id} className="field-label">
                    {f.label || f.id}
                  </label>

                  {String(f.type || "text").toLowerCase() === "checkbox" ? (
                    <input
                      id={f.id}
                      type="checkbox"
                      checked={!!values[f.id]}
                      onChange={(e) =>
                        onChange(f.id, "checkbox", e.target.checked)
                      }
                      onFocus={() => handleFieldFocus(f.id)}
                      onBlur={handleFieldBlur}
                      className="checkbox-input"
                    />
                  ) : (
                    <input
                      id={f.id}
                      type="text"
                      value={values[f.id] ?? ""}
                      onChange={(e) => onChange(f.id, "text", e.target.value)}
                      placeholder={f.description || ""}
                      onFocus={() => handleFieldFocus(f.id)}
                      onBlur={handleFieldBlur}
                      className="text-input"
                    />
                  )}
                </div>
              ))}
            </div>
          </fieldset>
        ))}

        <div className="form-actions">
          <button type="submit" className="submit-button">
            Download Filled PDF
          </button>
        </div>
      </form>

      {/* PDF Preview Panel */}
      <PDFPreviewPanel
        isOpen={isPdfPreviewOpen}
        onClose={() => setIsPdfPreviewOpen(false)}
        currentFieldId={currentFieldId}
        formId={form}
        appId={app}
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
