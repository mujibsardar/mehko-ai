import React from "react";
import "./ApplicationSteps.scss";

function ApplicationSteps({ steps = [], requirements = [] }) {
  return (
    <div className="application-steps">
      {steps.length > 0 && (
        <div className="steps-section">
          <h3>How to Apply</h3>
          <ol className="steps-list">
            {steps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {requirements.length > 0 && (
        <div className="requirements-section">
          <h4>Requirements</h4>
          <ul className="requirements-list">
            {requirements.map((req, idx) => (
              <li key={idx}>{req}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ApplicationSteps;
