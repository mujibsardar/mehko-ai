import React, { useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth";
import { ENDPOINTS } from "../../config/api";
import { buildApiUrl } from "../../lib/apiBase";
import {
  saveFormData,
  loadFormData,
  pinApplication,
} from "../../firebase/userData";
import useProgress from "../../hooks/useProgress";
import ReportButton from "../generic/ReportButton";
import ReportIssueModal from "../modals/ReportIssueModal";
import "./DynamicForm.scss";

export default function DynamicForm({
  applicationId,
  formName,
  stepId,
  hideCompleteToggle = false,
  application,
  step,
}) {
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
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    const fetchFieldNamesAndData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `${ENDPOINTS.FORM_FIELDS()}?applicationId=${applicationId}&formName=${formName}`
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
      const res = await fetch(buildApiUrl("/fill-pdf"), {
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

  const handleReportClick = () => {
    if (!user) return;
    setIsReportModalOpen(true);
  };

  const handleReportSubmitted = (reportData) => {
    console.log("Form step report submitted:", reportData);
  };

  if (!user) return <p>Please log in to use this feature.</p>;

  if (isLoading) {
    return (
      <div className="dynamic-form">
        <div className="form-header">
          <h2>Loading form...</h2>
        </div>
        <div className="loading">Loading form fields...</div>
      </div>
    );
  }

  return (
    <div className="dynamic-form">
      <div className="form-header">
        <h2>{formName.replace(".pdf", "").replace(/[_-]/g, " ")}</h2>
        {user && (
          <ReportButton
            onClick={handleReportClick}
            size="small"
            variant="subtle"
          >
            Report Issue
          </ReportButton>
        )}
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        {!hideCompleteToggle && (
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
        )}

        <div className="form-status">
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
            <div key={`${field.label}-${index}`} className="form-field">
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

      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        application={application}
        step={step}
        onReportSubmitted={handleReportSubmitted}
      />
    </div>
  );
}
