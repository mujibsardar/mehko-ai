import "./ApplicationOverview.scss";

function ApplicationOverview({ application }) {
  if (!application) return null;

  return (
    <div className="application-view">
      <h2>{application.title}</h2>
      <p>{application.description}</p>

      {application.steps && <ApplicationSteps steps={application.steps} />}
    </div>
  );
}

export default ApplicationOverview;
