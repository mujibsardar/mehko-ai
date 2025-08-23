import useApplicationSidebarState from "../../hooks/useApplicationSidebarState";
import useAuth from "../../hooks/useAuth";

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
  completedSteps = [], // Add this prop
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

  const { isAdmin } = useAuth();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Your Applications</h3>
        {isAdmin && (
          <div className="admin-indicator">
            <span className="admin-badge">👑</span>
          </div>
        )}
      </div>

      <ul className="sidebar-list">
        {applications.map((application) => {
          const isActive = application.id === activeApplicationId;
          const isAppCollapsed = collapsedApps[application.id];
          const areStepsCollapsed = collapsedSteps[application.id];
          const isSupportCollapsed = collapsedSupport[application.id];
          const totalSteps = application.steps?.length || 0;
          const completeCount = completedSteps.length;
          const percent =
            totalSteps > 0 ? Math.round((completeCount / totalSteps) * 100) : 0;

          const hasComments = Boolean(
            application.supportTools?.commentsEnabled
          );
          // We intentionally HIDE AI assistant in the sidebar now.

          return (
            <div
              key={application.id}
              className="sidebar-item-wrapper"
              onClick={() => onSelect(application.id)}
            >
              <div className={`sidebar-item ${isActive ? "active" : ""}`}>
                <div className="sidebar-app-title">{application.title}</div>

                <div className="sidebar-progress">
                  <div className="sidebar-progress-bar">
                    <div
                      className="sidebar-progress-fill"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="progress-info">
                    <small>
                      {completeCount} of {totalSteps} steps complete
                    </small>
                    <small className="progress-percent">{percent}%</small>
                  </div>
                </div>

                {isActive && (
                  <div className="sidebar-controls">
                    <button
                      className="collapse-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(setCollapsedApps, collapsedApps, application.id);
                      }}
                      title={isAppCollapsed ? "Expand" : "Collapse"}
                    >
                      {isAppCollapsed ? "▶" : "▼"}
                    </button>
                    {/* Only show remove button if no progress has been made */}
                    {completeCount === 0 && (
                      <button
                        className="remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(application.id);
                        }}
                        title="Remove Application"
                      >
                        ✕
                      </button>
                    )}
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
                      onClick={(e) => {
                        e.stopPropagation();
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
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(
                            setCollapsedSteps,
                            collapsedSteps,
                            application.id
                          );
                        }}
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
                        // Use the same ID logic as DashboardApp
                        const stepId = step.id || step._id || String(idx);
                        const isStepActive =
                          activeSection === "steps" &&
                          selectedStepId === stepId;
                        return (
                          <li
                            key={stepId}
                            className={`step-item ${
                              isStepActive ? "active-nav" : ""
                            } ${completedSteps.includes(stepId) ? "completed" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onStepSelect) {
                                onStepSelect(stepId);
                              }
                            }}
                          >
                            <div className="step-content">
                              <span className="step-icon">
                                {step.type === "form" ? "📝" : 
                                 step.type === "pdf" ? "📄" : "ℹ️"}
                              </span>
                              <span className="step-title">
                                Step {idx + 1}: {step.title}
                              </span>
                            </div>
                            {completedSteps.includes(stepId) && (
                              <span className="step-status">✓</span>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              toggle(
                                setCollapsedSupport,
                                collapsedSupport,
                                application.id
                              );
                            }}
                          >
                            {isSupportCollapsed ? "▶" : "▼"} Support
                          </span>
                        </li>

                        {!isSupportCollapsed && (
                          <li
                            className={`sidebar-support-item ${
                              activeSection === "comments" ? "active-nav" : ""
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSection("comments");
                            }}
                          >
                            <span className="nav-icon">💭</span>
                            <span className="nav-text">Community Comments</span>
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
