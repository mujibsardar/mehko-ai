import ApplicationSteps from "./ApplicationSteps";
import "./ApplicationView.scss";

function ApplicationView({ application }) {
  if (!application) return null;

  return (
    <div className="application-view">
      <h2>{application.title}</h2>
      <p>{application.description}</p>

      {application.steps && (
        <ApplicationSteps
          steps={application.steps}
          requirements={application.requirements}
        />
      )}
    </div>
  );
}

export default ApplicationView;
