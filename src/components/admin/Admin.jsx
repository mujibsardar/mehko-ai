import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { db } from "../../firebase/firebase";
import useAuth from "../../hooks/useAuth";
import {
  doc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
} from "firebase/firestore";
import ReportsViewer from "./ReportsViewer";
import "./Admin.scss";
const API = "/api/apps";
export default function Admin() {
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("apps"); // "apps" | "reports" | "import"
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
  const [apps, setApps] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [showNewAppForm, setShowNewAppForm] = useState(false);
  const selectedApp = apps.find((a) => a.id === selectedAppId) || null;
  // App form (prefilled when selecting)
  const [appId, setAppId] = useState("");
  const [appTitle, setAppTitle] = useState("");
  const [rootDomain, setRootDomain] = useState("");
  const [description, setDescription] = useState("");
  // Existing steps for selected app
  const [steps, setSteps] = useState([]);
  // New step queue (add multiple, then Save)
  const [newType, setNewType] = useState("info");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newFormName, setNewFormName] = useState("");
  const [newFormId, setNewFormId] = useState("");
  const [newPdfFile, setNewPdfFile] = useState(null);
  const [queuedSteps, setQueuedSteps] = useState([]);
  // Bulk import state
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  // AcroForm conversion state
  const [isConverting, setIsConverting] = useState(false);
  const [conversionStatus, setConversionStatus] = useState(null);
  // UI feedback
  const [status, setStatus] = useState("");
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
    setShowNewAppForm(false);
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
    setShowNewAppForm(true);
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
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const jsonFiles = files.filter(
      (file) => file.type === "application/json" || file.name.endsWith(".json")
    );
    if (jsonFiles.length > 0) {
      setBulkFiles((prev) => [...prev, ...jsonFiles]);
      pushStatus(`Added ${jsonFiles.length} JSON file(s)`);
    } else {
      pushStatus("No JSON files found. Please drop .json files only.");
    }
  };
  const handleFileSelect = (e) => {
    console.log('File select triggered', e.target.files);
    const files = Array.from(e.target.files);
    console.log('Files selected:', files);
    const jsonFiles = files.filter(
      (file) => file.type === "application/json" || file.name.endsWith(".json")
    );
    console.log('JSON files filtered:', jsonFiles);
    if (jsonFiles.length > 0) {
      setBulkFiles((prev) => [...prev, ...jsonFiles]);
      pushStatus(`Added ${jsonFiles.length} JSON file(s)`);
    } else {
      pushStatus("No JSON files found. Please select .json files only.");
    }
    // Reset the input so the same file can be selected again
    e.target.value = '';
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
  // Note: PDF downloads will be handled by the Python server
  // The Python server has the working PDF download logic
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
        // Use the new Python FastAPI process-county endpoint
        console.log('Application data:', preview.data);
        const response = await fetch(`${API}/process-county`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preview.data),
        });
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        if (response.ok) {
          const result = await response.json();
          console.log('Success result:', result);
          successCount++;
        } else {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          errorCount++;
        }
      } catch (_error) {
        errorCount++;
      }
    }
    setBulkStatus(
      `Import complete: ${successCount} successful, ${errorCount} failed`
    );
    setIsProcessing(false);
    setBulkFiles([]);
    setBulkPreview([]);
    loadApps();
  };
  // ----------- Step Management Functions -----------
  const addStepToQueue = () => {
    if (!newTitle.trim()) {
      pushStatus("Please enter a step title");
      return;
    }
    const step = {
      id: `step_${Date.now()}`,
      title: newTitle.trim(),
      type: newType,
      content: newContent.trim(),
      formName: newFormName.trim(),
      formId: newFormId.trim(),
      _file: newPdfFile,
    };
    setQueuedSteps((prev) => [...prev, step]);
    setNewTitle("");
    setNewContent("");
    setNewFormName("");
    setNewFormId("");
    setNewPdfFile(null);
    pushStatus("Step added to queue");
  };
  const removeQueued = (index) => {
    setQueuedSteps((prev) => prev.filter((_, i) => i !== index));
  };
  const saveQueuedSteps = async () => {
    if (!appId || queuedSteps.length === 0) return;
    try {
      const updatedSteps = [...steps];
      for (const queuedStep of queuedSteps) {
        const { _file, ...stepData } = queuedStep;
        if (stepData.type === "pdf" && _file) {
          // Handle PDF upload
          const formData = new FormData();
          formData.append("pdf", _file);
          formData.append("formId", stepData.formId);
          const uploadResponse = await fetch(`${API}/apps/${appId}/forms/${stepData.formId}/upload`, {
            method: "POST",
            body: formData,
          });
          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload PDF for ${stepData.formId}`);
          }
        }
        updatedSteps.push(stepData);
      }
      // Update the application
      const appRef = doc(db, "applications", appId);
      await updateDoc(appRef, { steps: updatedSteps });
      setSteps(updatedSteps);
      setQueuedSteps([]);
      pushStatus("Steps saved successfully");
      loadApps();
    } catch (error) {
      pushStatus(`Error saving steps: ${error.message}`);
    }
  };
  // ----------- AcroForm Conversion Functions -----------
  const convertToAcroForm = async (step) => {
    if (step.type !== "pdf") return;
    setIsConverting(true);
    setConversionStatus("Converting to AcroForm...");
    try {
      // Convert the PDF step to AcroForm
      const response = await fetch(`${API}/apps/${selectedApp.id}/forms/${step.formId}/convert-to-acroform`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId: step.id }),
      });
      if (response.ok) {
        const result = await response.json();
        setConversionStatus({
          type: "success",
          message: `Successfully converted ${step.formId} to AcroForm`,
          details: result
        });
        // Update the step type
        const updatedSteps = steps.map(s =>
          s.id === step.id ? { ...s, type: "acroform" } : s
        );
        setSteps(updatedSteps);
        // Update in database
        const appRef = doc(db, "applications", selectedApp.id);
        await updateDoc(appRef, { steps: updatedSteps });
        loadApps();
      } else {
        throw new Error("Conversion failed");
      }
    } catch (error) {
      setConversionStatus({
        type: "error",
        message: "Failed to convert to AcroForm",
        details: error.message
      });
    } finally {
      setIsConverting(false);
    }
  };
  const saveApp = async () => {
    if (!appId.trim() || !appTitle.trim()) {
      pushStatus("Please fill in required fields");
      return;
    }
    try {
      const appData = {
        id: appId.trim(),
        title: appTitle.trim(),
        rootDomain: rootDomain.trim(),
        description: description.trim(),
        steps: steps,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "applications", appId.trim()), appData);
      pushStatus("Application saved successfully");
      loadApps();
      setShowNewAppForm(false);
      setSelectedAppId(appId.trim());
    } catch (error) {
      pushStatus(`Error saving application: ${error.message}`);
    }
  };
  const deleteApp = async (id) => {
    if (!confirm("Are you sure you want to delete this application?")) return;
    try {
      // Delete from Firestore
      await setDoc(doc(db, "applications", id), { deleted: true });
      pushStatus("Application deleted");
      loadApps();
      if (selectedAppId === id) newApp();
    } catch (error) {
      pushStatus(`Error deleting application: ${error.message}`);
    }
  };
  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Admin Dashboard</h1>
            <p>Manage applications and forms</p>
          </div>
          <div className="header-right">
            <Link to="/dashboard" className="back-to-dashboard-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"></path>
              </svg>
              Back to User Dashboard
            </Link>
          </div>
        </div>
      </header>
      {/* Navigation Tabs */}
      <nav className="admin-nav">
        <button
          className={`nav-tab ${activeTab === "apps" ? "active" : ""}`}
          onClick={() => setActiveTab("apps")}
        >
          Applications
        </button>
        <button
          className={`nav-tab ${activeTab === "import" ? "active" : ""}`}
          onClick={() => setActiveTab("import")}
        >
          Import Application Data
        </button>
        <button
          className={`nav-tab ${activeTab === "reports" ? "active" : ""}`}
          onClick={() => setActiveTab("reports")}
        >
          Issue Reports
        </button>
      </nav>
      {/* Status Banner */}
      {status && (
        <div className="status-banner">
          {status}
        </div>
      )}
      {/* Main Content */}
      <main className="admin-main">
        {activeTab === "apps" && (
          <>
            {/* Applications List */}
            <section className="apps-section">
              <div className="section-header">
                <h2>Applications</h2>
                <button onClick={newApp} className="btn-primary">
                  + New Application
                </button>
              </div>
              <div className="apps-grid">
                {apps.map((app) => (
                  <div
                    key={app.id}
                    className={`app-card ${selectedAppId === app.id ? "selected" : ""}`}
                    onClick={() => selectApp(app.id)}
                  >
                    <h3>{app.title}</h3>
                    <p className="app-domain">{app.rootDomain}</p>
                    <p className="app-description">{app.description}</p>
                    <div className="app-steps">
                      {app.steps?.length || 0} steps
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteApp(app.id);
                      }}
                      className="btn-delete"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </section>
            {/* Application Form */}
            {(selectedAppId || showNewAppForm) && (
              <section className="app-form-section">
                <h3>{selectedAppId ? `Edit Application: ${selectedApp?.title}` : 'New Application'}</h3>
                <div className="form-grid">
                  <div>
                    <label>Application ID</label>
                    <input
                      value={appId}
                      onChange={(e) => setAppId(e.target.value)}
                      placeholder="e.g., los_angeles_county_mehko"
                    />
                  </div>
                  <div>
                    <label>Title</label>
                    <input
                      value={appTitle}
                      onChange={(e) => setAppTitle(e.target.value)}
                      placeholder="e.g., Los Angeles County MEHKO"
                    />
                  </div>
                  <div>
                    <label>Root Domain</label>
                    <input
                      value={rootDomain}
                      onChange={(e) => setRootDomain(e.target.value)}
                      placeholder="e.g., sandiegocounty.gov"
                    />
                  </div>
                  <div>
                    <label>Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description of the application"
                    />
                  </div>
                </div>
                <button onClick={saveApp} className="btn-primary">
                  Save Application
                </button>
              </section>
            )}
            {/* Steps Management */}
            {selectedAppId && (
              <section className="steps-section">
                <h3>Steps for {selectedApp.title}</h3>
                {/* Existing Steps */}
                <div className="existing-steps">
                  <h4>Current Steps</h4>
                  {steps.map((step, index) => (
                    <div key={step.id} className="step-item">
                      <span className="step-number">{index + 1}</span>
                      <span className="step-title">{step.title}</span>
                      <span className="step-type">{step.type}</span>
                      {step.type === "pdf" && (
                        <button
                          onClick={() => convertToAcroForm(step)}
                          disabled={isConverting}
                          className="btn-convert"
                        >
                          {isConverting ? "Converting..." : "Convert to AcroForm"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {/* Add New Step */}
                <div className="add-step-form">
                  <h4>Add New Step</h4>
                  <div className="step-form-grid">
                    <div>
                      <label>Step Title</label>
                      <input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="e.g., Submit Application"
                      />
                    </div>
                    <div>
                      <label>Step Type</label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                      >
                        <option value="info">Information</option>
                        <option value="form">Form</option>
                        <option value="pdf">PDF</option>
                      </select>
                    </div>
                    <div>
                      <label>Content/Description</label>
                      <textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="Step description or instructions"
                      />
                    </div>
                    {newType === "form" && (
                      <div>
                        <label>Form Name</label>
                        <input
                          value={newFormName}
                          onChange={(e) => setNewFormName(e.target.value)}
                          placeholder="e.g., MEHKO_SOP-English.pdf"
                        />
                      </div>
                    )}
                    {newType === "pdf" && (
                      <>
                        <div>
                          <label>Form ID</label>
                          <input
                            value={newFormId}
                            onChange={(e) => setNewFormId(e.target.value)}
                            placeholder="e.g., MEHKO_SOP-English"
                          />
                        </div>
                        <div>
                          <label>PDF File</label>
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => setNewPdfFile(e.target.files?.[0] || null)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="step-actions">
                    <button onClick={addStepToQueue} className="btn-secondary">
                      Add to Queue
                    </button>
                    <button
                      onClick={saveQueuedSteps}
                      disabled={!appId || queuedSteps.length === 0}
                      className="btn-primary"
                    >
                      Save All Steps
                    </button>
                    <span className="queue-count">
                      {queuedSteps.length} step{queuedSteps.length !== 1 ? 's' : ''} queued
                    </span>
                  </div>
                  {queuedSteps.length > 0 && (
                    <div className="queued-steps">
                      <strong>Queued Steps:</strong>
                      <ul>
                        {queuedSteps.map((step, index) => (
                          <li key={index}>
                            {step.title} <em>({step.type})</em>
                            {step.type === "pdf" && ` — formId: ${step.formId}`}
                            {step.type === "form" && ` — formName: ${step.formName}`}
                            <button
                              onClick={() => removeQueued(index)}
                              className="btn-remove"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}
            {/* Conversion Status */}
            {conversionStatus && (
              <div className={`conversion-status ${conversionStatus.type}`}>
                <h4>{conversionStatus.type === "success" ? "✅ Success" : "❌ Error"}</h4>
                <p>{conversionStatus.message}</p>
                {conversionStatus.details && (
                  <details>
                    <summary>Details</summary>
                    <pre>{JSON.stringify(conversionStatus.details, null, 2)}</pre>
                  </details>
                )}
              </div>
            )}
          </>
        )}
        {activeTab === "import" && (
          <section className="import-section">
            <h2>Import Application Data</h2>
            <p>Upload JSON files to bulk import applications</p>
            <div className="import-area">
              <div
                className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
                onDrop={handleFileDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7,10 12,15 17,10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <p>{isDragOver ? 'Drop your JSON files here!' : 'Drop JSON files here or'}</p>
                {!isDragOver && (
                  <>
                    <input
                      type="file"
                      multiple
                      accept=".json"
                      onChange={handleFileSelect}
                      className="file-input"
                      id="file-input"
                    />
                    <label htmlFor="file-input" className="btn-primary">
                      Select Files
                    </label>
                  </>
                )}
              </div>
              {bulkFiles.length > 0 && (
                <div className="file-list">
                  <h4>Selected Files:</h4>
                  {bulkFiles.map((file, index) => (
                    <div key={index} className="file-item">
                      <span>{file.name}</span>
                      <button
                        onClick={() => removeFile(index)}
                        className="btn-remove"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div className="file-actions">
                    <button onClick={previewFiles} className="btn-secondary">
                      Preview Files
                    </button>
                    <button
                      onClick={processBulkImport}
                      disabled={isProcessing || bulkPreview.length === 0}
                      className="btn-primary"
                    >
                      {isProcessing ? "Processing..." : "Import All"}
                    </button>
                  </div>
                </div>
              )}
              {bulkPreview.length > 0 && (
                <div className="preview-list">
                  <h4>File Preview:</h4>
                  {bulkPreview.map((preview, index) => (
                    <div
                      key={index}
                      className={`preview-item ${preview.valid ? "valid" : "invalid"}`}
                    >
                      <span>{preview.filename}</span>
                      <span className="status">
                        {preview.valid ? "✅ Valid" : "❌ Invalid"}
                      </span>
                      {preview.error && (
                        <span className="error">{preview.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {bulkStatus && (
                <div className="import-status">
                  {bulkStatus}
                </div>
              )}
            </div>
          </section>
        )}
        {activeTab === "reports" && (
          <ReportsViewer />
        )}
      </main>
    </div>
  );
}