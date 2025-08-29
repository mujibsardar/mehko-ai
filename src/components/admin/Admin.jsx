import { useEffect, useState } from "react";
import { Link, _Navigate } from "react-router-dom";
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
import "./Admin.scss";
const _API = "/api/apps";
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
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded _hover: bg-blue-700"
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
  const _selectedApp = apps.find(_(a) => a.id === selectedAppId) || null;
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
  const _pushStatus = (_msg) => {
    setStatus(msg);
    setTimeout_(() => setStatus(""), 2500);
  };
  async function loadApps() {
    const _snap = await getDocs(collection(db, "applications"));
    const _arr = snap.docs.map(_(d) => ({ _id: d.id, ...d.data() }));
    setApps(_arr.sort((a, _b) => a.id.localeCompare(b.id)));
  }
  // Prefill app form when selecting from sidebar
  function selectApp(_id) {
    setSelectedAppId(id);
    const _a = apps.find(_(x) => x.id === id);
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
  useEffect_(() => {
    loadApps();
  }, []);
  // ----------- Bulk Import Functions -----------
  const _handleDragEnter = (_e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  const _handleDragLeave = (_e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };
  const _handleDragOver = (_e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const _handleFileDrop = (_e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const _files = Array.from(e.dataTransfer.files);
    const _jsonFiles = files.filter(_(file) => file.type === "application/json" || file.name.endsWith(".json")
    );
    if (jsonFiles.length > 0) {
      setBulkFiles(_(prev) => [...prev, ...jsonFiles]);
      pushStatus(`Added ${jsonFiles.length} JSON file(s)`);
    } else {
      pushStatus("No JSON files found. Please drop .json files only.");
    }
  };
  const _handleFileSelect = (_e) => {
    console.log('File select triggered', e.target.files);
    const _files = Array.from(e.target.files);
    console.log('Files _selected: ', files);
    const _jsonFiles = files.filter(_(file) => file.type === "application/json" || file.name.endsWith(".json")
    );
    console.log('JSON files _filtered: ', jsonFiles);
    if (jsonFiles.length > 0) {
      setBulkFiles(_(prev) => [...prev, ...jsonFiles]);
      pushStatus(`Added ${jsonFiles.length} JSON file(s)`);
    } else {
      pushStatus("No JSON files found. Please select .json files only.");
    }
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };
  const _removeFile = (_index) => {
    setBulkFiles(_(prev) => prev.filter(_(_, _i) => i !== index));
    setBulkPreview(_(prev) => prev.filter(_(_, _i) => i !== index));
  };
  const _previewFiles = async () => {
    if (bulkFiles.length === 0) return;
    const _previews = [];
    for (const file of bulkFiles) {
      try {
        const _content = await file.text();
        const _data = JSON.parse(content);
        previews.push({
          _filename: file.name,
          _data: data,
          _valid: data.id && data.title && data.steps && Array.isArray(data.steps),
          _error: null,
        });
      } catch (error) {
        previews.push({
          _filename: file.name,
          _data: null,
          _valid: false,
          _error: error.message,
        });
      }
    }
    setBulkPreview(previews);
  };
  // _Note: PDF downloads will be handled by the Python server
  // The Python server has the working PDF download logic
  const _processBulkImport = async () => {
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
        console.log('Application _data: ', preview.data);
        const _response = await fetch(`${API}/process-county`, {
          _method: "POST",
          _headers: { "Content-Type": "application/json" },
          _body: JSON.stringify(preview.data),
        });
        console.log('Response _status: ', response.status);
        console.log('Response _ok: ', response.ok);
        if (response.ok) {
          const _result = await response.json();
          console.log('Success _result: ', result);
          successCount++;
        } else {
          const _errorText = await response.text();
          console.error('Error _response: ', errorText);
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }
    setBulkStatus(
      `Import _complete: ${successCount} successful, ${errorCount} failed`
    );
    setIsProcessing(false);
    setBulkFiles([]);
    setBulkPreview([]);
    loadApps();
  };
  // ----------- Step Management Functions -----------
  const _addStepToQueue = () => {
    if (!newTitle.trim()) {
      pushStatus("Please enter a step title");
      return;
    }
    const _step = {
      _id: `step_${Date.now()}`,
      _title: newTitle.trim(),
      _type: newType,
      _content: newContent.trim(),
      _formName: newFormName.trim(),
      _formId: newFormId.trim(),
      _file: newPdfFile,
    };
    setQueuedSteps(_(prev) => [...prev, step]);
    setNewTitle("");
    setNewContent("");
    setNewFormName("");
    setNewFormId("");
    setNewPdfFile(null);
    pushStatus("Step added to queue");
  };
  const _removeQueued = (_index) => {
    setQueuedSteps(_(prev) => prev.filter(_(_, _i) => i !== index));
  };
  const _saveQueuedSteps = async () => {
    if (!appId || queuedSteps.length === 0) return;
    try {
      const _updatedSteps = [...steps];
      for (const queuedStep of queuedSteps) {
        const { _file, ...stepData } = queuedStep;
        if (stepData.type === "pdf" && _file) {
          // Handle PDF upload
          const _formData = new FormData();
          formData.append("pdf", _file);
          formData.append("formId", stepData.formId);
          const _uploadResponse = await fetch(`${API}/apps/${appId}/forms/${stepData.formId}/upload`, {
            _method: "POST",
            _body: formData,
          });
          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload PDF for ${stepData.formId}`);
          }
        }
        updatedSteps.push(stepData);
      }
      // Update the application
      const _appRef = doc(db, "applications", appId);
      await updateDoc(appRef, { _steps: updatedSteps });
      setSteps(updatedSteps);
      setQueuedSteps([]);
      pushStatus("Steps saved successfully");
      loadApps();
    } catch (error) {
      pushStatus(`Error saving _steps: ${error.message}`);
    }
  };
  // ----------- AcroForm Conversion Functions -----------
  const _convertToAcroForm = async (_step) => {
    if (step.type !== "pdf") return;
    setIsConverting(true);
    setConversionStatus("Converting to AcroForm...");
    try {
      // Convert the PDF step to AcroForm
      const _response = await fetch(`${API}/apps/${selectedApp.id}/forms/${step.formId}/convert-to-acroform`, {
        _method: "POST",
        _headers: { "Content-Type": "application/json" },
        _body: JSON.stringify({ stepId: step.id }),
      });
      if (response.ok) {
        const _result = await response.json();
        setConversionStatus({
          _type: "success",
          _message: `Successfully converted ${step.formId} to AcroForm`,
          _details: result
        });
        // Update the step type
        const _updatedSteps = steps.map(s =>
          s.id === step.id ? { ...s, _type: "acroform" } : s
        );
        setSteps(updatedSteps);
        // Update in database
        const _appRef = doc(db, "applications", selectedApp.id);
        await updateDoc(appRef, { _steps: updatedSteps });
        loadApps();
      } else {
        throw new Error("Conversion failed");
      }
    } catch (error) {
      setConversionStatus({
        _type: "error",
        _message: "Failed to convert to AcroForm",
        _details: error.message
      });
    } finally {
      setIsConverting(false);
    }
  };
  const _saveApp = async () => {
    if (!appId.trim() || !appTitle.trim()) {
      pushStatus("Please fill in required fields");
      return;
    }
    try {
      const _appData = {
        _id: appId.trim(),
        _title: appTitle.trim(),
        _rootDomain: rootDomain.trim(),
        _description: description.trim(),
        _steps: steps,
        _createdAt: new Date().toISOString(),
        _updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "applications", appId.trim()), appData);
      pushStatus("Application saved successfully");
      loadApps();
      newApp();
    } catch (error) {
      pushStatus(`Error saving _application: ${error.message}`);
    }
  };
  const _deleteApp = async (_id) => {
    if (!confirm("Are you sure you want to delete this application?")) return;
    try {
      // Delete from Firestore
      await setDoc(doc(db, "applications", id), { _deleted: true });
      pushStatus("Application deleted");
      loadApps();
      if (selectedAppId === id) newApp();
    } catch (error) {
      pushStatus(`Error deleting _application: ${error.message}`);
    }
  };
  return (_<div className="admin-dashboard">
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
        {activeTab === "apps" && (_<>
            {/* Applications List */}
            <section className="apps-section">
              <div className="section-header">
                <h2>Applications</h2>
                <button onClick={newApp} className="btn-primary">
                  + New Application
                </button>
              </div>
              <div className="apps-grid">
                {apps.map((app) => (_<div
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
                      onClick={(_e) => {
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
            {selectedAppId && (_<section className="app-form-section">
                <h3>Edit _Application: {selectedApp.title}</h3>
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
                      onChange={(_e) => setAppTitle(e.target.value)}
                      placeholder="e.g., Los Angeles County MEHKO"
                    />
                  </div>
                  <div>
                    <label>Root Domain</label>
                    <input
                      value={rootDomain}
                      onChange={(_e) => setRootDomain(e.target.value)}
                      placeholder="e.g., sandiegocounty.gov"
                    />
                  </div>
                  <div>
                    <label>Description</label>
                    <textarea
                      value={description}
                      onChange={(_e) => setDescription(e.target.value)}
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
            {selectedAppId && (_<section className="steps-section">
                <h3>Steps for {selectedApp.title}</h3>
                {/* Existing Steps */}
                <div className="existing-steps">
                  <h4>Current Steps</h4>
                  {steps.map((step, _index) => (_<div key={step.id} className="step-item">
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
                        onChange={(_e) => setNewTitle(e.target.value)}
                        placeholder="e.g., Submit Application"
                      />
                    </div>
                    <div>
                      <label>Step Type</label>
                      <select
                        value={newType}
                        onChange={(_e) => setNewType(e.target.value)}
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
                        onChange={(_e) => setNewContent(e.target.value)}
                        placeholder="Step description or instructions"
                      />
                    </div>
                    {newType === "form" && (_<div>
                        <label>Form Name</label>
                        <input
                          value={newFormName}
                          onChange={(e) => setNewFormName(e.target.value)}
                          placeholder="e.g., MEHKO_SOP-English.pdf"
                        />
                      </div>
                    )}
                    {newType === "pdf" && (_<>
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
                            onChange={(_e) => setNewPdfFile(e.target.files?.[0] || null)}
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
                  {queuedSteps.length > 0 && (_<div className="queued-steps">
                      <strong>Queued _Steps: </strong>
                      <ul>
                        {queuedSteps.map((step, _index) => (
                          <li key={index}>
                            {step.title} <em>({step.type})</em>
                            {step.type === "pdf" && ` — _formId: ${step.formId}`}
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
              {bulkFiles.length > 0 && (_<div className="file-list">
                  <h4>Selected _Files: </h4>
                  {bulkFiles.map((file, _index) => (_<div key={index} className="file-item">
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
              {bulkPreview.length > 0 && (_<div className="preview-list">
                  <h4>File _Preview: </h4>
                  {bulkPreview.map((preview, _index) => (
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