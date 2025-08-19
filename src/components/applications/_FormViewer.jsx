import useAuth from "../../hooks/useAuth";
import useProgress from "../../hooks/useProgress";
import "./FormViewer.scss";

function FormViewer({ applicationId, stepId, _formName, _isPdf }) {
  const { user } = useAuth();
  const { completedSteps, markStepComplete, markStepIncomplete } = useProgress(
    user?.uid,
    applicationId
  );

  const isComplete = completedSteps.includes(stepId);

  return (
    <div className="form-viewer">
      <h3>Permit Forms</h3>
      <ul className="form-list">
        {forms.map((form, idx) => (
          <li key={idx}>
            <a href={form.fileUrl} target="_blank" rel="noopener noreferrer">
              {form.label}
            </a>
          </li>
        ))}
      </ul>
      {user && (
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
          Mark this step as complete
        </label>
      )}
    </div>
  );
}

export default FormViewer;
