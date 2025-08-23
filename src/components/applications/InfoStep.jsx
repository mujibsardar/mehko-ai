import { useState } from "react";
import "./InfoStep.scss";
import useAuth from "../../hooks/useAuth";
import useProgress from "../../hooks/useProgress";
import ReportButton from "../generic/ReportButton";
import ReportIssueModal from "../modals/ReportIssueModal";
import SubStepActions from "./SubStepActions";

// Helper function to render markdown-like formatting
const renderMarkdown = (text) => {
  if (!text) return text;

  // Replace **text** with <strong>text</strong>
  let rendered = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Replace *text* with <em>text</em> (but not if it's already been processed)
  rendered = rendered.replace(
    /(?<!<strong>)\*([^*]+?)\*(?!<\/strong>)/g,
    "<em>$1</em>"
  );

  // Replace `text` with <code>text</code>
  rendered = rendered.replace(/`([^`]+)`/g, "<code>$1</code>");

  return rendered;
};

function InfoStep({
  step,
  applicationId,
  hideCompleteToggle,
  application,
  onCommentRequest,
}) {
  const { user } = useAuth();
  const { completedSteps, markStepComplete, markStepIncomplete } = useProgress(
    user?.uid,
    applicationId
  );
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const stepId = step.id || step._id;
  const isComplete = completedSteps.includes(stepId);

  const handleReportClick = () => {
    if (!user) return;
    setIsReportModalOpen(true);
  };

  const handleReportSubmitted = (reportData) => {
    console.log("Step report submitted:", reportData);
  };

  // Handle PDF download for PDF steps
  const handlePdfDownload = async () => {
    if (!step.formId || step.type !== "pdf") return;

    try {
      const response = await fetch(
        `/api/apps/${applicationId}/forms/${step.formId}/pdf`
      );
      if (!response.ok) throw new Error("Failed to download PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${applicationId}_${step.formId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF. Please try again.");
    }
  };

  // Parse structured content into sections
  const parseStructuredContent = (content) => {
    if (!content) return [];

    const sections = [];
    const lines = content.split("\n");
    let currentSection = null;
    let currentContent = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Check for section headers (bold text with **)
      if (
        trimmedLine.startsWith("**") &&
        trimmedLine.endsWith("**") &&
        !trimmedLine.includes("Search terms for unclear parts")
      ) {
        // Save previous section if exists
        if (currentSection) {
          sections.push({
            ...currentSection,
            content: currentContent.join("\n").trim(),
          });
        }

        // Start new section
        const title = trimmedLine.replace(/\*\*/g, "");
        currentSection = { title, type: "section" };
        currentContent = [];
      } else if (trimmedLine && !trimmedLine.startsWith("*Search:*")) {
        // Add content to current section (skip search terms)
        currentContent.push(trimmedLine);
      }
    });

    // Add the last section
    if (currentSection) {
      sections.push({
        ...currentSection,
        content: currentContent.join("\n").trim(),
      });
    }

    return sections;
  };

  // Render a single section
  const renderSection = (section, index) => {
    const isChecklist = section.title === "What you need";
    const isCostTime = section.title === "Cost & time";
    const isReadyWhen = section.title === "Ready when";
    const isWhereHow = section.title === "Where/how";

    // Function to render content with clickable links and search actions
    const renderEnhancedContent = (content) => {
      if (!content) return null;

      // Split content into lines and process each
      return content.split("\n").map((line, lineIndex) => {
        if (!line.trim()) return null;

        // Check if this line contains a website reference
        const hasWebsite =
          line.includes("website") ||
          line.includes("visit") ||
          line.includes("go to");
        const hasCountyRef =
          line.toLowerCase().includes("county") ||
          line.toLowerCase().includes("deh") ||
          line.toLowerCase().includes("acgov");

        if (hasWebsite || hasCountyRef) {
          return (
            <div key={lineIndex} className="actionable-content">
              <p className="content-paragraph">{line.trim()}</p>
              <div className="action-buttons">
                {hasWebsite && (
                  <button
                    className="action-button website-button"
                    onClick={() => {
                      const domain = application?.rootDomain || "google.com";
                      window.open(`https://${domain}`, "_blank");
                    }}
                    title="Visit county website"
                  >
                    🌐 Visit Website
                  </button>
                )}
                <button
                  className="action-button search-button"
                  onClick={() => {
                    let appTitle = "";

                    // First try to get the title
                    if (application?.title) {
                      appTitle = application.title;
                    } else if (application?.id) {
                      // If no title, use the ID
                      appTitle = application.id
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (m) => m.toUpperCase());
                    } else {
                      appTitle = "MEHKO";
                    }

                    // Use searchTerms from the step if available, otherwise use the line content
                    let searchText = "";
                    if (
                      step?.searchTerms &&
                      Array.isArray(step.searchTerms) &&
                      step.searchTerms.length > 0
                    ) {
                      // Use the first search term as the primary search
                      searchText = step.searchTerms[0];
                    } else {
                      // Fallback to using the line content (truncated if too long)
                      searchText =
                        line.trim().length > 100
                          ? line.trim().substring(0, 100) + "..."
                          : line.trim();
                    }

                    // Don't duplicate the county name if it's already in the search text
                    let finalSearchText = searchText;
                    if (
                      appTitle &&
                      searchText.toLowerCase().includes(appTitle.toLowerCase())
                    ) {
                      // If the app title is already in the search text, just use the search text
                      finalSearchText = searchText;
                    } else {
                      // Otherwise, combine app title and search text
                      finalSearchText = `${appTitle} ${searchText}`;
                    }

                    const searchQuery = finalSearchText;
                    window.open(
                      `https://www.google.com/search?q=${encodeURIComponent(
                        searchQuery
                      )}`,
                      "_blank"
                    );
                  }}
                  title="Search for more information"
                >
                  🔍 Search Google
                </button>
              </div>
            </div>
          );
        }

        // Regular content
        return (
          <p key={lineIndex} className="content-paragraph">
            {line.trim()}
          </p>
        );
      });
    };

    return (
      <div
        key={index}
        className={`content-section ${section.type} ${section.title
          .toLowerCase()
          .replace(/\s+/g, "-")}`}
      >
        <h3 className="section-title">{section.title}</h3>

        {isChecklist ? (
          <div className="checklist-content">
            {section.content.split("\n").map((item, itemIndex) => {
              const trimmedItem = item.trim();
              if (trimmedItem.startsWith("- ☐")) {
                const text = trimmedItem.replace("- ☐", "").trim();
                return (
                  <div key={itemIndex} className="checklist-item">
                    <div className="checkbox-placeholder">☐</div>
                    <span
                      className="checklist-text"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
                    />
                  </div>
                );
              }
              return null;
            })}
          </div>
        ) : isCostTime ? (
          <div className="cost-time-content">
            <div className="cost-time-badge">{section.content}</div>
          </div>
        ) : isReadyWhen ? (
          <div className="ready-when-content">
            <div className="ready-when-badge">{section.content}</div>
          </div>
        ) : isWhereHow ? (
          <div className="where-how-content">
            {renderEnhancedContent(section.content)}
          </div>
        ) : (
          <div className="section-content">
            {section.content.split("\n").map((line, lineIndex) => {
              if (line.trim()) {
                return (
                  <p
                    key={lineIndex}
                    className="content-paragraph"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(line.trim()),
                    }}
                  />
                );
              }
              return null;
            })}
          </div>
        )}

        {/* Add SubStepActions bar under each section */}
        <SubStepActions
          stepId={stepId}
          applicationId={applicationId}
          application={application}
          step={step}
          subStepText={section.content}
          subStepIndex={index}
          onCommentRequest={onCommentRequest}
        />
      </div>
    );
  };

  // Render structured content with sections
  const renderStructuredContent = (content) => {
    const sections = parseStructuredContent(content);

    if (sections.length === 0) {
      // Fallback to simple text rendering with SubStepActions
      return (
        <div className="fallback-content">
          {content.split("\n").map((line, index) => (
            <p
              key={index}
              className="content-paragraph"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(line.trim()) }}
            />
          ))}
          <SubStepActions
            stepId={stepId}
            applicationId={applicationId}
            application={application}
            step={step}
            subStepText={content}
            subStepIndex={0}
            onCommentRequest={onCommentRequest}
          />
        </div>
      );
    }

    return (
      <div className="structured-content">
        {sections.map((section, index) => renderSection(section, index))}
      </div>
    );
  };

  return (
    <div className="info-step">
      <div className="step-header">
        <h2>{step.title}</h2>
        {user && (
          <ReportButton
            onClick={handleReportClick}
            size="small"
            variant="subtle"
          >
            Report Issue
          </ReportButton>
        )}
      </div>

      {/* PDF Download Button for PDF Steps */}
      {step.type === "pdf" && step.formId && (
        <div className="pdf-download-section">
          <button
            className="pdf-download-button"
            onClick={handlePdfDownload}
            title="Download the original PDF form template"
          >
            📄 Download PDF Template
          </button>
          <p className="pdf-download-note">
            Download the original PDF form to view offline or print. You can
            still fill out the form in this application.
          </p>
        </div>
      )}

      {/* Step Content */}
      <div className="step-content">
        {renderStructuredContent(step.content)}
      </div>

      {/* Step Completion Toggle */}
      {!hideCompleteToggle && user && (
        <div className="step-completion">
          <label className="completion-checkbox">
            <input
              type="checkbox"
              checked={isComplete}
              onChange={(e) => {
                if (e.target.checked) {
                  markStepComplete(stepId);
                } else {
                  markStepIncomplete(stepId);
                }
              }}
            />
            <span>Mark this step as complete</span>
          </label>
        </div>
      )}

      {/* Report Issue Modal */}
      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleReportSubmitted}
        stepId={stepId}
        applicationId={applicationId}
      />
    </div>
  );
}

export default InfoStep;
