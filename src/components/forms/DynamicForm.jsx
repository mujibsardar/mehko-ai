import React, { useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth";
import {
  saveFormData,
  loadFormData,
  pinApplication,
} from "../../firebase/userData";
import useProgress from "../../hooks/useProgress";
import "./DynamicForm.scss";

export default function DynamicForm({ applicationId, formName, stepId }) {
  const { user } = useAuth();
  const { completedSteps, markStepComplete, markStepIncomplete } = useProgress(
    user?.uid,
    applicationId
  );
  const isComplete = completedSteps.includes(stepId);
  const [fieldNames, setFieldNames] = useState([]);
  const [formData, setFormData] = useState({});
  const [status, setStatus] = useState("idle"); // "idle" | "saving" | "saved" | "error"
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFieldNamesAndData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `http://localhost:3000/api/form-fields?applicationId=${applicationId}&formName=${formName}`
        );
        const data = await res.json();
        setFieldNames(data.fields || []);

        if (user) {
          const savedData = await loadFormData(
            user.uid,
            applicationId,
            formName
          );
          setFormData(savedData || {});
        }
      } catch (err) {
        console.error("Error fetching fields or saved form data", err);
      }
      setIsLoading(false);
    };

    fetchFieldNamesAndData();
  }, [applicationId, formName, user]);

  const handleChange = async (e) => {
    const newData = {
      ...formData,
      [e.target.name]: e.target.value,
    };

    setFormData(newData);
    setStatus("saving");

    if (user) {
      try {
        await saveFormData(user.uid, applicationId, formName, newData);
        await pinApplication(user.uid, applicationId, "form");
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 1500);
      } catch (err) {
        console.error("Failed to save form data", err);
        setStatus("error");
      }
    }
  };

  const handleReset = () => {
    setFormData({});
    setStatus("idle");
  };

  const handleDownload = async () => {
    try {
      const res = await fetch("/api/fill-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, formName, formData }),
      });

      if (!res.ok) throw new Error("PDF generation failed");

      // The response is JSON with { url }
      const { url } = await res.json();
      // Redirect the browser to download the file
      window.location.href = url;
    } catch (err) {
      console.error("Error downloading PDF:", err);
      alert("Something went wrong generating the PDF.");
    }
  };

  if (!user) return <p>Please log in to use this feature.</p>;

  if (isLoading) {
    return (
      <div className="form-loading">
        <div className="spinner" />
        <p>Loading form...</p>
      </div>
    );
  }

  return (
    <form className="dynamic-form" onSubmit={(e) => e.preventDefault()}>
      <div className="step-complete-checkbox">
        <label>
          <input
            type="checkbox"
            checked={isComplete}
            onChange={(e) => {
              if (e.target.checked) {
                markStepComplete(stepId);
              } else {
                markStepIncomplete(stepId);
              }
            }}
          />
          Mark this step as complete
        </label>
      </div>
      <div className="dynamic-form-header">
        <h4>{formName.replace(".pdf", "").replace(/[_-]/g, " ")}</h4>
        <span className={`status ${status}`}>
          {status === "saving"
            ? "Saving..."
            : status === "saved"
            ? "Saved ✅"
            : status === "error"
            ? "Error ❌"
            : ""}
        </span>
      </div>

      {fieldNames.map((field, index) => {
        return (
          <div key={`${field.label}-${index}`} className="dynamic-form-field">
            <label>{field.label || field.name}</label>
            <input
              type="text"
              name={field.name}
              value={formData[field.name] || ""}
              onChange={handleChange}
            />
            {field.description && (
              <small className="field-description">{field.description}</small>
            )}
          </div>
        );
      })}

      <div className="form-actions">
        <button type="button" onClick={handleReset}>
          Reset Form
        </button>
        <button type="button" onClick={handleDownload}>
          Download Filled PDF
        </button>
      </div>
    </form>
  );
}
