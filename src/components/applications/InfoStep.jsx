import "./InfoStep.scss";
import ReactMarkdown from "react-markdown";
import useAuth from "../../hooks/useAuth";
import useProgress from "../../hooks/useProgress";

function InfoStep({ step, applicationId, hideCompleteToggle }) {
  const { user } = useAuth();
  const { completedSteps, markStepComplete, markStepIncomplete } = useProgress(
    user?.uid,
    applicationId
  );

  const stepId = step.id || step._id;
  const isComplete = completedSteps.includes(stepId);

  return (
    <div className="info-step">
      <h2>{step.title}</h2>

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
    </div>
  );
}

export default InfoStep;
