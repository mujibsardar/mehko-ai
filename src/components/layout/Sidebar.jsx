import useApplicationSidebarState from "../../hooks/useApplicationSidebarState";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import useAuth from "../../hooks/useAuth";
import { useEffect, useState } from "react";

import "./Sidebar.scss";

const Sidebar = ({
  applications,
  activeApplicationId,
  onRemove,
  activeSection,
  setActiveSection,
  onSelect,
  onStepSelect,
  selectedStepId,
}) => {
  const {
    collapsedApps,
    collapsedSteps,
    collapsedSupport,
    setCollapsedApps,
    setCollapsedSteps,
    setCollapsedSupport,
    toggle,
  } = useApplicationSidebarState();

  const { user } = useAuth();
  const [progressByAppId, setProgressByAppId] = useState({});

  useEffect(() => {
    async function fetchProgress() {
      if (!user || !applications.length) return;
      const unsubscribers = [];
      applications.forEach((app) => {
        const ref = doc(db, "users", user.uid, "applicationProgress", app.id);
        const unsub = onSnapshot(ref, (docSnap) => {
          setProgressByAppId((prev) => ({
            ...prev,
            [app.id]: docSnap.exists()
              ? docSnap.data().completedStepIds || []
              : [],
          }));
        });
        unsubscribers.push(unsub);
      });
      return () => unsubscribers.forEach((u) => u());
    }
    fetchProgress();
  }, [user, applications]);

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
          const completedSteps = progressByAppId[application.id] || [];
          const totalSteps = application.steps?.length || 0;
          const completeCount = completedSteps.length;
          const percent =
            totalSteps > 0 ? Math.round((completeCount / totalSteps) * 100) : 0;

          const hasComments = Boolean(
            application.supportTools?.commentsEnabled
          );
          // We intentionally HIDE AI assistant in the sidebar now.

          return (
            <div key={application.id} className="sidebar-item-wrapper">
              <div className={`sidebar-item ${isActive ? "active" : ""}`}>
                <div
                  className="sidebar-app-title"
                  onClick={() => onSelect(application.id)}
                >
                  {application.title}
                </div>

                <div className="sidebar-progress">
                  <div className="sidebar-progress-bar">
                    <div
                      className="sidebar-progress-fill"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <small>
                    {completeCount} of {totalSteps} steps complete
                  </small>
                </div>

                {isActive && (
                  <div className="sidebar-controls">
                    <button
                      className="collapse-btn"
                      onClick={() =>
                        toggle(setCollapsedApps, collapsedApps, application.id)
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
                )}
              </div>

              {!isAppCollapsed && isActive && (
                <div
                  className="sidebar-sublist"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    maxHeight: "60vh", // adjust if needed
                  }}
                >
                  {/* Overview row */}
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    <li
                      className={
                        activeSection === "overview" ? "active-nav" : ""
                      }
                      onClick={() => {
                        setActiveSection("overview");
                        toggle(
                          setCollapsedSteps,
                          collapsedSteps,
                          application.id,
                          true
                        );
                        toggle(
                          setCollapsedSupport,
                          collapsedSupport,
                          application.id,
                          true
                        );
                      }}
                    >
                      Overview ({application.steps?.length || 0} steps)
                    </li>

                    {/* Steps header */}
                    <li className="sidebar-section-label">
                      <span
                        className="collapsible-section"
                        onClick={() =>
                          toggle(
                            setCollapsedSteps,
                            collapsedSteps,
                            application.id
                          )
                        }
                      >
                        {areStepsCollapsed ? "▶" : "▼"} Steps
                      </span>
                    </li>
                  </ul>

                  {/* Steps list (scrollable) */}
                  <ul
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: 0,
                      flex: 1,
                      overflowY: "auto",
                    }}
                  >
                    {!areStepsCollapsed &&
                      application.steps?.map((step, idx) => {
                        const isStepActive =
                          activeSection === "steps" &&
                          selectedStepId === step.id;
                        return (
                          <li
                            key={step.id}
                            className={`step-item ${
                              isStepActive ? "active-nav" : ""
                            }`}
                            onClick={() =>
                              onStepSelect && onStepSelect(step.id)
                            }
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                              }}
                            >
                              <span>
                                Step {idx + 1}: {step.title}
                              </span>
                              <small style={{ color: "#666", fontSize: 11 }}>
                                {step.action_required
                                  ? "Requires Action"
                                  : "Info Only"}
                                {step.fill_pdf ? " • PDF Form" : ""}
                              </small>
                            </div>
                            {completedSteps.includes(step.id) && (
                              <span className="checkmark">✔</span>
                            )}
                          </li>
                        );
                      })}
                  </ul>

                  {/* Support block (fixed at bottom) */}
                  {hasComments && (
                    <div
                      style={{
                        borderTop: "1px solid #eee",
                        padding: "8px 12px",
                        flexShrink: 0,
                      }}
                    >
                      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                        <li className="sidebar-section-label">
                          <span
                            className="collapsible-section"
                            onClick={() =>
                              toggle(
                                setCollapsedSupport,
                                collapsedSupport,
                                application.id
                              )
                            }
                          >
                            {isSupportCollapsed ? "▶" : "▼"} Support
                          </span>
                        </li>

                        {!isSupportCollapsed && (
                          <li
                            className={`sidebar-support-item ${
                              activeSection === "comments" ? "active-nav" : ""
                            }`}
                            onClick={() => setActiveSection("comments")}
                          >
                            Community Comments
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </ul>
    </div>
  );
};

export default Sidebar;
