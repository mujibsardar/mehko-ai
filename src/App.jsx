import React, { useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import ApplicationCardGrid from "./components/layout/ApplicationCardGrid";
import ApplicationView from "./components/applications/ApplicationView";
import Header from "./components/layout/Header";
import AIChat from "./components/applications/AIChat";
import CommentsSection from "./components/applications/CommentsSection";

import "./styles/app.scss";
import DynamicForm from "./components/forms/DynamicForm";

function App() {
  console.log("App loaded");
  const [selectedApplications, setSelectedApplications] = useState([]);
  const [activeApplicationId, setActiveApplicationId] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // "forms" | "ai" | "comments"

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
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <main className="main-content">
          {activeApplication ? (
            <>
              {activeTab === "overview" && (
                <ApplicationView application={activeApplication} />
              )}
              {activeTab === "forms" &&
                activeApplication.pdfForms?.map((form) => (
                  <DynamicForm
                    key={form.file}
                    applicationId={activeApplication.id}
                    formName={form.file}
                    label={form.name}
                  />
                ))}
              {activeTab === "ai" && <AIChat application={activeApplication} />}
              {activeTab === "comments" && (
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
