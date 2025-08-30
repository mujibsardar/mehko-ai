import { useState, useRef, useEffect } from "react";
import "./AIFieldMapper.scss";
import { ENDPOINTS } from "../../config/api";
const AIFieldMapper = ({ app, form, onMappingComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [currentStep, setCurrentStep] = useState("idle"); // idle, analyzing, mapping, reviewing
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [overlay, setOverlay] = useState({ fields: [] });
  const fileInputRef = useRef(null);
  const _canvasRef = useRef(null);
  // Load existing overlay if available
  useEffect(() => {
    loadExistingOverlay();
  }, [app, form]);
  const loadExistingOverlay = async () => {
    try {
      const response = await fetch(`/api/apps/${app}/forms/${form}/template`);
      const data = await response.json();
      setOverlay(data);
    } catch (_err) {
      // Ignore errors when loading existing overlay
    }
  };
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !file.type.includes("pdf")) {
      setError("Please select a valid PDF file");
      return;
    }
    setIsProcessing(true);
    setCurrentStep("analyzing");
    setProgress(0);
    setError(null);
    try {
      // Step 1: Upload PDF and get AI analysis
      setProgress(20);
      const formData = new FormData();
      formData.append("pdf", file);
      console.log(
        "Sending request to:",
        ENDPOINTS.AI_ANALYZE_PDF()
      ); // Debug log
      const uploadResponse = await fetch(
        ENDPOINTS.AI_ANALYZE_PDF(),
        {
          method: "POST",
          body: formData,
        }
      );
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("Upload failed with response:", errorText); // Debug log
        throw new Error(
          `Failed to upload PDF for analysis: ${uploadResponse.status} ${errorText}`
        );
      }
      const analysisData = await uploadResponse.json();
      setProgress(60);
      // Step 2: Process AI suggestions
      setCurrentStep("mapping");
      const suggestions = processAISuggestions(analysisData.fields);
      setAiSuggestions(suggestions);
      setProgress(80);
      // Step 3: Auto-select high-confidence fields
      setCurrentStep("reviewing");
      const highConfidenceFields = suggestions.filter(
        (f) => f.confidence > 0.8
      );
      setSelectedFields(highConfidenceFields.map((f) => f.id));
      setProgress(100);
    } catch (err) {
      console.error("Error in handleFileUpload:", err); // Debug log
      setError(err.message);
      setCurrentStep("idle");
    } finally {
      setIsProcessing(false);
    }
  };
  const processAISuggestions = (aiFields) => {
    return aiFields.map((field, index) => ({
      id: `ai_field_${index + 1}`,
      label: field.label || `Field ${index + 1}`,
      page: field.page || 0,
      type: field.type || "text",
      rect: field.rect || [0, 0, 100, 20],
      fontSize: field.fontSize || 11,
      align: field.align || "left",
      shrink: field.shrink !== false,
      confidence: field.confidence || 0.5,
      aiReasoning: field.reasoning || "AI detected form field",
      originalId: field.originalId,
      // Add metadata for better coordinate handling
      originalRect: field.rect,
      width: field.rect ? field.rect[2] - field.rect[0] : 100,
      height: field.rect ? field.rect[3] - field.rect[1] : 20,
    }));
  };
  const handleFieldSelection = (fieldId, isSelected) => {
    if (isSelected) {
      setSelectedFields((prev) => [...prev, fieldId]);
    } else {
      setSelectedFields((prev) => prev.filter((id) => id !== fieldId));
    }
  };
  const handleApplyMapping = async () => {
    if (selectedFields.length === 0) {
      setError("Please select at least one field to apply");
      return;
    }
    try {
      const selectedFieldData = aiSuggestions.filter((f) =>
        selectedFields.includes(f.id)
      );
      // Convert to overlay format
      const newOverlay = {
        ...overlay,
        fields: [
          ...overlay.fields,
          ...selectedFieldData.map((f) => ({
            id: f.id,
            label: f.label,
            page: f.page,
            type: f.type,
            rect: f.rect,
            fontSize: f.fontSize,
            align: f.align,
            shrink: f.shrink,
          })),
        ],
      };
      // Save the new overlay
      const formData = new FormData();
      formData.append("overlay_json", JSON.stringify(newOverlay));
      const response = await fetch(`/api/apps/${app}/forms/${form}/template`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Failed to save field mapping");
      }
      setOverlay(newOverlay);
      onMappingComplete?.(newOverlay);
      // Reset for next use
      setAiSuggestions([]);
      setSelectedFields([]);
      setCurrentStep("idle");
    } catch (err) {
      setError(err.message);
    }
  };
  const renderProgressBar = () => (
    <div className="progress-container">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="progress-text">
        {currentStep === "analyzing" && "AI analyzing PDF structure..."}
        {currentStep === "mapping" && "Mapping detected fields..."}
        {currentStep === "reviewing" && "Review AI suggestions..."}
      </div>
    </div>
  );
  const renderFieldSuggestions = () => (
    <div className="field-suggestions">
      <h3>AI Field Suggestions</h3>
      <div className="suggestions-grid">
        {aiSuggestions.map((field) => (
          <div
            key={field.id}
            className={`field-suggestion ${selectedFields.includes(field.id) ? "selected" : ""
              }`}
          >
            <div className="field-header">
              <input
                type="checkbox"
                checked={selectedFields.includes(field.id)}
                onChange={(e) =>
                  handleFieldSelection(field.id, e.target.checked)
                }
              />
              <span className="field-label">{field.label}</span>
              <span
                className={`confidence-badge confidence-${Math.floor(
                  field.confidence * 10
                )}`}
              >
                {Math.round(field.confidence * 100)}%
              </span>
            </div>
            <div className="field-details">
              <div className="field-type">Type: {field.type}</div>
              <div className="field-page">Page: {field.page + 1}</div>
              <div className="field-dimensions">
                Size: {Math.round(field.width)}×{Math.round(field.height)} px
              </div>
              <div className="ai-reasoning">{field.aiReasoning}</div>
            </div>
          </div>
        ))}
      </div>
      {aiSuggestions.length > 0 && (
        <div className="mapping-actions">
          <button
            className="apply-mapping-btn"
            onClick={handleApplyMapping}
            disabled={selectedFields.length === 0}
          >
            Apply Selected Fields ({selectedFields.length})
          </button>
        </div>
      )}
    </div>
  );
  return (
    <div className="ai-field-mapper">
      <div className="mapper-header">
        <h2>🤖 AI-Powered Field Mapping</h2>
        <p>Upload a PDF and let AI automatically detect and map form fields</p>
      </div>
      {!isProcessing && currentStep === "idle" && (
        <div className="upload-section">
          <div
            className="upload-area"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-icon">📄</div>
            <div className="upload-text">
              <strong>Click to upload PDF</strong>
              <span>or drag and drop</span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
        </div>
      )}
      {isProcessing && (
        <div className="processing-section">{renderProgressBar()}</div>
      )}
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}
      {currentStep === "reviewing" &&
        aiSuggestions.length > 0 &&
        renderFieldSuggestions()}
      {overlay.fields.length > 0 && (
        <div className="existing-fields">
          <h3>Existing Mapped Fields</h3>
          <div className="fields-count">
            {overlay.fields.length} field(s) already mapped
          </div>
        </div>
      )}
    </div>
  );
};
export default AIFieldMapper;