import React, { useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth";
import "./DynamicForm.scss"; // Assuming you have some CSS for styling

export default function DynamicForm({ applicationId, formName }) {
  const { user } = useAuth();
  const [fieldNames, setFieldNames] = useState([]);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fetchFieldNames = async () => {
      try {
        const res = await fetch(
          `http://localhost:3000/api/form-fields?applicationId=${applicationId}&formName=${formName}`
        );
        const data = await res.json();
        setFieldNames(data.fields || []);
      } catch (err) {
        console.error("Failed to fetch field names", err);
      }
    };

    fetchFieldNames();
  }, [applicationId, formName]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:3000/api/fill-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, formName, formData }),
      });

      if (!res.ok) {
        throw new Error("PDF generation failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "filled-form.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error downloading PDF:", err);
      alert("Something went wrong generating the PDF.");
    }
  };

  if (!user) return <p>Please log in to use this feature.</p>;
  return (
    <form className="dynamic-form" onSubmit={handleSubmit}>
      {fieldNames.map((fieldName) => (
        <div key={fieldName} className="dynamic-form-field">
          <label>{fieldName}</label>
          <input
            type="text"
            name={fieldName}
            value={formData[fieldName] || ""}
            onChange={handleChange}
          />
        </div>
      ))}
      <button type="submit">Download Filled PDF</button>
    </form>
  );
}
