import React, { useState, useEffect, useRef } from "react";
import { getApiBase } from "../../config/api";
import "./AcroFormViewer.scss";

const AcroFormViewer = ({
    app,
    form,
    application,
    step,
    onFormDataChange,
    initialFormData = {},
}) => {
    const [pdfUrl, setPdfUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [isAcroFormAvailable, setIsAcroFormAvailable] = useState(false);

    const iframeRef = useRef(null);
    const formDataRef = useRef(formData);

    const API_BASE = getApiBase('python');

    useEffect(() => {
        loadPdfData();
    }, [app, form]);

    useEffect(() => {
        formDataRef.current = formData;
    }, [formData]);

    const loadPdfData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Set the PDF URL for inline viewing
            const testUrl = `${API_BASE}/apps/${app}/forms/${form}/pdf?inline=true`;
            setPdfUrl(testUrl);
            setIsAcroFormAvailable(false);
        } catch (err) {
            console.error("Failed to load PDF:", err);
            setError("Failed to load the form. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleFormFieldChange = (fieldName, value) => {
        const newFormData = { ...formDataRef.current, [fieldName]: value };
        setFormData(newFormData);

        if (onFormDataChange) {
            onFormDataChange(newFormData);
        }
    };

    const handleIframeLoad = () => {
        if (iframeRef.current) {
            // Remove any existing listeners to prevent duplicates
            window.removeEventListener('message', handleMessage);
            // Listen for messages from the PDF viewer
            window.addEventListener('message', handleMessage);
        }
    };

    const handleMessage = (event) => {
        try {
            if (event.data && event.data.type === 'form-field-changed') {
                handleFormFieldChange(event.data.fieldName, event.data.value);
            }
        } catch (error) {
            console.warn('Error handling iframe message:', error);
        }
    };

    // Cleanup event listener on unmount
    useEffect(() => {
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    const downloadFilledPdf = async () => {
        try {
            const response = await fetch(`${API_BASE}/apps/${app}/forms/${form}/fill`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `answers_json=${encodeURIComponent(JSON.stringify(formData))}`,
            });

            if (!response.ok) {
                throw new Error("Failed to generate filled PDF");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${app}_${form}_filled.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to download PDF:", err);
            setError("Failed to download the filled PDF. Please try again.");
        }
    };

    const resetForm = () => {
        setFormData({});
        if (onFormDataChange) {
            onFormDataChange({});
        }
    };

    if (loading) {
        return (
            <div className="acroform-viewer">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading form...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="acroform-viewer">
                <div className="error-container">
                    <div className="error-icon">❌</div>
                    <h3>Error Loading Form</h3>
                    <p>{error}</p>
                    <button onClick={loadPdfData} className="retry-button">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="acroform-viewer">


            <div className="pdf-container">
                {pdfUrl && (
                    <iframe
                        ref={iframeRef}
                        src={pdfUrl}
                        className="pdf-iframe"
                        title="PDF Form"
                        onLoad={handleIframeLoad}
                        onError={() => {
                            console.error("PDF iframe failed to load");
                            setError("Failed to load the PDF form. Please check your connection and try again.");
                        }}
                    />
                )}
            </div>

            {/* Fallback form fields for non-AcroForm PDFs */}
            {!isAcroFormAvailable && Object.keys(formData).length > 0 && (
                <div className="fallback-form">
                    <h3>Form Data</h3>
                    <div className="form-fields">
                        {Object.entries(formData).map(([fieldName, value]) => (
                            <div key={fieldName} className="form-field">
                                <label>{fieldName}:</label>
                                <input
                                    type="text"
                                    value={value || ""}
                                    onChange={(e) => handleFormFieldChange(fieldName, e.target.value)}
                                    placeholder={`Enter ${fieldName}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AcroFormViewer;
