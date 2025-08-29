
import "./ApplicationSteps.scss";

function ApplicationSteps({ steps = [] }) {
  return (
    <div className="application-steps">
      {steps.length > 0 && (
        <div className="steps-section">
          <h3>How to Apply</h3>
          <ol className="steps-list">
            {steps.map((step, idx) => (
              <li key={idx}>{step.title}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default ApplicationSteps;
