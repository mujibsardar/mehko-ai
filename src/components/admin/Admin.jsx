import React, { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import {
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
} from "firebase/firestore";

const API = "http://127.0.0.1:8081";

export default function Admin() {
  const [appsList, setAppsList] = useState([]);
  const [app, setApp] = useState("");
  const [rootDomain, setRootDomain] = useState("");
  const [description, setDescription] = useState("");
  const [stepType, setStepType] = useState("info"); // info | form | pdf
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [pdf, setPdf] = useState(null);
  const [stepTitle, setStepTitle] = useState("");
  const [stepContent, setStepContent] = useState("");
  const [log, setLog] = useState([]);

  const push = (m) => setLog((x) => [`• ${m}`, ...x]);

  // load apps from Firestore
  async function loadApps() {
    const snap = await getDocs(collection(db, "applications"));
    const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setAppsList(arr);
  }

  useEffect(() => {
    loadApps();
  }, []);

  // create or update app
  async function createApp() {
    if (!app) return alert("Enter app id");

    // backend
    const r = await fetch(`${API}/apps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app }),
    });
    const j = await r.json();
    if (!r.ok) return alert(j.detail || "Backend failed");

    // Firestore
    const ref = doc(db, "applications", app);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        id: app,
        rootDomain: rootDomain || "",
        description: description || "",
        steps: [],
      });
      push(`Firestore doc created: ${app}`);
    } else {
      await updateDoc(ref, {
        rootDomain: rootDomain || "",
        description: description || "",
      });
      push(`Firestore doc updated: ${app}`);
    }
    push(`Backend app created: ${j.app}`);
    await loadApps();
  }

  // delete app
  async function deleteApp(appId) {
    if (!window.confirm(`Delete app ${appId}?`)) return;
    await deleteDoc(doc(db, "applications", appId));
    push(`Deleted Firestore doc: ${appId}`);
    await loadApps();
  }

  // add step (handles info, form, pdf)
  async function addStep() {
    if (!app) return alert("Set app id first");
    if (!stepTitle) return alert("Enter step title");

    const ref = doc(db, "applications", app);

    let step = {
      id: `${Date.now()}_${stepType}`,
      title: stepTitle,
      type: stepType,
      appId: app,
      content: stepContent,
    };

    if (stepType === "form") {
      if (!formName) return alert("Enter formName");
      step = { ...step, formName };
    }

    if (stepType === "pdf") {
      if (!formId || !pdf) return alert("Enter formId and select a PDF");

      // backend upload
      const fd = new FormData();
      fd.append("file", pdf);
      const r = await fetch(`${API}/apps/${app}/forms/${formId}/pdf`, {
        method: "POST",
        body: fd,
      });
      const j = await r.json();
      if (!r.ok) return alert(j.detail || "Upload failed");
      push(`PDF uploaded: ${j.path}`);

      step = { ...step, formId };
    }

    await updateDoc(ref, { steps: arrayUnion(step) });
    push(`Step added: ${step.title} (${step.type})`);
    await loadApps();
  }

  return (
    <div style={{ maxWidth: 1000, margin: "20px auto", padding: 16 }}>
      <h2>Admin Dashboard</h2>

      {/* Create App */}
      <section
        style={{ border: "1px solid #eee", padding: 12, borderRadius: 8 }}
      >
        <h3>Create / Update App</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <input
            placeholder="app id"
            value={app}
            onChange={(e) => setApp(e.target.value)}
          />
          <input
            placeholder="root domain"
            value={rootDomain}
            onChange={(e) => setRootDomain(e.target.value)}
          />
          <textarea
            placeholder="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
          <button onClick={createApp}>Create / Update</button>
        </div>
      </section>

      {/* Add Step */}
      <section
        style={{ border: "1px solid #eee", padding: 12, borderRadius: 8 }}
      >
        <h3>Add Step to {app || "..."}</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <select
            value={stepType}
            onChange={(e) => setStepType(e.target.value)}
          >
            <option value="info">Info Step</option>
            <option value="form">Form Step</option>
            <option value="pdf">PDF Step</option>
          </select>
          <input
            placeholder="step title"
            value={stepTitle}
            onChange={(e) => setStepTitle(e.target.value)}
          />
          <textarea
            placeholder="step content / description"
            value={stepContent}
            onChange={(e) => setStepContent(e.target.value)}
            rows={2}
          />
          {stepType === "form" && (
            <input
              placeholder="formName (e.g., MEHKO_SOP-English.pdf)"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          )}
          {stepType === "pdf" && (
            <>
              <input
                placeholder="formId (e.g., page1)"
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
              />
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdf(e.target.files?.[0] || null)}
              />
            </>
          )}
          <button onClick={addStep}>Add Step</button>
        </div>
      </section>

      {/* Existing Apps */}
      <section
        style={{ border: "1px solid #eee", padding: 12, borderRadius: 8 }}
      >
        <h3>Existing Apps</h3>
        {appsList.length === 0 && <p>No apps found.</p>}
        <ul>
          {appsList.map((a) => (
            <li key={a.id} style={{ marginBottom: 12 }}>
              <strong>{a.id}</strong> — {a.description || "(no description)"}
              <button
                style={{ marginLeft: 8, color: "red" }}
                onClick={() => deleteApp(a.id)}
              >
                Delete
              </button>
              <ul>
                {a.steps?.map((s) => (
                  <li key={s.id}>
                    {s.title} <em>({s.type})</em>
                    {s.type === "pdf" && (
                      <>
                        {" "}
                        <a href={`/mapper/${a.id}/${s.formId}`}>
                          Mapper
                        </a> |{" "}
                        <a href={`/interview/${a.id}/${s.formId}`}>Interview</a>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      {/* Logs */}
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
