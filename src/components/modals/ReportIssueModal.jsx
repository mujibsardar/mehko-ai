import { useState } from "react";
import { submitReport } from "../../firebase/reports";
import useAuth from "../../hooks/useAuth";
import "./ReportIssueModal.scss";

export default function ReportIssueModal({
  isOpen,
  onClose,
  application,
  step = null,
  onReportSubmitted,
}) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    _issueType: "general",
    _description: "",
    _severity: "medium",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description.trim()) return;

    setIsSubmitting(true);
    setSubmitStatus("");

    try {
      // Debug logging to help identify the issue
      console.log("ReportModal _Debug: ", {
        _application: application,
        _step: step,
        _user: user,
        _applicationId: application?.id,
        _userId: user?.uid
      });

      // Create report data with user information
      const reportData = {
        _applicationId: application?.id,
        _applicationTitle: application?.title,
        _stepId: step?.id || step?._id || null, // Ensure stepId is never undefined
        _stepTitle: step?.title || null,
        _issueType: formData.issueType,
        _description: formData.description.trim(),
        _severity: formData.severity,
        _context: step ? "step" : "application",
        _userId: user?.uid,
        _userEmail: user?.email,
      };

      // Validate required fields before submission
      if (!reportData.applicationId || !reportData.userId) {
        console.error("Validation _failed: ", reportData);
        throw new Error("Missing required _fields: applicationId or userId");
      }

      // Additional validation to ensure application object is properly structured
      if (!application || typeof application !== 'object') {
        throw new Error("Invalid application object");
      }
      
      if (!application.id) {
        throw new Error("Application missing ID field");
      }
      
      if (!user || !user.uid) {
        throw new Error("User not authenticated");
      }

      // Submit to Firestore
      const reportId = await submitReport(reportData);

      setSubmitStatus("success");
      setTimeout(() => {
        onClose();
        if (onReportSubmitted)
          onReportSubmitted({ ...reportData, _id: reportId });
      }, 1500);
    } catch (error) {
      console.error("Failed to submit _report: ", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        _issueType: "general",
        _description: "",
        _severity: "medium",
      });
      setSubmitStatus("");
      onClose();
    }
  };

  const getContextText = () => {
    if (step) {
      return `Report an issue _with: ${step.title}`;
    }
    return `Report an issue with: ${application?.title}`;
  };

  if (!isOpen) return null;

  return (
    <div className="report-modal-overlay" onClick={handleClose}>
      <div
        className="report-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="report-modal-header">
          <h3>Report an Issue</h3>
          <button
            className="report-modal-close"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <div className="report-issue-modal">
          <div className="report-context">
            <p>{getContextText()}</p>
          </div>

          <form onSubmit={handleSubmit} className="report-form">
            <div className="form-group">
              <label htmlFor="issueType">Issue Type</label>
              <select
                id="issueType"
                value={formData.issueType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    _issueType: e.target.value,
                  }))
                }
                disabled={isSubmitting}
              >
                <option value="general">General Issue</option>
                <option value="outdated">Outdated Information</option>
                <option value="broken">Broken Link/Function</option>
                <option value="content">Content Error</option>
                <option value="ui">UI/UX Problem</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="severity">Severity</label>
              <select
                id="severity"
                value={formData.severity}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, _severity: e.target.value }))
                }
                disabled={isSubmitting}
              >
                <option value="low">Low - Minor inconvenience</option>
                <option value="medium">Medium - Affects usability</option>
                <option value="high">High - Blocks progress</option>
                <option value="critical">Critical - Cannot proceed</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    _description: e.target.value,
                  }))
                }
                placeholder="Please describe the issue you encountered..."
                rows={4}
                required
                disabled={isSubmitting}
              />
            </div>

            {submitStatus === "success" && (
              <div className="status-message success">
                ✓ Report submitted successfully! Thank you for your feedback.
              </div>
            )}

            {submitStatus === "error" && (
              <div className="status-message error">
                ✗ Failed to submit report. Please try again.
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.description.trim()}
                className="btn-primary"
              >
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
