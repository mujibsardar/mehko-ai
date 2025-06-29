import ApplicationSteps from "./ApplicationSteps";
import AIChat from "./AIChat";
import CommentsSection from "./CommentsSection";
import DynamicForm from "../forms/DynamicForm";

const handlePdfSubmit = async (formData) => {
  console.log("Filled data:", formData);
  // TODO: Send to backend /api/fill-pdf and trigger download
};

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

      {application.pdfForms?.map((form) => (
        <DynamicForm
          key={form.file}
          applicationId={application.id}
          formName={form.file}
          onSubmit={handlePdfSubmit}
        />
      ))}

      {application.aiEnabled && <AIChat application={application} />}
      {application.commentsEnabled && (
        <CommentsSection application={application} />
      )}
    </div>
  );
}

export default ApplicationView;
