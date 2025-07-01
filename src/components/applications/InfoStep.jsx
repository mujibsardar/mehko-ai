import "./InfoStep.scss";

function InfoStep({ step }) {
  if (!step) return null;

  return (
    <div className="info-step">
      <h2>{step.title}</h2>
      <p>
        {step.description ||
          "No additional information available for this step."}
      </p>
    </div>
  );
}

export default InfoStep;
