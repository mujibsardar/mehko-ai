import "./Sidebar.scss";

const Sidebar = ({
  applications,
  activeApplicationId,
  onRemove,
  activeTab,
  setActiveTab,
}) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Your Applications</h3>
      </div>

      <div className="sidebar-list">
        {applications.map((application) => {
          const isActive = application.id === activeApplicationId;

          return (
            <div key={application.id} className="sidebar-item-wrapper">
              <div
                className={`sidebar-item ${isActive ? "active" : ""}`}
                onClick={() => setActiveApplicationId(application.id)}
              >
                <span>{application.title}</span>
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

              {isActive && (
                <ul className="sidebar-sublist">
                  <li
                    className={activeTab === "overview" ? "active" : ""}
                    onClick={() => setActiveTab("overview")}
                  >
                    Overview
                  </li>
                  <li
                    className={activeTab === "forms" ? "active" : ""}
                    onClick={() => setActiveTab("forms")}
                  >
                    Fill Out Forms
                  </li>
                  <li
                    className={activeTab === "ai" ? "active" : ""}
                    onClick={() => setActiveTab("ai")}
                  >
                    Ask the Assistant
                  </li>
                  <li
                    className={activeTab === "comments" ? "active" : ""}
                    onClick={() => setActiveTab("comments")}
                  >
                    Community Comments
                  </li>
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
