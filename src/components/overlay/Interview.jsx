import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

const API = "http://127.0.0.1:8081";

export default function Interview() {
  const { app, form } = useParams();
  const [overlay, setOverlay] = useState({ fields: [] });
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);

  // load template
  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await fetch(`${API}/apps/${app}/forms/${form}/template`);
      const tpl = await r.json();
      const fields = Array.isArray(tpl?.fields) ? tpl.fields : [];
      setOverlay({ fields });
      // init values
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
    if (!r.ok) {
      alert("Fill failed");
      return;
    }
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
    // simple per-page grouping for readability
    const g = new Map();
    for (const f of overlay.fields) {
      const p = f.page ?? 0;
      if (!g.has(p)) g.set(p, []);
      g.get(p).push(f);
    }
    return [...g.entries()].sort((a, b) => a[0] - b[0]);
  }, [overlay]);

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <div style={{ padding: 16, maxWidth: 900 }}>
      <h2 style={{ margin: "0 0 8px" }}>Interview</h2>
      <div style={{ color: "#666", marginBottom: 16 }}>
        <code>{app}</code> / <code>{form}</code>
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
          <a
            href={`/mapper/${app}/${form}`}
            style={{ alignSelf: "center", fontSize: 14 }}
          >
            Open Mapper
          </a>
        </div>
      </form>
    </div>
  );
}
