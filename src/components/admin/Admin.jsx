import React, { useState } from "react";
const API = "http://127.0.0.1:8081";

export default function Admin() {
  const [app, setApp] = useState("");
  const [form, setForm] = useState("");
  const [pdf, setPdf] = useState(null);
  const [log, setLog] = useState([]);

  const push = (m) => setLog((x) => [`• ${m}`, ...x]);

  async function createApp() {
    if (!app) return alert("Enter app id");
    const r = await fetch(`${API}/apps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app }),
    });
    const j = await r.json();
    if (!r.ok) return alert(j.detail || "Failed");
    push(`App created: ${j.app}`);
  }

  async function uploadPdf() {
    if (!app || !form || !pdf) return alert("Set app, form, and pick a PDF");
    const fd = new FormData();
    fd.append("file", pdf);
    const r = await fetch(`${API}/apps/${app}/forms/${form}/pdf`, {
      method: "POST",
      body: fd,
    });
    const j = await r.json();
    if (!r.ok) return alert(j.detail || "Upload failed");
    push(`PDF uploaded: ${j.path}`);
  }

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "20px auto",
        padding: 16,
        display: "grid",
        gap: 16,
      }}
    >
      <h2>Admin</h2>

      <section
        style={{ border: "1px solid #eee", padding: 12, borderRadius: 8 }}
      >
        <h3>Create App</h3>
        <input
          placeholder="app id (e.g., los_angeles_mehko)"
          value={app}
          onChange={(e) => setApp(e.target.value)}
        />
        <button onClick={createApp} style={{ marginLeft: 8 }}>
          Create
        </button>
      </section>

      <section
        style={{ border: "1px solid #eee", padding: 12, borderRadius: 8 }}
      >
        <h3>Create Form & Upload PDF</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            placeholder="form id (e.g., page1)"
            value={form}
            onChange={(e) => setForm(e.target.value)}
          />
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdf(e.target.files?.[0] || null)}
          />
          <button onClick={uploadPdf}>Upload PDF</button>
        </div>
        {app && form && (
          <div style={{ marginTop: 10, display: "flex", gap: 12 }}>
            <a href={`/mapper/${app}/${form}`}>Open Mapper</a>
            <a href={`/interview/${app}/${form}`}>Open Interview</a>
          </div>
        )}
      </section>

      <section
        style={{ border: "1px solid #eee", padding: 12, borderRadius: 8 }}
      >
        <h3>Logs</h3>
        <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
          {log.join("\n")}
        </pre>
      </section>
    </div>
  );
}
