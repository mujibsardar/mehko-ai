import React, { useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import ApplicationCardGrid from "./components/layout/ApplicationCardGrid";
import ApplicationView from "./components/applications/ApplicationView";
import Header from "./components/layout/Header";

import "./styles/app.scss";

function App() {
  console.log("App loaded");
  const [selectedApplications, setSelectedApplications] = useState([]);
  const [activeApplicationId, setActiveApplicationId] = useState(null);

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
          onSelect={handleApplicationSwitch}
          onRemove={handleApplicationRemove}
        />
        <main className="main-content">
          {activeApplication ? (
            <ApplicationView application={activeApplication} />
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
