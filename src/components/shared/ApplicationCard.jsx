import "./ApplicationCard.scss";

const ApplicationCard = ({ application, onClick }) => {
  return (
    <div className="application-card" onClick={onClick}>
      <div className="application-card-inner">
        <h3>{application.title}</h3>
        <p>Click to view application steps</p>
      </div>
    </div>
  );
};

export default ApplicationCard;
