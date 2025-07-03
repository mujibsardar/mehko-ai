import React, { useState, useEffect } from "react";
import Sidebar from "./components/layout/Sidebar";
import ApplicationCardGrid from "./components/layout/ApplicationCardGrid";
import ApplicationOverview from "./components/applications/ApplicationOverview";
import Header from "./components/layout/Header";
import AIChat from "./components/applications/AIChat";
import CommentsSection from "./components/applications/CommentsSection";
import InfoStep from "./components/applications/InfoStep";
import usePinnedApplications from "./hooks/usePinnedApplications";
import { doc, onSnapshot, collection } from "firebase/firestore";
import { db } from "./firebase/firebase";
import useAuth from "./hooks/useAuth"; // Add if not already present

import "./styles/app.scss";
import DynamicForm from "./components/forms/DynamicForm";

function App() {
  console.log("App loaded");
  const { applications: pinnedApplications, loading } = usePinnedApplications();
  const [selectedApplications, setSelectedApplications] = useState([]);
  const [activeApplicationId, setActiveApplicationId] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const { user } = useAuth();
  const [enrichedApplication, setEnrichedApplication] = useState(null);

  useEffect(() => {
    if (!loading && pinnedApplications.length > 0) {
      setSelectedApplications(pinnedApplications);
    }
  }, [loading, pinnedApplications]);

  const handleApplicationSelect = (application) => {
    const alreadyAdded = selectedApplications.find(
      (c) => c.id === application.id
    );
    if (!alreadyAdded) {
      setSelectedApplications([...selectedApplications, application]);
    }

    setActiveApplicationId(application.id);
    setActiveSection("overview");
  };

  const handleApplicationSwitch = (applicationId) => {
    setActiveApplicationId(applicationId);
    setActiveSection("overview");
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

  useEffect(() => {
    if (!user || !activeApplicationId) {
      setEnrichedApplication(null);
      return;
    }

    const base = selectedApplications.find((a) => a.id === activeApplicationId);
    if (!base) return;

    const unsub1 = onSnapshot(
      doc(db, "users", user.uid, "applicationProgress", base.id),
      (snap) => {
        const completedStepIds = snap.exists()
          ? snap.data().completedStepIds || []
          : [];
        setEnrichedApplication((prev) => ({
          ...(prev || base),
          completedStepIds,
        }));
      }
    );

    const unsub2 = onSnapshot(
      collection(db, "applications", base.id, "comments"),
      (snap) => {
        const comments = snap.docs.map((doc) => doc.data());
        setEnrichedApplication((prev) => ({
          ...(prev || base),
          comments,
        }));
      }
    );

    // Set base initially so the UI doesn't wait
    setEnrichedApplication(base);

    return () => {
      unsub1();
      unsub2();
    };
  }, [user, activeApplicationId, selectedApplications]);

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
          onSelect={handleApplicationSwitch}
        />

        <main className="main-content">
          {activeApplication && (
            <div
              style={{
                marginBottom: "1rem",
                fontSize: "0.9rem",
                color: "#666",
              }}
            >
              Home &gt; {activeApplication.title}
              {activeSection && activeSection !== "overview" && (
                <>
                  {" "}
                  &gt;{" "}
                  {activeSection.startsWith("step:")
                    ? `Step: ${
                        activeApplication.steps.find(
                          (s) => s.id === activeSection.split(":")[1]
                        )?.title || "Unknown"
                      }`
                    : activeSection === "ai"
                    ? "AI Assistant"
                    : activeSection === "comments"
                    ? "Community Comments"
                    : ""}
                </>
              )}
            </div>
          )}
          {selectedApplications.length > 0 && activeApplicationId && (
            <button
              style={{
                margin: "1rem 0",
                padding: "0.5rem 1rem",
                border: "1px solid #ccc",
                borderRadius: "6px",
                background: "#f5f5f5",
                cursor: "pointer",
              }}
              onClick={() => {
                setActiveApplicationId(null);
                setActiveSection(null);
              }}
            >
              ← Back to Application Grid
            </button>
          )}

          {selectedApplications.length === 0 || !activeApplication ? (
            <ApplicationCardGrid
              onApplicationSelect={handleApplicationSelect}
            />
          ) : (
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
                        stepId={step.id}
                        formName={step.formName}
                      />
                    );
                  }

                  if (step.type === "info") {
                    return (
                      <InfoStep
                        step={step}
                        applicationId={activeApplication.id}
                      />
                    );
                  }

                  return <p>Unsupported step type.</p>;
                })()}

              {activeSection === "ai" && enrichedApplication && (
                <AIChat application={enrichedApplication} />
              )}

              {activeSection === "comments" && (
                <CommentsSection application={activeApplication} />
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}

export default App;
