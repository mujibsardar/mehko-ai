import useApplicationSidebarState from "../../hooks/useApplicationSidebarState";

import "./Sidebar.scss";

const Sidebar = ({
  applications,
  activeApplicationId,
  onRemove,
  activeSection,
  setActiveSection,
  onSelect,
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
                <div
                  className="sidebar-app-title"
                  onClick={() => {
                    onSelect(application.id);
                  }}
                >
                  {application.title}
                </div>

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
              </div>

              {!isAppCollapsed && isActive && (
                <ul className="sidebar-sublist">
                  <li
                    className={activeSection === "overview" ? "active" : ""}
                    onClick={() => {
                      setActiveSection("overview");
                      toggle(
                        setCollapsedSteps,
                        collapsedSteps,
                        application.id,
                        true
                      ); // collapse steps
                      toggle(
                        setCollapsedSupport,
                        collapsedSupport,
                        application.id,
                        true
                      ); // collapse support
                    }}
                  >
                    Overview ({application.steps?.length || 0} steps)
                  </li>

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
