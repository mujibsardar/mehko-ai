import React, { useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import ApplicationCardGrid from "./components/layout/ApplicationCardGrid";
import ApplicationOverview from "./components/applications/ApplicationOverview";
import Header from "./components/layout/Header";
import AIChat from "./components/applications/AIChat";
import CommentsSection from "./components/applications/CommentsSection";
import InfoStep from "./components/applications/InfoStep";

import "./styles/app.scss";
import DynamicForm from "./components/forms/DynamicForm";

function App() {
  console.log("App loaded");
  const [selectedApplications, setSelectedApplications] = useState([]);
  const [activeApplicationId, setActiveApplicationId] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");

  const handleApplicationSelect = (application) => {
    const alreadyAdded = selectedApplications.find(
      (c) => c.id === application.id
    );
    if (!alreadyAdded) {
      setSelectedApplications([...selectedApplications, application]);
    }
    setActiveApplicationId(application.id);
  };

  const handleApplicationSwitch = (applicationId) => {
    setActiveApplicationId(applicationId);
  };

  const handleApplicationRemove = (applicationId) => {
    const updated = selectedApplications.filter((c) => c.id !== applicationId);
    setSelectedApplications(updated);
    if (activeApplicationId === applicationId) {
      setActiveApplicationId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const activeApplication = selectedApplications.find(
    (c) => c.id === activeApplicationId
  );

  return (
    <>
      <Header />
      <div className="app-wrapper">
        <Sidebar
          applications={selectedApplications}
          activeApplicationId={activeApplicationId}
          onRemove={handleApplicationRemove}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
        />
        <main className="main-content">
          {activeApplication ? (
            <>
              {activeSection === "overview" && (
                <ApplicationOverview application={activeApplication} />
              )}

              {activeSection.startsWith("step:") &&
                (() => {
                  const stepId = activeSection.split(":")[1];
                  const step = activeApplication.steps?.find(
                    (s) => s.id === stepId
                  );
                  if (!step) return <p>Step not found.</p>;

                  if (step.type === "form") {
                    return (
                      <DynamicForm
                        applicationId={activeApplication.id}
                        formName={step.formName}
                        isPdf={step.isPdf}
                      />
                    );
                  }

                  if (step.type === "info") {
                    return <InfoStep step={step} />;
                  }

                  return <p>Unsupported step type.</p>;
                })()}

              {activeSection === "ai" && (
                <AIChat application={activeApplication} />
              )}
              {activeSection === "comments" && (
                <CommentsSection application={activeApplication} />
              )}
            </>
          ) : (
            <ApplicationCardGrid
              onApplicationSelect={handleApplicationSelect}
            />
          )}
        </main>
      </div>
    </>
  );
}

export default App;
