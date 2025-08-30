import React, { useState, useEffect } from "react";
import "./PDFConversionTool.scss";

const API = "/api/apps";
const PYTHON_API = "http://localhost:8000/apps"; // Python server endpoint

export default function PDFConversionTool({ selectedApp, onClose }) {
  // PDF Conversion state
  const [selectedPdfForm, setSelectedPdfForm] = useState(null);
  const [pdfConversionStep, setPdfConversionStep] = useState("select"); // "select" | "extract" | "edit" | "convert" | "preview"
  const [aiExtractedFields, setAiExtractedFields] = useState([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [overlayJson, setOverlayJson] = useState("");
  const [overlayError, setOverlayError] = useState(null);
  const [acroformPdfUrl, setAcroformPdfUrl] = useState(null);
  const [acroformDefinition, setAcroformDefinition] = useState(null);
  const [status, setStatus] = useState("");

  // Get PDF steps from the selected app
  const pdfSteps = (selectedApp?.steps || []).filter(step => step.type === "pdf");

  // Helper functions
  const pushStatus = (msg) => {
    setStatus(msg);
    setTimeout(() => setStatus(""), 3000);
  };

  const selectPdfForm = (step) => {
    if (step.type !== "pdf") return;
    setSelectedPdfForm(step);
    setPdfConversionStep("extract");
    setAiExtractedFields([]);
    setOverlayJson("");
    setOverlayError(null);
    setAcroformPdfUrl(null);
    setAcroformDefinition(null);
  };

  const extractFieldsWithAI = async () => {
    if (!selectedPdfForm || !selectedApp) return;
    
    setIsAiProcessing(true);
    setAiProgress(0);
    setOverlayError(null);
    
    try {
      // Get the PDF file from the form using Python server
      const pdfResponse = await fetch(`${PYTHON_API}/${selectedApp.id}/forms/${selectedPdfForm.formId}/pdf`);
      if (!pdfResponse.ok) {
        throw new Error("Failed to fetch PDF for analysis");
      }
      
      const pdfBlob = await pdfResponse.blob();
      const formData = new FormData();
      formData.append("pdf", pdfBlob, `${selectedPdfForm.formId}.pdf`);
      
      setAiProgress(20);
      
      // Use the AI analysis endpoint (Node.js server)
      const analysisResponse = await fetch("/api/ai-analyze-pdf", {
        method: "POST",
        body: formData,
      });
      
      if (!analysisResponse.ok) {
        throw new Error("AI analysis failed");
      }
      
      setAiProgress(60);
      
      const analysisData = await analysisResponse.json();
      const fields = analysisData.fields || [];
      
      setAiProgress(80);
      
      // Convert to overlay format
      const overlay = {
        fields: fields.map((field, index) => ({
          id: field.id || `ai_field_${index + 1}`,
          label: field.label || `Field ${index + 1}`,
          page: field.page || 0,
          type: field.type || "text",
          rect: field.rect || [0, 0, 100, 20],
          fontSize: field.fontSize || 11,
          align: field.align || "left",
          shrink: field.shrink !== false,
          confidence: field.confidence || 0.5,
          aiReasoning: field.reasoning || "AI detected form field",
        }))
      };
      
      setAiExtractedFields(fields);
      setOverlayJson(JSON.stringify(overlay, null, 2));
      setPdfConversionStep("edit");
      setAiProgress(100);
      
      // Save the overlay
      await saveOverlay(overlay);
      
    } catch (error) {
      setOverlayError(error.message);
      setPdfConversionStep("extract");
    } finally {
      setIsAiProcessing(false);
      setAiProgress(0);
    }
  };

  const saveOverlay = async (overlay) => {
    if (!selectedPdfForm || !selectedApp) return;
    
    try {
      const formData = new FormData();
      formData.append("overlay_json", JSON.stringify(overlay));
      
      // Use Python server for template endpoint
      const response = await fetch(`${PYTHON_API}/${selectedApp.id}/forms/${selectedPdfForm.formId}/template`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to save overlay");
      }
      
      pushStatus("Overlay saved successfully");
    } catch (error) {
      setOverlayError(error.message);
    }
  };

  const convertToAcroFormFromOverlay = async () => {
    if (!selectedPdfForm || !selectedApp || !overlayJson) return;
    
    try {
      setOverlayError(null);
      
      // Parse and validate overlay JSON
      let overlay;
      try {
        overlay = JSON.parse(overlayJson);
        if (!overlay.fields || !Array.isArray(overlay.fields)) {
          throw new Error("Invalid overlay format: missing fields array");
        }
        
        // Additional validation
        if (overlay.fields.length === 0) {
          throw new Error("Overlay contains no fields. Please ensure AI extraction completed successfully.");
        }
        
        console.log("Validated overlay for conversion:", overlay);
        console.log("Field count:", overlay.fields.length);
        
      } catch (parseError) {
        throw new Error(`Invalid JSON: ${parseError.message}`);
      }
      
      // Save the overlay first
      await saveOverlay(overlay);
      
      // Convert to AcroForm using Python server
      const response = await fetch(`${PYTHON_API}/${selectedApp.id}/forms/${selectedPdfForm.formId}/create-acroform`, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to convert to AcroForm");
      }
      
      // Get the AcroForm PDF URL
      const acroformPdfUrl = `${PYTHON_API}/${selectedApp.id}/forms/${selectedPdfForm.formId}/acroform-pdf`;
      setAcroformPdfUrl(acroformPdfUrl);
      
      // Try to get the AcroForm definition
      try {
        const defResponse = await fetch(`${PYTHON_API}/${selectedApp.id}/forms/${selectedPdfForm.formId}/acroform-definition`);
        if (defResponse.ok) {
          const definition = await defResponse.json();
          console.log("AcroForm definition loaded:", definition);
          setAcroformDefinition(definition);
        } else {
          console.log("AcroForm definition not found, using overlay as definition");
          setAcroformDefinition(overlay);
        }
      } catch (defError) {
        console.log("Error loading AcroForm definition, using overlay as definition:", defError);
        setAcroformDefinition(overlay);
      }
      
      setPdfConversionStep("preview");
      pushStatus("Successfully converted to AcroForm");
      
    } catch (error) {
      setOverlayError(error.message);
    }
  };

  const resetPdfConversion = () => {
    setSelectedPdfForm(null);
    setPdfConversionStep("select");
    setAiExtractedFields([]);
    setOverlayJson("");
    setOverlayError(null);
    setAcroformPdfUrl(null);
    setAcroformDefinition(null);
  };

  // Render different steps
  const renderSelectStep = () => (
    <div className="pdf-conversion-step">
      <h3>Select PDF Form to Convert</h3>
      <p>Choose a PDF form from the application to convert to AcroForm format.</p>
      
      {pdfSteps.length === 0 ? (
        <div className="no-pdf-steps">
          <p>No PDF forms found in this application.</p>
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      ) : (
        <div className="pdf-steps-list">
          {pdfSteps.map((step) => (
            <div key={step.id} className="pdf-step-item">
              <div className="step-info">
                <h4>{step.title}</h4>
                <p>Form ID: {step.formId}</p>
                {step.description && <p>{step.description}</p>}
              </div>
              <button 
                onClick={() => selectPdfForm(step)}
                className="btn-primary"
              >
                Select & Convert
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderExtractStep = () => (
    <div className="pdf-conversion-step">
      <h3>🤖 AI Field Extraction</h3>
      <p>Extract form fields from <strong>{selectedPdfForm?.title}</strong> using AI analysis.</p>
      
      <div className="form-preview">
        <h4>Selected Form</h4>
        <div className="form-details">
          <p><strong>Title:</strong> {selectedPdfForm?.title}</p>
          <p><strong>Form ID:</strong> {selectedPdfForm?.formId}</p>
          <p><strong>Type:</strong> {selectedPdfForm?.type}</p>
        </div>
      </div>

      <div className="ai-extraction-actions">
        <button 
          onClick={extractFieldsWithAI}
          disabled={isAiProcessing}
          className="btn-primary"
        >
          {isAiProcessing ? "Analyzing..." : "Extract Fields with AI"}
        </button>
        
        {isAiProcessing && (
          <div className="ai-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${aiProgress}%` }}
              ></div>
            </div>
            <p>AI analyzing PDF structure... {aiProgress}%</p>
          </div>
        )}
      </div>

      {overlayError && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {overlayError}
        </div>
      )}

      <div className="step-actions">
        <button onClick={resetPdfConversion} className="btn-secondary">
          Back to Selection
        </button>
      </div>
    </div>
  );

  const renderEditStep = () => (
    <div className="pdf-conversion-step">
      <h3>✏️ Edit Overlay Definition</h3>
      <p>Review and modify the AI-extracted field definitions before converting to AcroForm.</p>
      
      <div className="overlay-editor">
        <div className="editor-header">
          <h4>Field Definitions (JSON)</h4>
          <div className="field-count">
            {aiExtractedFields.length} fields detected
          </div>
        </div>
        
        <textarea
          value={overlayJson}
          onChange={(e) => setOverlayJson(e.target.value)}
          placeholder="Edit the overlay JSON here..."
          className="json-editor"
          rows={20}
        />
        
        {overlayError && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {overlayError}
          </div>
        )}
      </div>

      <div className="step-actions">
        <button onClick={() => setPdfConversionStep("extract")} className="btn-secondary">
          Back to Extraction
        </button>
        <button 
          onClick={convertToAcroFormFromOverlay}
          disabled={!overlayJson.trim()}
          className="btn-primary"
        >
          Convert to AcroForm
        </button>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="pdf-conversion-step">
      <h3>✅ AcroForm Conversion Complete</h3>
      <p>Your PDF has been successfully converted to AcroForm format!</p>
      
      <div className="conversion-results">
        <div className="result-item">
          <h4>📄 AcroForm PDF</h4>
          <p>Download the converted AcroForm PDF:</p>
          <a 
            href={acroformPdfUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Download AcroForm PDF
          </a>
        </div>
        
        <div className="result-item">
          <h4>📋 Field Definition</h4>
          <p>Field definitions saved to:</p>
          <code>acroform-definition.json</code>
          <div className="field-summary">
            <strong>{acroformDefinition?.fields?.length || 0} fields</strong> defined
          </div>
          {acroformDefinition?.fields?.length === 0 && (
            <div className="debug-info" style={{ marginTop: '12px', padding: '8px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
              <p style={{ margin: '0', fontSize: '12px', color: '#92400e' }}>
                <strong>Debug:</strong> No fields found in definition. 
                Overlay has {aiExtractedFields.length} fields. 
                Check console for details.
              </p>
            </div>
          )}
        </div>
        
        <div className="result-item">
          <h4>🔗 Preview Link</h4>
          <p>View the form in the application:</p>
          <a 
            href={`/admin/interview/${selectedApp.id}/${selectedPdfForm.formId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Open Form Preview
          </a>
        </div>
      </div>

      <div className="step-actions">
        <button onClick={resetPdfConversion} className="btn-primary">
          Convert Another Form
        </button>
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
      </div>
    </div>
  );

  // Main render
  return (
    <div className="pdf-conversion-tool">
      <div className="tool-header">
        <h2>🔄 PDF to AcroForm Converter</h2>
        <p>Convert non-AcroForm PDFs to interactive AcroForm format using AI field detection</p>
        <button onClick={onClose} className="close-btn">×</button>
      </div>

      {status && (
        <div className="status-message">
          {status}
        </div>
      )}

      <div className="tool-content">
        {pdfConversionStep === "select" && renderSelectStep()}
        {pdfConversionStep === "extract" && renderExtractStep()}
        {pdfConversionStep === "edit" && renderEditStep()}
        {pdfConversionStep === "preview" && renderPreviewStep()}
      </div>
    </div>
  );
}
