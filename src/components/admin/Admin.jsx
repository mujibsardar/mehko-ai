import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../../firebase/firebase";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
} from "firebase/firestore";

const API = "/api"; // <-- prefix all backend calls

export default function Admin() {
  // App list + selection
  const [apps, setApps] = useState([]); // [{id, title, rootDomain, description, steps:[]}]
  const [selectedAppId, setSelectedAppId] = useState(""); // active app id
  const selectedApp = useMemo(
    () => apps.find((a) => a.id === selectedAppId) || null,
    [apps, selectedAppId]
  );

  // App form (prefilled when selecting)
  const [appId, setAppId] = useState("");
  const [appTitle, setAppTitle] = useState("");
  const [rootDomain, setRootDomain] = useState("");
  const [description, setDescription] = useState("");

  // Existing steps for selected app (read-only until you edit/delete)
  const [steps, setSteps] = useState([]);

  // New step queue (add multiple, then Save)
  const [newType, setNewType] = useState("info"); // info | form | pdf
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newFormName, setNewFormName] = useState(""); // for 'form'
  const [newFormId, setNewFormId] = useState(""); // for 'pdf'
  const [newPdfFile, setNewPdfFile] = useState(null); // for 'pdf'
  const [queuedSteps, setQueuedSteps] = useState([]); // [{...step, _file?: File}]

  // UI feedback
  const [status, setStatus] = useState(""); // short inline status banner

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

  // ----------- App create/update -----------
  async function saveAppMeta() {
    if (!appId) return alert("App id required");
    // ensure backend folder
    const r = await fetch(`${API}/apps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app: appId,
        title: appTitle,
        description,
        rootDomain,
      }),
    });
    let j = {};
    try {
      j = await r.json();
    } catch {}
    if (!r.ok) return alert(j.detail || "Backend /api/apps failed");

    const ref = doc(db, "applications", appId);
    const snap = await getDoc(ref);
    const payload = {
      id: appId,
      title:
        appTitle ||
        appId.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
      rootDomain: rootDomain || "",
      description: description || "",
      steps: snap.exists() ? snap.data().steps || [] : [],
    };
    await setDoc(ref, payload, { merge: true });
    await loadApps();
    setSelectedAppId(appId);
    pushStatus("✅ App saved");
  }

  // ----------- Step queue + save -----------
  function addStepToQueue() {
    if (!appId) return alert("Select or create an app first");
    if (!newTitle) return alert("Step title is required");

    const base = {
      id: `${Date.now()}_${newType}`,
      title: newTitle,
      type: newType,
      content: newContent || "",
      appId, // harmless extra context
    };

    if (newType === "form") {
      if (!newFormName) return alert("formName is required for a form step");
      setQueuedSteps((q) => [...q, { ...base, formName: newFormName }]);
    } else if (newType === "pdf") {
      if (!newFormId) return alert("formId is required for a PDF step");
      if (!newPdfFile) return alert("Select a PDF file to upload");
      setQueuedSteps((q) => [
        ...q,
        { ...base, formId: newFormId, _file: newPdfFile },
      ]);
    } else {
      setQueuedSteps((q) => [...q, base]); // info
    }

    // reset inputs (keep type)
    setNewTitle("");
    setNewContent("");
    setNewFormName("");
    setNewFormId("");
    setNewPdfFile(null);
    pushStatus("✅ Step queued");
  }

  function removeQueued(i) {
    setQueuedSteps((q) => q.filter((_, idx) => idx !== i));
  }

  async function saveQueuedSteps() {
    if (!appId) return alert("App id required");
    if (queuedSteps.length === 0) return pushStatus("No steps queued");

    // 1) For PDF steps, upload files first
    for (let i = 0; i < queuedSteps.length; i++) {
      const s = queuedSteps[i];
      if (s.type === "pdf" && s._file) {
        const fd = new FormData();
        fd.append("file", s._file);
        const r = await fetch(`${API}/apps/${appId}/forms/${s.formId}/pdf`, {
          method: "POST",
          body: fd,
        });
        let j = {};
        try {
          j = await r.json();
        } catch {}
        if (!r.ok)
          return alert(j.detail || `PDF upload failed for ${s.formId}`);
      }
    }

    // 2) Merge into Firestore (keep order)
    const ref = doc(db, "applications", appId);
    const snap = await getDoc(ref);
    const existing =
      snap.exists() && Array.isArray(snap.data().steps)
        ? snap.data().steps
        : [];

    // strip client-only _file and append
    const cleaned = queuedSteps.map(({ _file, ...rest }) => rest);
    const merged = [...existing, ...cleaned];

    await updateDoc(ref, { steps: merged });
    await loadApps();
    setQueuedSteps([]);
    // refresh steps panel
    const updated = (await getDoc(ref)).data();
    setSteps(updated.steps || []);
    pushStatus("✅ Steps saved");
  }

  // ----------- Edit/Delete existing steps -----------
  async function deleteStep(stepId) {
    if (!appId) return alert("App id required");
    if (!window.confirm("Delete this step?")) return;
    const ref = doc(db, "applications", appId);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? snap.data().steps || [] : [];
    const filtered = existing.filter((s) => s.id !== stepId);
    await updateDoc(ref, { steps: filtered });
    setSteps(filtered);
    await loadApps();
    pushStatus("🗑️ Step deleted");
  }

  // ----------- UI -----------
  return (
    <div style={{ display: "flex", height: "100vh", minHeight: 600 }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 280,
          borderRight: "1px solid #eee",
          overflowY: "auto",
          padding: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 style={{ margin: 0 }}>Applications</h3>
          <button
            onClick={loadApps}
            title="Refresh"
            style={{ marginLeft: "auto" }}
          >
            ⟳
          </button>
        </div>

        <div style={{ marginTop: 8 }}>
          <button onClick={newApp} style={{ width: "100%" }}>
            + New Application
          </button>
        </div>

        <ul style={{ listStyle: "none", padding: 0, marginTop: 12 }}>
          {apps.map((a) => (
            <li key={a.id} style={{ marginBottom: 6 }}>
              <button
                onClick={() => selectApp(a.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 8px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  background: selectedAppId === a.id ? "#eef2ff" : "#fff",
                }}
              >
                <div style={{ fontWeight: 600 }}>{a.title || a.id}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{a.id}</div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main panel */}
      <main style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 5,
            paddingBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <h2 style={{ margin: 0, flex: 1 }}>Admin Dashboard</h2>
          <Link to="/dashboard" style={{ fontSize: 13 }}>
            ← Back to Dashboard
          </Link>
          {status && (
            <div
              style={{
                marginLeft: 8,
                padding: "6px 10px",
                background: "#ecfeff",
                border: "1px solid #a5f3fc",
                borderRadius: 8,
                color: "#155e75",
                fontSize: 13,
              }}
            >
              {status}
            </div>
          )}
        </div>

        {/* App form */}
        <section
          style={{
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 12,
            marginTop: 12,
            background: "#fff",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Application</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <input
              placeholder="app id (e.g., san_diego_mehko)"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
            />
            <input
              placeholder="title (e.g., San Diego MEHKO)"
              value={appTitle}
              onChange={(e) => setAppTitle(e.target.value)}
            />
            <input
              placeholder="root domain (e.g., sandiegocounty.gov)"
              value={rootDomain}
              onChange={(e) => setRootDomain(e.target.value)}
            />
            <textarea
              placeholder="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveAppMeta}>Save App</button>
              {/* Removed old "Mapper (example)" link */}
            </div>
          </div>
        </section>

        {/* Steps list */}
        {selectedApp && (
          <section
            style={{
              border: "1px solid #eee",
              borderRadius: 12,
              padding: 12,
              marginTop: 12,
              background: "#fff",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Existing Steps</h3>
            {steps.length === 0 ? (
              <p style={{ color: "#6b7280" }}>No steps yet.</p>
            ) : (
              <ol style={{ paddingLeft: 18 }}>
                {steps.map((s, i) => (
                  <li key={s.id} style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        padding: 8,
                        background: "#fafafa",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <strong style={{ flex: 1 }}>
                          {i + 1}. {s.title}{" "}
                          <span style={{ color: "#6b7280" }}>({s.type})</span>
                        </strong>
                        <button
                          onClick={() => deleteStep(s.id)}
                          style={{ color: "#dc2626", borderColor: "#fecaca" }}
                          title="Delete step"
                        >
                          Delete
                        </button>
                      </div>

                      {s.type === "pdf" && (
                        <div style={{ fontSize: 13, color: "#374151" }}>
                          formId: <code>{s.formId}</code> |{" "}
                          <Link to={`/admin/mapper/${appId}/${s.formId}`}>
                            Mapper
                          </Link>{" "}
                          |{" "}
                          <Link to={`/admin/interview/${appId}/${s.formId}`}>
                            Interview
                          </Link>
                        </div>
                      )}
                      {s.type === "form" && (
                        <div style={{ fontSize: 13, color: "#374151" }}>
                          formName: <code>{s.formName}</code>
                        </div>
                      )}
                      {s.content && (
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 13,
                            color: "#6b7280",
                          }}
                        >
                          {s.content}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {/* Add steps (queue) */}
        <section
          style={{
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 12,
            marginTop: 12,
            background: "#fff",
            marginBottom: 24,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Add Steps</h3>
          <div style={{ display: "grid", gap: 8, alignItems: "start" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              >
                <option value="info">Info</option>
                <option value="form">Form</option>
                <option value="pdf">PDF</option>
              </select>
              <input
                placeholder="step title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <textarea
              placeholder="step description / content (optional for form/pdf)"
              rows={2}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              style={{ resize: "vertical" }}
            />

            {newType === "form" && (
              <input
                placeholder="formName (e.g., MEHKO_SOP-English.pdf)"
                value={newFormName}
                onChange={(e) => setNewFormName(e.target.value)}
              />
            )}

            {newType === "pdf" && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  placeholder="formId (e.g., MEHKO_SOP-English)"
                  value={newFormId}
                  onChange={(e) => setNewFormId(e.target.value)}
                />
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setNewPdfFile(e.target.files?.[0] || null)}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={addStepToQueue}>+ Add to Queue</button>
              <button
                onClick={saveQueuedSteps}
                disabled={!appId || queuedSteps.length === 0}
              >
                Save Queued Steps
              </button>
              <div
                style={{ alignSelf: "center", fontSize: 13, color: "#6b7280" }}
              >
                {queuedSteps.length} queued
              </div>
            </div>

            {queuedSteps.length > 0 && (
              <div
                style={{
                  marginTop: 8,
                  border: "1px dashed #e5e7eb",
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                <strong>Queued</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {queuedSteps.map((q, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>
                      {q.title} <em>({q.type})</em>
                      {q.type === "pdf" && (
                        <>
                          {" "}
                          — formId: <code>{q.formId}</code>
                        </>
                      )}
                      {q.type === "form" && (
                        <>
                          {" "}
                          — formName: <code>{q.formName}</code>
                        </>
                      )}
                      <button
                        onClick={() => removeQueued(i)}
                        style={{ marginLeft: 8, fontSize: 12 }}
                        title="Remove from queue"
                      >
                        remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
