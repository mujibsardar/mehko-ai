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
        
        // Parse markdown links in the sub-step text
        const renderSubStepText = (text) => {
          // Simple regex to find markdown links [text](url)
          const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
          const parts = [];
          let lastIndex = 0;
          let match;
          
          while ((match = linkRegex.exec(text)) !== null) {
            // Add text before the link
            if (match.index > lastIndex) {
              parts.push(text.slice(lastIndex, match.index));
            }
            
            // Add the link
            parts.push(
              <a 
                key={`link-${match.index}`}
                href={match[2]} 
                target="_blank" 
                rel="noopener noreferrer"
                className="sub-step-link"
              >
                {match[1]}
              </a>
            );
            
            lastIndex = match.index + match[0].length;
          }
          
          // Add remaining text after the last link
          if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex));
          }
          
          return parts.length > 0 ? parts : text;
        };
        
        return (
          <div key={index} className="sub-step-item">
            <div className="sub-step-content">
              <span className="sub-step-bullet">•</span>
              <span className="sub-step-text">
                {renderSubStepText(subStepText)}
              </span>
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
      
      // For non-sub-step lines, render as regular markdown
      return (
        <div key={index} className="content-line">
          {trimmedLine}
        </div>
      );
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
