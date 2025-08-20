// Interview.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

const API = "http://127.0.0.1:8000";

export function InterviewView({ app, form }) {
  const [overlay, setOverlay] = useState({ fields: [] });
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);

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
                    />
                  ) : (
                    <input
                      id={f.id}
                      type="text"
                      value={values[f.id] ?? ""}
                      onChange={(e) => onChange(f.id, "text", e.target.value)}
                      placeholder={f.description || ""}
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
    </div>
  );
}

// Route wrapper (kept for direct navigation)
export default function Interview() {
  const { app, form } = useParams();
  return <InterviewView app={app} form={form} />;
}
