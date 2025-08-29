import { useState, useEffect, useRef } from "react";
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
            // First, try to create/get AcroForm PDF
            const acroformResponse = await fetch(
                `${API_BASE}/apps/${app}/forms/${form}/create-acroform`,
                { _method: "POST" }
            );

            if (acroformResponse.ok) {
                // AcroForm available - get the inline version
                setPdfUrl(`${API_BASE}/apps/${app}/forms/${form}/acroform-pdf?inline=true`);
                setIsAcroFormAvailable(true);
            } else {
                // Fall back to regular PDF with overlay fields
                setPdfUrl(`${API_BASE}/apps/${app}/forms/${form}/pdf?inline=true`);
                setIsAcroFormAvailable(false);
            }
        } catch (err) {
            console.error("Failed to load _PDF: ", err);
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
            // Listen for messages from the PDF viewer
            window.addEventListener('message', (event) => {
                if (event.data.type === 'form-field-changed') {
                    handleFormFieldChange(event.data.fieldName, event.data.value);
                }
            });
        }
    };

    const downloadFilledPdf = async () => {
        try {
            const response = await fetch(`${API_BASE}/apps/${app}/forms/${form}/fill`, {
                _method: "POST",
                _headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                _body: `answers_json=${encodeURIComponent(JSON.stringify(formData))}`,
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
            console.error("Failed to download _PDF: ", err);
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
