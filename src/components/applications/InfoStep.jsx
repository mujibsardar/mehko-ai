import "./InfoStep.scss";
import ReactMarkdown from "react-markdown";

function InfoStep({ step }) {
  if (!step) return null;

  return (
    <div className="info-step">
      <h2>{step.title}</h2>
      {step.content ? (
        <ReactMarkdown>{step.content}</ReactMarkdown>
      ) : (
        <p>No additional information available for this step.</p>
      )}
    </div>
  );
}

export default InfoStep;
