import React from "react";
import "./Sidebar.scss";

const Sidebar = ({ counties, activeCountyId, onSelect, onRemove }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>Your Counties</h3>
      </div>

      <div className="sidebar-list">
        {counties.map((county) => (
          <div
            key={county.id}
            className={`sidebar-item ${
              county.id === activeCountyId ? "active" : ""
            }`}
            onClick={() => onSelect(county.id)}
          >
            <span>{county.name}</span>
            <button
              className="remove-btn"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(county.id);
              }}
              title="Remove"
            >
              ✕
            </button>
          </div>
        ))}

        {counties.length === 0 && (
          <div className="sidebar-placeholder">No counties selected</div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
