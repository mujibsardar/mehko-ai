import { useState } from "react";
import "./InfoStep.scss";
import ReactMarkdown from "react-markdown";
import useAuth from "../../hooks/useAuth";
import useProgress from "../../hooks/useProgress";
import ReportButton from "../generic/ReportButton";
import ReportIssueModal from "../modals/ReportIssueModal";

function InfoStep({ step, applicationId, hideCompleteToggle, application }) {
  const { user } = useAuth();
  const { completedSteps, markStepComplete, markStepIncomplete } = useProgress(
    user?.uid,
    applicationId
  );
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const stepId = step.id || step._id;
  const isComplete = completedSteps.includes(stepId);

  const handleReportClick = () => {
    if (!user) return;
    setIsReportModalOpen(true);
  };

  const handleReportSubmitted = (reportData) => {
    console.log("Step report submitted:", reportData);
  };

  return (
    <div className="info-step">
      <div className="step-header">
        <h2>{step.title}</h2>
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

      {step.content ? (
        <ReactMarkdown
          components={{
            a: ({ node, ...props }) => (
              <a {...props} target="_blank" rel="noopener noreferrer" />
            ),
          }}
        >
          {step.content}
        </ReactMarkdown>
      ) : (
        <p>No additional information available for this step.</p>
      )}

      {user && !hideCompleteToggle && (
        <label className="step-complete-checkbox">
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
          {step.action_required
            ? "Mark this step as complete"
            : "Mark this step as read"}
        </label>
      )}

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

export default InfoStep;
