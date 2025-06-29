// import React from "react";
import ApplicationSteps from "./ApplicationSteps";
// import FormViewer from "./FormViewer";
import AIChat from "./AIChat";
import CommentsSection from "./CommentsSection";
import DynamicForm from "../forms/DynamicForm";

const handlePdfSubmit = async (formData) => {
  console.log("Filled data:", formData);
  // TODO: send to /api/fill-pdf and trigger download
};

function CountyView({ county }) {
  return (
    <div className="county-view">
      <h2>{county.name}</h2>
      <p>{county.description}</p>
      <ApplicationSteps
        steps={county.steps}
        requirements={county.requirements}
      />
      {/* TODO: This is Hard Coded */}
      <DynamicForm
        countyId="los_angeles"
        formName="MEHKO_SOP-English.pdf"
        onSubmit={handlePdfSubmit}
      />
      {county.hasAiSupport && <AIChat county={county} />}
      {county.hasCommentThread && <CommentsSection county={county} />}
    </div>
  );
}

export default CountyView;
