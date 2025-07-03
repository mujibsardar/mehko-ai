import "./ApplicationCard.scss";

const ApplicationCard = ({ application, completedSteps = [], onClick }) => {
  const total = application.steps?.length || 0;
  const done = completedSteps.length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="application-card" onClick={onClick}>
      <div className="application-card-inner">
        <h3>{application.title}</h3>
        <p>{application.description}</p>
        {application.rootDomain && (
          <div className="application-source">
            <small>Source: {application.rootDomain}</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationCard;
