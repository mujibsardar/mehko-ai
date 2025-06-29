import React from "react";
import "./FormViewer.scss";

function FormViewer({ forms = [] }) {
  if (!forms.length) return null;

  return (
    <div className="form-viewer">
      <h3>Permit Forms</h3>
      <ul className="form-list">
        {forms.map((form, idx) => (
          <li key={idx}>
            <a href={form.fileUrl} target="_blank" rel="noopener noreferrer">
              {form.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FormViewer;
