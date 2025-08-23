import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { db } from "../../firebase/firebase";
import useAuth from "../../hooks/useAuth";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
} from "firebase/firestore";
import ReportsViewer from "./ReportsViewer";

const API = "/api"; // <-- prefix all backend calls

export default function Admin() {
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("apps"); // "apps" | "reports" | "bulk"

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

  // Bulk import state
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // PDF Download state
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState("");
  const [pdfDownloadAppId, setPdfDownloadAppId] = useState("");
  const [pdfDownloadFormId, setPdfDownloadFormId] = useState("");
  const [pdfDownloadStatus, setPdfDownloadStatus] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

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

  // ----------- Bulk Import Functions -----------
  const handleFileDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const jsonFiles = files.filter(
      (file) => file.type === "application/json" || file.name.endsWith(".json")
    );
    setBulkFiles((prev) => [...prev, ...jsonFiles]);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const jsonFiles = files.filter(
      (file) => file.type === "application/json" || file.name.endsWith(".json")
    );
    setBulkFiles((prev) => [...prev, ...jsonFiles]);
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
        const appData = preview.data;

        // Create backend folder structure
        const r = await fetch(`${API}/apps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app: appData.id,
            title: appData.title,
            description: appData.description || "",
            rootDomain: appData.rootDomain || "",
          }),
        });

        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.detail || `Backend failed for ${appData.id}`);
        }

        // Save to Firestore
        const ref = doc(db, "applications", appData.id);
        await setDoc(
          ref,
          {
            id: appData.id,
            title: appData.title,
            rootDomain: appData.rootDomain || "",
            description: appData.description || "",
            steps: appData.steps || [],
            supportTools: appData.supportTools || {
              aiEnabled: true,
              commentsEnabled: true,
            },
            // Preserve all other fields from the JSON
            ...appData,
          },
          { merge: true }
        );

        successCount++;
        setBulkStatus(`Processed ${successCount}/${bulkPreview.length}...`);
      } catch (error) {
        console.error(`Error processing ${preview.filename}:`, error);
        errorCount++;
      }
    }

    setIsProcessing(false);
    setBulkStatus(
      `✅ Import complete! ${successCount} successful, ${errorCount} failed`
    );

    // Refresh app list
    await loadApps();

    // Clear files after successful import
    if (successCount > 0) {
      setTimeout(() => {
        setBulkFiles([]);
        setBulkPreview([]);
        setBulkStatus("");
      }, 3000);
    }
  };

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

  // ----------- PDF Download Functions -----------
  const handlePdfDownload = async () => {
    if (!pdfDownloadUrl || !pdfDownloadAppId || !pdfDownloadFormId) {
      setPdfDownloadStatus("❌ Please fill in all fields");
      return;
    }

    setIsDownloadingPdf(true);
    setPdfDownloadStatus("Downloading PDF...");

    try {
      const response = await fetch("/api/download-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: pdfDownloadUrl,
          appId: pdfDownloadAppId,
          formId: pdfDownloadFormId,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || "Failed to download PDF");
      }

      const result = await response.json();
      setPdfDownloadStatus(
        `✅ PDF downloaded successfully to applications/${pdfDownloadAppId}/forms/${pdfDownloadFormId}/form.pdf`
      );

      // Clear form after successful download
      setTimeout(() => {
        setPdfDownloadUrl("");
        setPdfDownloadAppId("");
        setPdfDownloadFormId("");
        setPdfDownloadStatus("");
      }, 3000);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      setPdfDownloadStatus(`❌ Error: ${error.message}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

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
          <h3 style={{ margin: 0 }}>Admin Panel</h3>
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => setActiveTab("apps")}
            style={{
              width: "100%",
              padding: "8px 12px",
              marginBottom: "8px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              background: activeTab === "apps" ? "#eef2ff" : "#fff",
              color: activeTab === "apps" ? "#3730a3" : "#374151",
              cursor: "pointer",
            }}
          >
            Applications
          </button>
          <button
            onClick={() => setActiveTab("bulk")}
            style={{
              width: "100%",
              padding: "8px 12px",
              marginBottom: "8px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              background: activeTab === "bulk" ? "#eef2ff" : "#fff",
              color: activeTab === "bulk" ? "#3730a3" : "#374151",
              cursor: "pointer",
            }}
          >
            Bulk Import
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              background: activeTab === "reports" ? "#eef2ff" : "#fff",
              color: activeTab === "reports" ? "#3730a3" : "#374151",
              cursor: "pointer",
            }}
          >
            Issue Reports
          </button>
          <button
            onClick={() => setActiveTab("pdf-download")}
            style={{
              width: "100%",
              padding: "8px 12px",
              marginTop: "8px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              background: activeTab === "pdf-download" ? "#eef2ff" : "#fff",
              color: activeTab === "pdf-download" ? "#3730a3" : "#374151",
              cursor: "pointer",
            }}
          >
            PDF Download
          </button>
        </div>

        {activeTab === "apps" && (
          <>
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
          </>
        )}
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
          <h2 style={{ margin: 0, flex: 1 }}>
            {activeTab === "apps" && "Admin Dashboard"}
            {activeTab === "bulk" && "Bulk Import Applications"}
            {activeTab === "reports" && "Issue Reports"}
            {activeTab === "pdf-download" && "Download PDF Forms"}
          </h2>
          <Link to="/dashboard" style={{ fontSize: 13 }}>
            ← Back to Dashboard
          </Link>
          {activeTab === "apps" && status && (
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
          {activeTab === "bulk" && bulkStatus && (
            <div
              style={{
                marginLeft: 8,
                padding: "6px 10px",
                background: bulkStatus.includes("✅") ? "#ecfdf5" : "#fef3c7",
                border: bulkStatus.includes("✅")
                  ? "1px solid #a7f3d0"
                  : "1px solid #fde68a",
                borderRadius: 8,
                color: bulkStatus.includes("✅") ? "#065f46" : "#92400e",
                fontSize: 13,
              }}
            >
              {bulkStatus}
            </div>
          )}
          {activeTab === "pdf-download" && pdfDownloadStatus && (
            <div
              style={{
                marginLeft: 8,
                padding: "6px 10px",
                background: pdfDownloadStatus.includes("✅")
                  ? "#ecfdf5"
                  : "#fef3c7",
                border: pdfDownloadStatus.includes("✅")
                  ? "1px solid #a7f3d0"
                  : "1px solid #fde68a",
                borderRadius: 8,
                color: pdfDownloadStatus.includes("✅") ? "#065f46" : "#92400e",
                fontSize: 13,
              }}
            >
              {pdfDownloadStatus}
            </div>
          )}
        </div>

        {activeTab === "reports" ? (
          <ReportsViewer />
        ) : activeTab === "bulk" ? (
          <div style={{ maxWidth: 800 }}>
            {/* Bulk Import Instructions */}
            <section
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 16,
                marginTop: 12,
                background: "#f9fafb",
              }}
            >
              <h3 style={{ marginTop: 0, color: "#374151" }}>
                📋 Bulk Import Instructions
              </h3>
              <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.5 }}>
                <p>
                  Upload one or more JSON files to create new county
                  applications:
                </p>
                <ul style={{ margin: "8px 0", paddingLeft: 20 }}>
                  <li>
                    Each JSON should follow the{" "}
                    <code>county-template.json</code> structure
                  </li>
                  <li>Files will be validated before processing</li>
                  <li>
                    Applications will be created in both backend and Firestore
                  </li>
                  <li>Duplicate IDs will update existing applications</li>
                </ul>
                <p>
                  <strong>Tip:</strong> Use the template in{" "}
                  <code>data/county-template.json</code> as a starting point.
                </p>
              </div>
            </section>

            {/* File Upload Area */}
            <section
              style={{
                border: "2px dashed #d1d5db",
                borderRadius: 12,
                padding: 24,
                marginTop: 16,
                background: "#fafafa",
                textAlign: "center",
                transition: "all 0.2s",
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
              <h3 style={{ margin: "0 0 8px", color: "#374151" }}>
                Drop JSON files here
              </h3>
              <p style={{ margin: "0 0 16px", color: "#6b7280" }}>
                or click to select files
              </p>
              <input
                type="file"
                multiple
                accept=".json,application/json"
                onChange={handleFileSelect}
                style={{ display: "none" }}
                id="file-input"
              />
              <label
                htmlFor="file-input"
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  background: "#3b82f6",
                  color: "white",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Select Files
              </label>
            </section>

            {/* File List */}
            {bulkFiles.length > 0 && (
              <section
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 16,
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <h3 style={{ margin: 0 }}>
                    Selected Files ({bulkFiles.length})
                  </h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={previewFiles}
                      style={{
                        padding: "6px 12px",
                        background: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => {
                        setBulkFiles([]);
                        setBulkPreview([]);
                      }}
                      style={{
                        padding: "6px 12px",
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  {bulkFiles.map((file, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        background: "#f9fafb",
                      }}
                    >
                      <span style={{ fontSize: 14, color: "#374151" }}>
                        {file.name}
                      </span>
                      <button
                        onClick={() => removeFile(index)}
                        style={{
                          padding: "4px 8px",
                          background: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Preview Results */}
            {bulkPreview.length > 0 && (
              <section
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 16,
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <h3 style={{ margin: 0 }}>Preview Results</h3>
                  <button
                    onClick={processBulkImport}
                    disabled={
                      isProcessing ||
                      bulkPreview.filter((p) => p.valid).length === 0
                    }
                    style={{
                      padding: "8px 16px",
                      background:
                        isProcessing ||
                        bulkPreview.filter((p) => p.valid).length === 0
                          ? "#9ca3af"
                          : "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor:
                        isProcessing ||
                        bulkPreview.filter((p) => p.valid).length === 0
                          ? "not-allowed"
                          : "pointer",
                      fontSize: 14,
                    }}
                  >
                    {isProcessing
                      ? "Processing..."
                      : `Import ${
                          bulkPreview.filter((p) => p.valid).length
                        } Applications`}
                  </button>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  {bulkPreview.map((preview, index) => (
                    <div
                      key={index}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "12px",
                        background: preview.valid ? "#f0fdf4" : "#fef2f2",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontSize: 16 }}>
                          {preview.valid ? "✅" : "❌"}
                        </span>
                        <strong
                          style={{
                            color: preview.valid ? "#065f46" : "#dc2626",
                          }}
                        >
                          {preview.filename}
                        </strong>
                      </div>

                      {preview.valid ? (
                        <div style={{ fontSize: 13, color: "#374151" }}>
                          <div>
                            <strong>ID:</strong> {preview.data.id}
                          </div>
                          <div>
                            <strong>Title:</strong> {preview.data.title}
                          </div>
                          <div>
                            <strong>Domain:</strong>{" "}
                            {preview.data.rootDomain || "Not specified"}
                          </div>
                          <div>
                            <strong>Steps:</strong>{" "}
                            {preview.data.steps?.length || 0} steps
                          </div>
                          {preview.data.description && (
                            <div>
                              <strong>Description:</strong>{" "}
                              {preview.data.description.substring(0, 100)}...
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: "#dc2626" }}>
                          <strong>Error:</strong>{" "}
                          {preview.error || "Invalid JSON structure"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : activeTab === "pdf-download" ? (
          <div style={{ maxWidth: 600 }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>Download PDF Form</h3>
              <p>
                Enter the application ID and form ID to download a PDF, or load
                from an existing application.
              </p>
            </div>

            {/* Load from Application Section */}
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "16px",
                background: "#f9fafb",
              }}
            >
              <h4 style={{ marginTop: 0, marginBottom: "12px" }}>
                Load from Application
              </h4>
              <div style={{ display: "grid", gap: "8px" }}>
                <select
                  value={selectedAppId || ""}
                  onChange={(e) => {
                    const appId = e.target.value;
                    if (appId) {
                      const app = apps.find((a) => a.id === appId);
                      if (app) {
                        // Find PDF steps and populate fields
                        const pdfSteps =
                          app.steps?.filter((s) => s.type === "pdf") || [];
                        if (pdfSteps.length > 0) {
                          setPdfDownloadAppId(app.id);
                          setPdfDownloadFormId(pdfSteps[0].formId || "");
                          setPdfDownloadUrl(pdfSteps[0].pdfUrl || "");
                        }
                      }
                    }
                  }}
                  style={{
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #d1d5db",
                  }}
                >
                  <option value="">Select an application...</option>
                  {apps.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.title || app.id}
                    </option>
                  ))}
                </select>
                {selectedAppId && (
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>
                    Found{" "}
                    {apps
                      .find((a) => a.id === selectedAppId)
                      ?.steps?.filter((s) => s.type === "pdf").length || 0}{" "}
                    PDF forms
                  </div>
                )}

                {/* Show available PDF forms */}
                {selectedAppId && (
                  <div style={{ marginTop: "12px" }}>
                    <h5 style={{ margin: "8px 0", fontSize: "14px" }}>
                      Available PDF Forms:
                    </h5>
                    <div style={{ display: "grid", gap: "8px" }}>
                      {apps
                        .find((a) => a.id === selectedAppId)
                        ?.steps?.filter((s) => s.type === "pdf")
                        .map((step, index) => (
                          <div
                            key={index}
                            style={{
                              padding: "8px",
                              border: "1px solid #d1d5db",
                              borderRadius: "4px",
                              background: "#fff",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setPdfDownloadFormId(step.formId || "");
                              setPdfDownloadUrl(step.pdfUrl || "");
                            }}
                          >
                            <div
                              style={{ fontWeight: "600", fontSize: "13px" }}
                            >
                              {step.title}
                            </div>
                            <div style={{ fontSize: "12px", color: "#6b7280" }}>
                              Form ID: {step.formId}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#9ca3af",
                                wordBreak: "break-all",
                              }}
                            >
                              {step.pdfUrl}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <input
                type="text"
                placeholder="Application ID (e.g., alameda_county_mehko)"
                value={pdfDownloadAppId}
                onChange={(e) => setPdfDownloadAppId(e.target.value)}
                disabled={isDownloadingPdf}
              />
              <input
                type="text"
                placeholder="Form ID (e.g., ALAMEDA_MEHKO_SOP-English)"
                value={pdfDownloadFormId}
                onChange={(e) => setPdfDownloadFormId(e.target.value)}
                disabled={isDownloadingPdf}
              />
              <input
                type="url"
                placeholder="PDF URL (e.g., https://deh.acgov.org/operations-assets/docs/cottagefood/AA%20MEHKO%20App-SOP%201.23.2025.pdf)"
                value={pdfDownloadUrl}
                onChange={(e) => setPdfDownloadUrl(e.target.value)}
                disabled={isDownloadingPdf}
              />
              <button
                onClick={handlePdfDownload}
                disabled={
                  isDownloadingPdf ||
                  !pdfDownloadUrl ||
                  !pdfDownloadAppId ||
                  !pdfDownloadFormId
                }
                style={{
                  padding: "8px 16px",
                  background:
                    isDownloadingPdf ||
                    !pdfDownloadUrl ||
                    !pdfDownloadAppId ||
                    !pdfDownloadFormId
                      ? "#9ca3af"
                      : "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor:
                    isDownloadingPdf ||
                    !pdfDownloadUrl ||
                    !pdfDownloadAppId ||
                    !pdfDownloadFormId
                      ? "not-allowed"
                      : "pointer",
                  fontSize: 14,
                }}
              >
                {isDownloadingPdf ? "Downloading..." : "Download PDF"}
              </button>
              {pdfDownloadStatus && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "8px 12px",
                    background: pdfDownloadStatus.includes("✅")
                      ? "#ecfdf5"
                      : "#fef3c7",
                    border: pdfDownloadStatus.includes("✅")
                      ? "1px solid #a7f3d0"
                      : "1px solid #fde68a",
                    borderRadius: 8,
                    color: pdfDownloadStatus.includes("✅")
                      ? "#065f46"
                      : "#92400e",
                    fontSize: 13,
                  }}
                >
                  {pdfDownloadStatus}
                </div>
              )}
            </div>
            <div style={{ marginTop: 20 }}>
              <h4 style={{ marginTop: 0 }}>How to use:</h4>
              <ol style={{ paddingLeft: 20 }}>
                <li>
                  <strong>Application ID:</strong> The county identifier (e.g.,
                  "sonoma_county_mehko")
                </li>
                <li>
                  <strong>Form ID:</strong> The form identifier (e.g.,
                  "MEHKO_SOP-English")
                </li>
                <li>
                  <strong>PDF URL:</strong> Direct link to the PDF file
                </li>
                <li>
                  Click "Download PDF" to save it to{" "}
                  <code>
                    applications/{pdfDownloadAppId}/forms/{pdfDownloadFormId}
                    /form.pdf
                  </code>
                </li>
                <li>
                  Use the mapper tool to extract form fields from the downloaded
                  PDF
                </li>
              </ol>
            </div>
            <div style={{ marginTop: 20 }}>
              <h4 style={{ marginTop: 0 }}>Example:</h4>
              <div style={{ paddingLeft: 20 }}>
                <p>
                  <strong>Application ID:</strong> alameda_county_mehko
                </p>
                <p>
                  <strong>Form ID:</strong> ALAMEDA_MEHKO_SOP-English
                </p>
                <p>
                  <strong>PDF URL:</strong>{" "}
                  https://deh.acgov.org/operations-assets/docs/cottagefood/AA%20MEHKO%20App-SOP%201.23.2025.pdf
                </p>
                <p>
                  <strong>Result:</strong> PDF saved to{" "}
                  <code>
                    applications/alameda_county_mehko/forms/ALAMEDA_MEHKO_SOP-English/form.pdf
                  </code>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
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
                  placeholder="title (e.g., Orange County MEHKO)"
                  value={appTitle}
                  onChange={(e) => setAppTitle(e.target.value)}
                />
                <input
                  placeholder="root domain (e.g., ocgov.com)"
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
                              <span style={{ color: "#6b7280" }}>
                                ({s.type})
                              </span>
                            </strong>
                            <button
                              onClick={() => deleteStep(s.id)}
                              style={{
                                color: "#dc2626",
                                borderColor: "#fecaca",
                              }}
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
                              <Link
                                to={`/admin/interview/${appId}/${s.formId}`}
                              >
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
                      onChange={(e) =>
                        setNewPdfFile(e.target.files?.[0] || null)
                      }
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
                    style={{
                      alignSelf: "center",
                      fontSize: 13,
                      color: "#6b7280",
                    }}
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
          </>
        )}
      </main>
    </div>
  );
}
