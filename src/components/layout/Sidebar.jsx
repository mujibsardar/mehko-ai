import React from "react";
import "./Sidebar.scss";

const Sidebar = ({ applications, activeApplicationId, onSelect, onRemove }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>Your Applications</h3>
      </div>

      <div className="sidebar-list">
        {applications.map((application) => (
          <div
            key={application.id}
            className={`sidebar-item ${
              application.id === activeApplicationId ? "active" : ""
            }`}
            onClick={() => onSelect(application.id)}
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
        ))}

        {applications.length === 0 && (
          <div className="sidebar-placeholder">No applications selected</div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
