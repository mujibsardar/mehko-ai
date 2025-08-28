import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import "./AcroFormFieldEditor.scss";

const API = "/api";

const FIELD_TYPES = [
  { value: "text", label: "Text Input", icon: "📝" },
  { value: "email", label: "Email", icon: "📧" },
  { value: "tel", label: "Phone", icon: "📞" },
  { value: "number", label: "Number", icon: "🔢" },
  { value: "date", label: "Date", icon: "📅" },
  { value: "checkbox", label: "Checkbox", icon: "☑️" },
  { value: "radio", label: "Radio Button", icon: "🔘" },
  { value: "select", label: "Dropdown", icon: "📋" },
  { value: "textarea", label: "Multi-line Text", icon: "📄" },
  { value: "signature", label: "Signature", icon: "✍️" }
];

const VALIDATION_TYPES = {
  text: ["required", "minLength", "maxLength", "pattern"],
  email: ["required", "pattern"],
  tel: ["required", "pattern"],
  number: ["required", "min", "max"],
  date: ["required", "minDate", "maxDate"],
  checkbox: ["required"],
  radio: ["required"],
  select: ["required"],
  textarea: ["required", "minLength", "maxLength"],
  signature: ["required"]
};

export default function AcroFormFieldEditor() {
  const { user, loading, isAdmin } = useAuth();
  const params = useParams();
  const app = params.app || params.appId;
  const form = params.form || params.formId;

  // State
  const [acroformDefinition, setAcroformDefinition] = useState({
    formMetadata: {
      title: "",
      description: "",
      version: "1.0",
      type: "acroform"
    },
    fields: [],
    formSettings: {
      autoSave: true,
      validationMode: "real-time",
      submitBehavior: "download",
      theme: "default"
    }
  });
  const [selectedField, setSelectedField] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState("saved");
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef(null);

  // Load existing AcroForm definition
  useEffect(() => {
    loadAcroFormDefinition();
  }, [app, form]);

  const loadAcroFormDefinition = async () => {
    try {
      const response = await fetch(`${API}/apps/${app}/forms/${form}/acroform-definition`);
      if (response.ok) {
        const data = await response.json();
        setAcroformDefinition(data);
      } else {
        // Load from overlay.json as fallback and convert
        const overlayResponse = await fetch(`${API}/apps/${app}/forms/${form}/template`);
        if (overlayResponse.ok) {
          const overlayData = await overlayResponse.json();
          const converted = convertOverlayToAcroForm(overlayData, form);
          setAcroformDefinition(converted);
        }
      }
    } catch (err) {
      console.log("No existing definition found, starting fresh");
    }
  };

  const convertOverlayToAcroForm = (overlay, formName) => {
    return {
      formMetadata: {
        title: formName.replace(/_/g, " ").replace(/.pdf$/i, ""),
        description: `Converted from overlay: ${formName}`,
        version: "1.0",
        type: "acroform",
        converted: true
      },
      fields: overlay.fields.map(field => ({
        id: field.id,
        label: field.label,
        type: field.type,
        page: field.page || 0,
        required: true,
        validation: getDefaultValidation(field.type),
        properties: getDefaultProperties(field.type),
        styling: {
          fontSize: field.fontSize || 12,
          fontFamily: "Helvetica",
          textAlign: field.align || "left",
          color: "#000000"
        },
        aiConfidence: 0.8,
        aiReasoning: "Converted from overlay coordinates"
      })),
      formSettings: {
        autoSave: true,
        validationMode: "real-time",
        submitBehavior: "download",
        theme: "default"
      }
    };
  };

  const getDefaultValidation = (type) => {
    const base = { required: true };
    switch (type) {
      case "text":
      case "textarea":
        return { ...base, minLength: 2, maxLength: 100 };
      case "email":
        return { ...base, pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" };
      case "tel":
        return { ...base, pattern: "^[\\+]?[1-9]\\d{1,14}$" };
      case "number":
        return { ...base, min: 0, max: 999999 };
      case "date":
        return { ...base, minDate: "1900-01-01", maxDate: "2100-12-31" };
      default:
        return base;
    }
  };

  const getDefaultProperties = (type) => {
    const base = { defaultValue: "", readOnly: false };
    switch (type) {
      case "text":
      case "email":
      case "tel":
        return { ...base, placeholder: `Enter ${type}`, maxLength: 100 };
      case "textarea":
        return { ...base, placeholder: "Enter text", maxLength: 500, rows: 3 };
      case "number":
        return { ...base, placeholder: "0", min: 0, max: 999999 };
      case "date":
        return { ...base, placeholder: "MM/DD/YYYY" };
      case "checkbox":
        return { ...base, defaultValue: false };
      case "signature":
        return { ...base, placeholder: "Click to sign" };
      default:
        return base;
    }
  };

  const handleAddField = () => {
    const newField = {
      id: `field_${Date.now()}`,
      label: "New Field",
      type: "text",
      page: 0,
      required: true,
      validation: getDefaultValidation("text"),
      properties: getDefaultProperties("text"),
      styling: {
        fontSize: 12,
        fontFamily: "Helvetica",
        textAlign: "left",
        color: "#000000"
      },
      aiConfidence: 0.0,
      aiReasoning: "Manually added field"
    };

    setAcroformDefinition(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
    setSelectedField(newField);
    setIsEditing(true);
  };

  const handleEditField = (field) => {
    setSelectedField(field);
    setIsEditing(true);
  };

  const handleDeleteField = (fieldId) => {
    if (window.confirm("Are you sure you want to delete this field?")) {
      setAcroformDefinition(prev => ({
        ...prev,
        fields: prev.fields.filter(f => f.id !== fieldId)
      }));
      if (selectedField?.id === fieldId) {
        setSelectedField(null);
        setIsEditing(false);
      }
    }
  };

  const handleFieldUpdate = (updatedField) => {
    setAcroformDefinition(prev => ({
      ...prev,
      fields: prev.fields.map(f =>
        f.id === updatedField.id ? updatedField : f
      )
    }));
    setSelectedField(updatedField);
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      const response = await fetch(`${API}/apps/${app}/forms/${form}/acroform-definition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(acroformDefinition)
      });

      if (!response.ok) {
        throw new Error("Failed to save AcroForm definition");
      }

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("saved"), 2000);
    } catch (err) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("saved"), 3000);
    }
  };

  const handleAutoGenerate = async () => {
    setIsProcessing(true);
    try {
      // First, check if we already have a complete AcroForm definition
      if (acroformDefinition && acroformDefinition.fields && acroformDefinition.fields.length > 0) {
        const response = confirm(`This form already has ${acroformDefinition.fields.length} AcroForm fields defined.\n\nWould you like to:\n1. Keep the existing definition (Cancel)\n2. Regenerate from overlay (OK)\n3. Create a new basic template (will overwrite existing)`);

        if (response === null) {
          // User cancelled - keep existing
          setIsProcessing(false);
          return;
        }
      }

      // Try to load existing overlay
      const overlayResponse = await fetch(`${API}/apps/${app}/forms/${form}/template`);

      if (overlayResponse.ok) {
        const overlayData = await overlayResponse.json();
        console.log("Found existing overlay, converting to AcroForm...");

        // Check if overlay actually has fields
        if (overlayData.fields && overlayData.fields.length > 0) {
          const converted = convertOverlayToAcroForm(overlayData, form);
          setAcroformDefinition(converted);

          // Show success message
          alert(`✅ Auto-generated AcroForm definition from existing overlay!\n\nFound ${converted.fields.length} fields and converted them to the new format.`);

          // Auto-save the generated definition
          await handleSave();
        } else {
          // Overlay exists but has no fields, create basic template
          console.log("Overlay exists but has no fields, creating basic template...");
          const basicTemplate = createBasicAcroFormTemplate(form);
          setAcroformDefinition(basicTemplate);

          alert(`✅ Created basic AcroForm template!\n\nSince the existing overlay has no fields, a basic template has been created. You can now customize the fields manually or use AI Detection to analyze the PDF.`);
        }
      } else {
        // No overlay found, try to analyze the PDF directly
        console.log("No overlay found, attempting PDF analysis...");

        const pdfResponse = await fetch(`${API}/apps/${app}/forms/${form}/pdf?inline=true`);
        if (pdfResponse.ok) {
          // For now, create a basic template - in production this would use AI analysis
          const basicTemplate = createBasicAcroFormTemplate(form);
          setAcroformDefinition(basicTemplate);

          alert(`✅ Created basic AcroForm template!\n\nSince no existing overlay was found, a basic template has been created. You can now customize the fields manually or use AI Detection to analyze the PDF.`);
        } else {
          throw new Error("Could not access PDF for analysis");
        }
      }
    } catch (err) {
      console.error("Auto-generation failed:", err);
      alert(`❌ Auto-generation failed: ${err.message}\n\nPlease try using AI Detection instead, or create fields manually.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const createBasicAcroFormTemplate = (formName) => {
    const formTitle = formName.replace(/_/g, " ").replace(/.pdf$/i, "");

    return {
      formMetadata: {
        title: formTitle,
        description: `Basic AcroForm template for ${formTitle}`,
        version: "1.0",
        type: "acroform",
        autoGenerated: true,
        generatedAt: new Date().toISOString()
      },
      fields: [
        {
          id: "applicant_name",
          label: "Applicant Name",
          type: "text",
          page: 0,
          required: true,
          validation: { required: true, minLength: 2, maxLength: 100 },
          properties: { placeholder: "Enter applicant name", defaultValue: "", readOnly: false, maxLength: 100 },
          styling: { fontSize: 12, fontFamily: "Helvetica", textAlign: "left", color: "#000000" },
          aiConfidence: 0.0,
          aiReasoning: "Basic template field - customize as needed"
        },
        {
          id: "business_name",
          label: "Business Name",
          type: "text",
          page: 0,
          required: true,
          validation: { required: true, minLength: 2, maxLength: 100 },
          properties: { placeholder: "Enter business name", defaultValue: "", readOnly: false, maxLength: 100 },
          styling: { fontSize: 12, fontFamily: "Helvetica", textAlign: "left", color: "#000000" },
          aiConfidence: 0.0,
          aiReasoning: "Basic template field - customize as needed"
        },
        {
          id: "contact_email",
          label: "Contact Email",
          type: "email",
          page: 0,
          required: true,
          validation: { required: true, pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" },
          properties: { placeholder: "Enter email address", defaultValue: "", readOnly: false, maxLength: 100 },
          styling: { fontSize: 12, fontFamily: "Helvetica", textAlign: "left", color: "#000000" },
          aiConfidence: 0.0,
          aiReasoning: "Basic template field - customize as needed"
        },
        {
          id: "signature",
          label: "Signature",
          type: "signature",
          page: 0,
          required: true,
          validation: { required: true },
          properties: { placeholder: "Click to sign", defaultValue: "", readOnly: false },
          styling: { fontSize: 12, fontFamily: "Helvetica", textAlign: "center", color: "#000000" },
          aiConfidence: 0.0,
          aiReasoning: "Basic template field - customize as needed"
        }
      ],
      formSettings: {
        autoSave: true,
        validationMode: "real-time",
        submitBehavior: "download",
        theme: "default"
      }
    };
  };

  const handleAIAnalysis = async (event) => {
    const file = event.target.files[0];
    if (!file || !file.type.includes("pdf")) {
      alert("Please select a valid PDF file");
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const response = await fetch(`${API}/ai-analyze-pdf`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("AI analysis failed");
      }

      const analysisData = await response.json();
      const suggestions = processAISuggestions(analysisData.fields);
      setAiSuggestions(suggestions);
    } catch (err) {
      alert(`AI analysis failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processAISuggestions = (aiFields) => {
    return aiFields.map((field, index) => ({
      id: `ai_field_${index + 1}`,
      label: field.label || `Field ${index + 1}`,
      type: field.type || "text",
      page: field.page || 0,
      required: true,
      validation: getDefaultValidation(field.type || "text"),
      properties: getDefaultProperties(field.type || "text"),
      styling: {
        fontSize: 12,
        fontFamily: "Helvetica",
        textAlign: "left",
        color: "#000000"
      },
      aiConfidence: field.confidence || 0.5,
      aiReasoning: field.reasoning || "AI detected form field"
    }));
  };

  const applyAISuggestions = (selectedSuggestions) => {
    const newFields = selectedSuggestions.map(suggestion => ({
      ...suggestion,
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }));

    setAcroformDefinition(prev => ({
      ...prev,
      fields: [...prev.fields, ...newFields]
    }));

    setAiSuggestions([]);
  };

  // Auth check
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="access-denied">
        <h1 className="denied-title">Access Denied</h1>
        <p className="denied-message">Admin privileges required to access the AcroForm Field Editor.</p>
        <Link to="/dashboard" className="return-button">
          ← Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="acroform-field-editor">
      <div className="editor-header">
        <div className="header-content">
          <h1>🎯 AcroForm Field Editor</h1>
          <p>Design and configure form fields for {form.replace(/_/g, " ")}</p>
        </div>
        <div className="header-actions">
          {acroformDefinition && acroformDefinition.fields && acroformDefinition.fields.length > 0 && (
            <div className="status-badge" style={{
              background: "#d1fae5",
              color: "#065f46",
              padding: "8px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
              border: "1px solid #10b981"
            }}>
              ✅ {acroformDefinition.fields.length} fields configured
            </div>
          )}
          <button
            className="auto-generate-btn"
            onClick={handleAutoGenerate}
            disabled={isProcessing}
            title="Auto-generate from existing overlay or PDF"
          >
            {isProcessing ? "🔄 Generating..." : "🔄 Auto-Generate"}
          </button>
          <button
            className="ai-analysis-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            title="AI-powered field detection from PDF"
          >
            {isProcessing ? "🤖 Analyzing..." : "🤖 AI Detection"}
          </button>
          <button className="save-btn" onClick={handleSave}>
            {saveStatus === "saving" ? "💾 Saving..." :
              saveStatus === "saved" ? "✅ Saved" :
                saveStatus === "error" ? "❌ Error" : "💾 Save"}
          </button>
        </div>
      </div>

      <div className="editor-content">
        <div className="fields-panel">
          <div className="panel-header">
            <h3>Form Fields ({acroformDefinition.fields.length})</h3>
            <button className="add-field-btn" onClick={handleAddField}>
              ➕ Add Field
            </button>
          </div>

          <div className="fields-list">
            {acroformDefinition.fields.map(field => (
              <div
                key={field.id}
                className={`field-item ${selectedField?.id === field.id ? 'selected' : ''}`}
                onClick={() => handleEditField(field)}
              >
                <div className="field-icon">
                  {FIELD_TYPES.find(t => t.value === field.type)?.icon || "📝"}
                </div>
                <div className="field-info">
                  <div className="field-label">{field.label}</div>
                  <div className="field-type">{field.type}</div>
                </div>
                <div className="field-actions">
                  <button
                    className="edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditField(field);
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteField(field.id);
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="field-editor-panel">
          {selectedField ? (
            <FieldEditor
              field={selectedField}
              onUpdate={handleFieldUpdate}
              onClose={() => {
                setSelectedField(null);
                setIsEditing(false);
              }}
            />
          ) : (
            <div className="no-field-selected">
              <div className="placeholder-icon">📝</div>
              <h3>No Field Selected</h3>
              <p>Select a field from the list to edit its properties</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Suggestions Panel */}
      {aiSuggestions.length > 0 && (
        <div className="ai-suggestions-panel">
          <div className="panel-header">
            <h3>🤖 AI Field Suggestions</h3>
            <button
              className="apply-all-btn"
              onClick={() => applyAISuggestions(aiSuggestions)}
            >
              Apply All ({aiSuggestions.length})
            </button>
          </div>
          <div className="suggestions-list">
            {aiSuggestions.map(suggestion => (
              <div key={suggestion.id} className="suggestion-item">
                <div className="suggestion-icon">
                  {FIELD_TYPES.find(t => t.value === suggestion.type)?.icon || "📝"}
                </div>
                <div className="suggestion-info">
                  <div className="suggestion-label">{suggestion.label}</div>
                  <div className="suggestion-type">{suggestion.type}</div>
                  <div className="suggestion-confidence">
                    Confidence: {Math.round(suggestion.aiConfidence * 100)}%
                  </div>
                </div>
                <button
                  className="apply-suggestion-btn"
                  onClick={() => applyAISuggestions([suggestion])}
                >
                  ➕ Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleAIAnalysis}
        style={{ display: "none" }}
      />
    </div>
  );
}

// Field Editor Component
function FieldEditor({ field, onUpdate, onClose }) {
  const [editedField, setEditedField] = useState(field);

  useEffect(() => {
    setEditedField(field);
  }, [field]);

  const handleChange = (key, value) => {
    setEditedField(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleValidationChange = (key, value) => {
    setEditedField(prev => ({
      ...prev,
      validation: {
        ...prev.validation,
        [key]: value
      }
    }));
  };

  const handlePropertiesChange = (key, value) => {
    setEditedField(prev => ({
      ...prev,
      properties: {
        ...prev.properties,
        [key]: value
      }
    }));
  };

  const handleStylingChange = (key, value) => {
    setEditedField(prev => ({
      ...prev,
      styling: {
        ...prev.styling,
        [key]: value
      }
    }));
  };

  const handleSave = () => {
    onUpdate(editedField);
  };

  return (
    <div className="field-editor">
      <div className="editor-header">
        <h3>Edit Field: {field.label}</h3>
        <div className="editor-actions">
          <button className="save-field-btn" onClick={handleSave}>
            💾 Save
          </button>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      <div className="editor-content">
        <div className="field-section">
          <h4>Basic Properties</h4>
          <div className="field-row">
            <label>Field ID:</label>
            <input
              type="text"
              value={editedField.id}
              onChange={(e) => handleChange("id", e.target.value)}
              placeholder="unique_field_id"
            />
          </div>
          <div className="field-row">
            <label>Label:</label>
            <input
              type="text"
              value={editedField.label}
              onChange={(e) => handleChange("label", e.target.value)}
              placeholder="Field Label"
            />
          </div>
          <div className="field-row">
            <label>Type:</label>
            <select
              value={editedField.type}
              onChange={(e) => handleChange("type", e.target.value)}
            >
              {FIELD_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field-row">
            <label>Page:</label>
            <input
              type="number"
              min="0"
              value={editedField.page}
              onChange={(e) => handleChange("page", parseInt(e.target.value))}
            />
          </div>
          <div className="field-row">
            <label>
              <input
                type="checkbox"
                checked={editedField.required}
                onChange={(e) => handleChange("required", e.target.checked)}
              />
              Required Field
            </label>
          </div>
        </div>

        <div className="field-section">
          <h4>Validation Rules</h4>
          {editedField.type === "text" || editedField.type === "textarea" ? (
            <>
              <div className="field-row">
                <label>Min Length:</label>
                <input
                  type="number"
                  min="0"
                  value={editedField.validation.minLength || ""}
                  onChange={(e) => handleValidationChange("minLength", parseInt(e.target.value) || undefined)}
                />
              </div>
              <div className="field-row">
                <label>Max Length:</label>
                <input
                  type="number"
                  min="1"
                  value={editedField.validation.maxLength || ""}
                  onChange={(e) => handleValidationChange("maxLength", parseInt(e.target.value) || undefined)}
                />
              </div>
            </>
          ) : null}

          {editedField.type === "email" && (
            <div className="field-row">
              <label>Email Pattern:</label>
              <input
                type="text"
                value={editedField.validation.pattern || ""}
                onChange={(e) => handleValidationChange("pattern", e.target.value)}
                placeholder="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
              />
            </div>
          )}

          {editedField.type === "tel" && (
            <div className="field-row">
              <label>Phone Pattern:</label>
              <input
                type="text"
                value={editedField.validation.pattern || ""}
                onChange={(e) => handleValidationChange("pattern", e.target.value)}
                placeholder="^[\\+]?[1-9]\\d{1,14}$"
              />
            </div>
          )}
        </div>

        <div className="field-section">
          <h4>Field Properties</h4>
          <div className="field-row">
            <label>Placeholder:</label>
            <input
              type="text"
              value={editedField.properties.placeholder || ""}
              onChange={(e) => handlePropertiesChange("placeholder", e.target.value)}
              placeholder="Enter placeholder text"
            />
          </div>
          <div className="field-row">
            <label>Default Value:</label>
            <input
              type="text"
              value={editedField.properties.defaultValue || ""}
              onChange={(e) => handlePropertiesChange("defaultValue", e.target.value)}
              placeholder="Enter default value"
            />
          </div>
          {editedField.type === "text" || editedField.type === "email" || editedField.type === "tel" ? (
            <div className="field-row">
              <label>Max Length:</label>
              <input
                type="number"
                min="1"
                value={editedField.properties.maxLength || ""}
                onChange={(e) => handlePropertiesChange("maxLength", parseInt(e.target.value) || undefined)}
              />
            </div>
          ) : null}
        </div>

        <div className="field-section">
          <h4>Styling</h4>
          <div className="field-row">
            <label>Font Size:</label>
            <input
              type="number"
              min="8"
              max="72"
              value={editedField.styling.fontSize || 12}
              onChange={(e) => handleStylingChange("fontSize", parseInt(e.target.value))}
            />
          </div>
          <div className="field-row">
            <label>Text Align:</label>
            <select
              value={editedField.styling.textAlign || "left"}
              onChange={(e) => handleStylingChange("textAlign", e.target.value)}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
