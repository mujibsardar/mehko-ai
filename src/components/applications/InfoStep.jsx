import { useState } from "react";
import "./InfoStep.scss";
import useAuth from "../../hooks/useAuth";
import useProgress from "../../hooks/useProgress";
import ReportButton from "../generic/ReportButton";
import ReportIssueModal from "../modals/ReportIssueModal";
import SubStepActions from "./SubStepActions";

function InfoStep({ step, applicationId, hideCompleteToggle, application, onCommentRequest }) {
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

  // Enhanced content formatting function
  const formatText = (text) => {
    if (!text) return text;

    // Replace markdown bold syntax with styled spans
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace markdown italic syntax
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Replace markdown code syntax
    formattedText = formattedText.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Replace markdown links [text](url)
    formattedText = formattedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    return formattedText;
  };

  // Parse markdown content to identify sub-steps and add action buttons
  const renderContentWithActions = (content) => {
    if (!content) return null;

    // Split content into lines to identify sub-steps
    const lines = content.split('\n');
    
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      // Check if this line is a sub-step (starts with - or *)
      if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
        const subStepText = trimmedLine.substring(1).trim();
        
        return (
          <div key={index} className="sub-step-item">
            <div className="sub-step-content">
              <div 
                className="sub-step-text"
                dangerouslySetInnerHTML={{ __html: formatText(subStepText) }}
              />
            </div>
            <SubStepActions
              subStepText={subStepText}
              stepId={stepId}
              applicationId={applicationId}
              application={application}
              onCommentRequest={onCommentRequest}
            />
          </div>
        );
      }
      
      // For non-sub-step lines, render as regular formatted content
      if (trimmedLine) {
        return (
          <div key={index} className="content-line">
            <div 
              dangerouslySetInnerHTML={{ __html: formatText(trimmedLine) }}
            />
          </div>
        );
      }
      
      // Empty lines for spacing
      return <div key={index} className="content-line empty-line"></div>;
    });
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
        <div className="step-content">
          {renderContentWithActions(step.content)}
        </div>
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
