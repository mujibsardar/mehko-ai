import React, { useState } from "react";
import "./Sidebar.scss";

const Sidebar = ({
  applications,
  activeApplicationId,
  onRemove,
  activeSection,
  setActiveSection,
  onSelect,
}) => {
  const [collapsedApps, setCollapsedApps] = useState({});
  const [collapsedSteps, setCollapsedSteps] = useState({});
  const [collapsedSupport, setCollapsedSupport] = useState({});

  const toggleCollapse = (map, setMap, appId) => {
    setMap((prev) => ({
      ...prev,
      [appId]: !prev[appId],
    }));
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Your Applications</h3>
      </div>

      <ul className="sidebar-list">
        {applications.map((application) => {
          const isActive = application.id === activeApplicationId;
          const isAppCollapsed = collapsedApps[application.id];
          const areStepsCollapsed = collapsedSteps[application.id];
          const isSupportCollapsed = collapsedSupport[application.id];

          return (
            <div key={application.id} className="sidebar-item-wrapper">
              <div className={`sidebar-item ${isActive ? "active" : ""}`}>
                <span
                  className="app-title"
                  onClick={() => {
                    onSelect(application.id);
                    setActiveSection("overview");
                  }}
                >
                  {application.title}
                </span>
                <div className="sidebar-controls">
                  <button
                    className="collapse-btn"
                    onClick={() =>
                      toggleCollapse(
                        collapsedApps,
                        setCollapsedApps,
                        application.id
                      )
                    }
                  >
                    {isAppCollapsed ? "▶" : "▼"}
                  </button>
                  <button
                    className="remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(application.id);
                    }}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {!isAppCollapsed && isActive && (
                <ul className="sidebar-sublist">
                  <li
                    className={activeSection === "overview" ? "active" : ""}
                    onClick={() => setActiveSection("overview")}
                  >
                    Overview
                  </li>

                  <li className="sidebar-section-label">
                    <span
                      className="collapsible-section"
                      onClick={() =>
                        toggleCollapse(
                          collapsedSteps,
                          setCollapsedSteps,
                          application.id
                        )
                      }
                    >
                      {areStepsCollapsed ? "▶" : "▼"} Steps
                    </span>
                  </li>

                  {!areStepsCollapsed &&
                    application.steps?.map((step, idx) => (
                      <li
                        key={step.id}
                        className={
                          activeSection === `step:${step.id}`
                            ? "active step-item"
                            : "step-item"
                        }
                        onClick={() => setActiveSection(`step:${step.id}`)}
                      >
                        Step {idx + 1}: {step.title}
                      </li>
                    ))}

                  {(application.supportTools?.aiEnabled ||
                    application.supportTools?.commentsEnabled) && (
                    <>
                      <li className="sidebar-section-label">
                        <span
                          className="collapsible-section"
                          onClick={() =>
                            toggleCollapse(
                              collapsedSupport,
                              setCollapsedSupport,
                              application.id
                            )
                          }
                        >
                          {isSupportCollapsed ? "▶" : "▼"} Support
                        </span>
                      </li>

                      {!isSupportCollapsed && (
                        <>
                          {application.supportTools?.aiEnabled && (
                            <li
                              className={`sidebar-support-item ${
                                activeSection === "ai" ? "active" : ""
                              }`}
                              onClick={() => setActiveSection("ai")}
                            >
                              Ask the Assistant
                            </li>
                          )}

                          {application.supportTools?.commentsEnabled && (
                            <li
                              className={`sidebar-support-item ${
                                activeSection === "comments" ? "active" : ""
                              }`}
                              onClick={() => setActiveSection("comments")}
                            >
                              Community Comments
                            </li>
                          )}
                        </>
                      )}
                    </>
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </ul>
    </div>
  );
};

export default Sidebar;
