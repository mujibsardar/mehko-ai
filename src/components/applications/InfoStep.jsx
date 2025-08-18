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

  const isComplete = completedSteps.includes(step.id);

  return (
    <div className="info-step">
      <h2>{step.title}</h2>

      {step.content ? (
        <ReactMarkdown>{step.content}</ReactMarkdown>
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
                markStepComplete(step.id);
              } else {
                markStepIncomplete(step.id);
              }
            }}
          />
          Mark this step as complete
        </label>
      )}
    </div>
  );
}

export default InfoStep;
