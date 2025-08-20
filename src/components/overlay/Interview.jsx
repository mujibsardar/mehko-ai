// Interview.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PDFPreviewPanel from "../applications/PDFPreviewPanel";

const API = "http://127.0.0.1:8000";

export function InterviewView({ app, form }) {
  const [overlay, setOverlay] = useState({ fields: [] });
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [currentFieldId, setCurrentFieldId] = useState(null);

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

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  if (!overlay.fields.length)
    return <div style={{ padding: 16 }}>No fields found for {form}.</div>;

  return (
    <div style={{ padding: 0, maxWidth: 900 }}>
      {/* PDF Preview Toggle Button */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginBottom: '16px',
        padding: '12px 0',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <button
          type="button"
          onClick={() => setIsPdfPreviewOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            color: '#475569',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#f1f5f9';
            e.target.style.borderColor = '#cbd5e1';
            e.target.style.color = '#334155';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#f8fafc';
            e.target.style.borderColor = '#e2e8f0';
            e.target.style.color = '#475569';
          }}
          title="Open PDF Preview"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10,9 9,9 8,9"></polyline>
          </svg>
          PDF Preview
        </button>
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        {group.map(([page, fields]) => (
          <fieldset
            key={page}
            style={{ border: "1px solid #eee", padding: 12 }}
          >
            <legend>Page {Number(page) + 1}</legend>
            <div style={{ display: "grid", gap: 8 }}>
              {fields.map((f) => (
                <div key={f.id} style={{ display: "grid", gap: 4 }}>
                  <label htmlFor={f.id} style={{ fontWeight: 600 }}>
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
                      style={{
                        padding: "8px 10px",
                        border: "1px solid #ccc",
                        borderRadius: 6,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </fieldset>
        ))}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="submit"
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: "#f7f7f7",
              cursor: "pointer",
            }}
          >
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
    </div>
  );
}

// Route wrapper (kept for direct navigation)
export default function Interview() {
  const { app, form } = useParams();
  return <InterviewView app={app} form={form} />;
}
