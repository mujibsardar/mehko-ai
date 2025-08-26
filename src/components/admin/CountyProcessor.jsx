import React, { useState, useRef } from "react";
import "./CountyProcessor.scss";

const API = "/api";

export default function CountyProcessor() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [processingStatus, setProcessingStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const jsonFiles = files.filter(
      (file) => file.type === "application/json" || file.name.endsWith(".json")
    );

    if (jsonFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...jsonFiles]);
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const jsonFiles = files.filter(
      (file) => file.type === "application/json" || file.name.endsWith(".json")
    );
    setUploadedFiles((prev) => [...prev, ...jsonFiles]);
  };

  // Remove file
  const removeFile = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    setResults((prev) => prev.filter((_, i) => i !== index));
  };

  // Process files
  const processFiles = async () => {
    if (uploadedFiles.length === 0) return;

    setIsProcessing(true);
    setProcessingStatus("Processing county files...");
    setResults([]);

    const newResults = [];

    for (const file of uploadedFiles) {
      try {
        setProcessingStatus(`Processing ${file.name}...`);

        // Read and validate JSON
        const content = await file.text();
        const countyData = JSON.parse(content);

        // Validate required fields
        const required = [
          "id",
          "title",
          "description",
          "rootDomain",
          "supportTools",
          "steps",
        ];
        const missing = required.filter((field) => !countyData[field]);

        if (missing.length > 0) {
          newResults.push({
            filename: file.name,
            success: false,
            error: `Missing required fields: ${missing.join(", ")}`,
            countyId: null,
          });
          continue;
        }

        // Send to backend for processing
        const formData = new FormData();
        formData.append("countyData", content);
        formData.append("filename", file.name);

        const response = await fetch(`${API}/admin/process-county`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        newResults.push({
          filename: file.name,
          success: true,
          countyId: countyData.id,
          title: countyData.title,
          steps: countyData.steps?.length || 0,
          pdfForms:
            countyData.steps?.filter((s) => s.type === "pdf").length || 0,
          message: result.message,
        });
      } catch (error) {
        newResults.push({
          filename: file.name,
          success: false,
          error: error.message,
          countyId: null,
        });
      }
    }

    setResults(newResults);
    setIsProcessing(false);
    setProcessingStatus("Processing completed");

    // Clear files after processing
    setTimeout(() => {
      setUploadedFiles([]);
      setResults([]);
      setProcessingStatus("");
    }, 5000);
  };

  // Clear all
  const clearAll = () => {
    setUploadedFiles([]);
    setResults([]);
    setProcessingStatus("");
  };

  return (
    <div className="county-processor">
      {/* Admin Dashboard Navigation */}
      <div className="admin-navigation">
        <div className="nav-title">
          🏛️ County Processor
        </div>
        <a
          href="/admin"
          className="back-to-admin-btn"
        >
          ← Back to Admin Dashboard
        </a>
      </div>
      <div className="county-processor__header">
        <h2>🚀 County JSON Processor</h2>
        <p>
          Upload county JSON files to automatically process them and download
          all required PDF forms
        </p>
      </div>

      {/* File Upload Area */}
      <div className="county-processor__upload-area">
        <div
          className={`upload-zone ${dragActive ? "drag-active" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-content">
            <div className="upload-icon">📁</div>
            <h3>Drop JSON files here or click to select</h3>
            <p>Supports .json files with county MEHKO data</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".json,application/json"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
          </div>
        </div>
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="county-processor__files">
          <div className="files-header">
            <h3>Files to Process ({uploadedFiles.length})</h3>
            <button
              className="clear-btn"
              onClick={clearAll}
              disabled={isProcessing}
            >
              Clear All
            </button>
          </div>

          <div className="files-list">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="file-item">
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button
                  className="remove-btn"
                  onClick={() => removeFile(index)}
                  disabled={isProcessing}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="process-actions">
            <button
              className="process-btn"
              onClick={processFiles}
              disabled={isProcessing || uploadedFiles.length === 0}
            >
              {isProcessing ? "Processing..." : "Process Counties"}
            </button>
          </div>
        </div>
      )}

      {/* Processing Status */}
      {processingStatus && (
        <div className="county-processor__status">
          <div className="status-content">
            {isProcessing && <div className="spinner"></div>}
            <span>{processingStatus}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="county-processor__results">
          <h3>Processing Results</h3>

          <div className="results-list">
            {results.map((result, index) => (
              <div
                key={index}
                className={`result-item ${result.success ? "success" : "error"
                  }`}
              >
                <div className="result-header">
                  <span className="filename">{result.filename}</span>
                  <span
                    className={`status ${result.success ? "success" : "error"}`}
                  >
                    {result.success ? "✅ Success" : "❌ Failed"}
                  </span>
                </div>

                {result.success ? (
                  <div className="result-details">
                    <div className="detail-row">
                      <span className="label">County:</span>
                      <span className="value">{result.title}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Steps:</span>
                      <span className="value">{result.steps}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">PDF Forms:</span>
                      <span className="value">{result.pdfForms}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Message:</span>
                      <span className="value">{result.message}</span>
                    </div>
                  </div>
                ) : (
                  <div className="result-error">
                    <span className="error-message">{result.error}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="county-processor__instructions">
        <h3>📋 How It Works</h3>
        <div className="instructions-grid">
          <div className="instruction">
            <div className="instruction-number">1</div>
            <div className="instruction-content">
              <h4>Upload JSON</h4>
              <p>Drag & drop or select county JSON files</p>
            </div>
          </div>
          <div className="instruction">
            <div className="instruction-number">2</div>
            <div className="instruction-content">
              <h4>Automatic Processing</h4>
              <p>System validates JSON and processes the county</p>
            </div>
          </div>
          <div className="instruction">
            <div className="instruction-number">3</div>
            <div className="instruction-content">
              <h4>PDF Downloads</h4>
              <p>All required forms are automatically downloaded</p>
            </div>
          </div>
          <div className="instruction">
            <div className="instruction-number">4</div>
            <div className="instruction-content">
              <h4>Ready to Use</h4>
              <p>County is immediately available in your application</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
