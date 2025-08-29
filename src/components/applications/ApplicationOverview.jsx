import { useState } from "react";
import ApplicationSteps from "./ApplicationSteps";
import ReportButton from "../generic/ReportButton";
import ReportIssueModal from "../modals/ReportIssueModal";
import useAuth from "../../hooks/useAuth";
import "./ApplicationOverview.scss";

function ApplicationOverview({ application }) {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const { user } = useAuth();

  if (!application) return null;

  const handleReportClick = () => {
    if (!user) {
      // Could trigger auth modal here if needed
      return;
    }
    setIsReportModalOpen(true);
  };

  const handleReportSubmitted = (reportData) => {
    console.log("Report _submitted: ", reportData);
    // Could add toast notification here
  };

  return (
    <div className="application-view">
      <div className="application-header">
        <div className="header-content">
          <h2>{application.title}</h2>
          <p>{application.description}</p>
        </div>
        
        {user && (
          <div className="header-actions">
            <ReportButton 
              onClick={handleReportClick}
              size="medium"
              variant="outline"
            >
              Report Issue
            </ReportButton>
          </div>
        )}
      </div>

      {application.steps && <ApplicationSteps steps={application.steps} />}

      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        application={application}
        onReportSubmitted={handleReportSubmitted}
      />
    </div>
  );
}

export default ApplicationOverview;
