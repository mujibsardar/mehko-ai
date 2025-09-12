import { useState, useRef, useEffect, useMemo } from "react";
import "./AIChat.scss";
import useAuth from "../../hooks/useAuth";
import {
  saveChatMessages,
  loadChatMessages,
  pinApplication,
  loadFormData, // reuse your helpers
} from "../../firebase/userData";

import { getApiBase, ENDPOINTS } from "../../config/api";

const API_APP = getApiBase('python');
const API_CHAT = ENDPOINTS.AI_CHAT();

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="ai-chat__loading-spinner">
    <div className="ai-chat__spinner-dots">
      <div className="ai-chat__spinner-dot"></div>
      <div className="ai-chat__spinner-dot"></div>
      <div className="ai-chat__spinner-dot"></div>
    </div>
    <div className="ai-chat__loading-text">AI is thinking...</div>
  </div>
);

// Format AI Response for Better Readability
const formatAIResponse = (text) => {
  if (!text) return text;

  let formatted = text
    // Clean up common AI formatting artifacts
    .replace(/\*\s*\n\s*\*/g, '\n') // Remove single asterisks on separate lines
    .replace(/\n\s*\*\s*\n/g, '\n') // Remove asterisks with just whitespace
    .replace(/\*\s*:/g, ':') // Clean up asterisk-colon patterns
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive line breaks to max 2
    .replace(/\s+\n/g, '\n') // Remove trailing spaces before line breaks
    .replace(/\n\s+/g, '\n') // Remove leading spaces after line breaks
    // Smart sentence breaks - only when it makes sense
    .replace(/([.!?])\s+([A-Z][a-z])/g, '$1\n\n$2') // Break after sentences followed by new sentence
    .replace(/([.!?])\s+([A-Z][A-Z\s]+:)/g, '$1\n\n$2') // Break before headers (ALL CAPS followed by colon)
    // Clean up numbered lists
    .replace(/(\d+\.)\s+/g, '\n$1 ') // Ensure proper spacing for numbered lists
    // Clean up bullet points (but don't over-process)
    .replace(/(^|\n)([•*-])\s*/g, '$1$2 ') // Ensure proper spacing for bullets
    .trim();

  return formatted;
};

export default function AIChat({
  application,
  currentStep,
  currentStepId,
  completedStepIds = [],
  context = null, // New parameter for sub-step context
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const chatEndRef = useRef(null);

  // overlays (template fields), saved answers, and pdf refs
  const [overlayMap, setOverlayMap] = useState({}); // {formId: fields[]}
  const [formDataMap, setFormDataMap] = useState({}); // {formId: {...answers}}

  const [pdfText, setPdfText] = useState({});
  const [pdfPages, setPdfPages] = useState({}); // {formId: [page1, page2, ...]}
  const [pdfLinks, setPdfLinks] = useState({});

  // UI state for collapsible sections
  const [isFormHelpExpanded, setIsFormHelpExpanded] = useState(false);
  const [isGeneralTasksExpanded, setIsGeneralTasksExpanded] = useState(false);

  // Handle context changes to pre-populate input
  useEffect(() => {
    if (context && context.subStepText) {
      const prompt = `I need help with this sub-step: "${context.subStepText}". Can you provide more detailed guidance?`;
      setInput(prompt);
    }
  }, [context]);

  // Normalize steps with completion so the model doesn't have to infer
  const computedSteps = useMemo(() => {
    const steps = application?.steps || [];
    return steps.map((s) => {
      const sid = s.id || s._id;
      return { ...s, _id: sid, isComplete: completedStepIds.includes(sid) };
    });
  }, [application?.steps, completedStepIds]);

  // Get PDF form steps for better organization
  const pdfFormSteps = useMemo(() => {
    return (application?.steps || []).filter(
      (s) => s.type === "pdf" && s.formId
    );
  }, [application?.steps]);

  // Fetch overlays for all pdf steps
  useEffect(() => {
    (async () => {
      if (!application?.steps) return;
      const map = {};
      for (const step of application.steps) {
        if (step.type === "pdf" && step.formId) {
          try {
            const r = await fetch(
              `${API_APP}/api/apps/${application.id}/forms/${step.formId}/template`
            );

            // Check if response is ok before trying to parse JSON
            if (!r.ok) {
              console.warn(`Form template not found for ${step.formId} (${r.status}) - this is normal if the form hasn't been uploaded yet`);
              continue;
            }

            // Check content type to ensure we're getting JSON
            const contentType = r.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              console.warn(`Form template for ${step.formId} returned non-JSON content (${contentType}) - skipping`);
              continue;
            }

            const j = await r.json();
            map[step.formId] = j.fields || [];
          } catch (err) {
            console.error("overlay fetch failed:", step.formId, err);
          }
        }
      }
      setOverlayMap(map);
    })();
  }, [application?.id, application?.steps]);

  // Load saved answers for all pdf steps (if any)
  useEffect(() => {
    (async () => {
      if (!user?.uid || !application?.steps) return;
      const map = {};
      for (const step of application.steps) {
        if (step.type === "pdf" && step.formId) {
          try {
            const saved = await loadFormData(
              user.uid,
              application.id,
              step.formId
            );
            map[step.formId] = saved || {};
          } catch (err) {
            console.error("loadFormData failed:", step.formId, err);
          }
        }
      }
      setFormDataMap(map);
    })();
  }, [user?.uid, application?.id, application?.steps]);

  // fetch PDF text (already discussed)
  useEffect(() => {
    (async () => {
      if (!application?.steps) return;
      const textMap = {};
      const pagesMap = {};
      const linkMap = {};
      for (const step of application.steps) {
        if (step.type === "pdf" && step.formId) {
          // text
          try {
            const url = `${API_APP}/api/apps/${encodeURIComponent(
              application.id
            )}/forms/${encodeURIComponent(step.formId)}/text`;
            console.log(`Fetching PDF text from: ${url}`);
            const r = await fetch(url);
            if (r.ok) {
              // Check content type to ensure we're getting JSON
              const contentType = r.headers.get('content-type');
              if (!contentType || !contentType.includes('application/json')) {
                console.warn(`PDF text for ${step.formId} returned non-JSON content (${contentType}) - skipping`);
                continue;
              }

              const j = await r.json();
              const pagesArr = Array.isArray(j.pages) ? j.pages : [];
              pagesMap[step.formId] = pagesArr;
              textMap[step.formId] = pagesArr.length
                ? pagesArr.join("\n\n---\n\n")
                : "";
              console.log(`Successfully loaded text for form: ${step.formId}`);
            } else {
              console.log(
                `Form ${step.formId} not found on server (${r.status}) - this is normal if the form hasn't been uploaded yet`
              );
            }
          } catch (error) {
            console.log(
              `Could not fetch text for form ${step.formId}: ${error.message}`
            );
          }
          // links
          linkMap[step.formId] = {
            title: step.title || step.formId,
            url: `${API_APP}/api/apps/${encodeURIComponent(
              application.id
            )}/forms/${encodeURIComponent(step.formId)}/pdf?inline=0`,
            previewBase: `${API_APP}/api/apps/${encodeURIComponent(
              application.id
            )}/forms/${encodeURIComponent(step.formId)}/preview-page?page=`,
          };
        }
      }

      setPdfText(textMap);
      setPdfPages(pagesMap);
      setPdfLinks(linkMap);
    })();
  }, [application?.id, application?.steps]);

  // Load chat history or seed greeting
  useEffect(() => {
    if (!user || !application?.id) return;
    loadChatMessages(user.uid, application.id).then((msgs) => {
      if (msgs?.length) setMessages(msgs);
      else {
        setMessages([
          {
            sender: "ai",
            text: `Welcome! I'm here to help with ${application.title}. 

IMPORTANT: This app tracks your MEHKO application progress and provides guidance. You'll need to:
• Fill out PDF forms directly in the dashboard for most steps
• Download completed forms to print and sign if needed
• Mark steps complete once forms are finished

Ask me anything or pick a quick task above!`,
            timestamp: new Date(),
          },
          {
            sender: "ai",
            text: "💡 Note: While I aim to provide accurate information, please verify important details with official sources as I may occasionally make mistakes.",
            timestamp: new Date(),
          },
        ]);
      }
    });
  }, [user?.uid, application?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Enhanced quick tasks with form-specific options
  const quickTasks = [
    {
      title: "What should I do next?",
      prompt: "What's the next step I should complete in my MEHKO application?",
    },
    {
      title: "Help with current step",
      prompt: "I'm currently on this step. What do I need to do?",
    },
    {
      title: "Form completion help",
      prompt: "I need help filling out a form. What should I know?",
    },
    {
      title: "Application overview",
      prompt: "Give me an overview of the entire MEHKO application process.",
    },
  ];

  const formSpecificTasks = selectedForm
    ? [
      {
        title: `Complete ${selectedForm.title}`,
        prompt: `I want to complete the ${selectedForm.title} form. What do I need to do?`,
      },
      {
        title: "Form field help",
        prompt: `I'm confused about some fields in the ${selectedForm.title} form. Can you help?`,
      },
      {
        title: "Form submission",
        prompt: `How do I submit the completed ${selectedForm.title} form?`,
      },
    ]
    : [];

  const send = async (text, formContext = null) => {
    if (!text?.trim()) return;

    // Add form context to the message if provided
    const enhancedText = formContext
      ? `[Form: ${formContext.title}] ${text}`
      : text;

    const userMsg = {
      sender: "user",
      text: enhancedText,
      timestamp: new Date(),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(API_CHAT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // keep only last 20 messages to keep payload small
          messages: next.slice(-20).map((m) => ({
            role: m.sender === "ai" ? "assistant" : "user",
            content: m.text,
          })),
          applicationId: application.id,
          context: {
            application: {
              id: application.id,
              title: application.title,
              rootDomain: application.rootDomain,
            },
            steps: computedSteps,
            currentStep,
            currentStepId,
            completedStepIds,
            comments: application.comments || [],
            overlays: overlayMap,
            formData: formDataMap,
            pdfText, // full extracted text (joined)
            pdfLinks, // {formId: {title,url,previewBase}}
            selectedForm: formContext ? (() => {
              const formId = formContext.formId;
              const fields = Array.isArray(overlayMap[formId]) ? overlayMap[formId] : [];
              const fieldNamesSample = fields
                .slice(0, 20)
                .map((f) => f?.label || f?.id || f?.name)
                .filter(Boolean);
              const pagesArr = Array.isArray(pdfPages[formId]) ? pdfPages[formId] : [];
              const pageSummaries = pagesArr.slice(0, 5).map((p) => (p || "").slice(0, 400));
              const pdfContentTrunc = (pdfText[formId] || "").slice(0, 2000);
              return {
                ...formContext,
                fieldCount: fields.length || 0,
                fieldNamesSample,
                pageSummaries,
                pdfContent: pdfContentTrunc,
              };
            })() : null,
            // IMPORTANT: Application workflow instructions
            workflow: {
              description: "This is a MEHKO application tracking system. Users fill out PDF forms directly in the dashboard for most steps, then download completed forms to print and sign if needed. The app provides interactive form completion and tracks progress.",
              formProcess: "Forms are filled out directly in the dashboard using interactive PDF viewers. Completed forms can be downloaded for printing and signing.",
              appPurpose: "The app tracks application progress, provides interactive form completion, and helps users understand requirements - it handles most of the form completion process directly."
            }
          },
        }),
      });

      const data = await res.json();
      const aiMsg = {
        sender: "ai",
        text: formatAIResponse(data.reply || "Sorry, I don't have a response right now."),
        timestamp: new Date(),
      };
      const updated = [...next, aiMsg];
      setMessages(updated);
      await saveChatMessages(user.uid, application.id, updated);
      await pinApplication(user.uid, application.id, "ai");
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Oops, something went wrong.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input, selectedForm);
    }
  };

  function FormSpecificQuickActions() {
    if (!pdfFormSteps.length) return null;

    return (
      <div className="ai-chat__form-actions">
        <button
          className="ai-chat__section-toggle"
          onClick={() => setIsFormHelpExpanded(!isFormHelpExpanded)}
        >
          <span className="ai-chat__section-toggle-icon">
            {isFormHelpExpanded ? "▼" : "▶"}
          </span>
          <span className="ai-chat__section-toggle-text">
            Form-Specific Help
          </span>
          <span className="ai-chat__section-toggle-count">
            ({pdfFormSteps.length})
          </span>
        </button>

        <div
          className={`ai-chat__form-actions-content ${isFormHelpExpanded ? "expanded" : "collapsed"
            }`}
        >
          <div className="ai-chat__form-actions-grid">
            {pdfFormSteps.map((step) => (
              <div key={step.formId} className="ai-chat__form-card">
                <div className="ai-chat__form-card-header">
                  <h4>{step.title}</h4>
                  <button
                    className={`ai-chat__form-select-btn ${selectedForm?.formId === step.formId ? "active" : ""
                      }`}
                    onClick={() =>
                      setSelectedForm(
                        selectedForm?.formId === step.formId ? null : step
                      )
                    }
                  >
                    {selectedForm?.formId === step.formId
                      ? "✓ Selected"
                      : "Select Form"}
                  </button>
                </div>

                {selectedForm?.formId === step.formId && (
                  <div className="ai-chat__form-card-content">
                    <div className="ai-chat__form-quick-tasks">
                      {formSpecificTasks.map((task, index) => (
                        <button
                          key={index}
                          className="ai-chat__form-task-btn"
                          onClick={() => send(task.prompt, step)}
                        >
                          {task.title}
                        </button>
                      ))}
                    </div>

                    <div className="ai-chat__form-actions-buttons">
                      <button
                        className="ai-chat__guide-chip"
                        onClick={() => {
                          const link = pdfLinks[step.formId];
                          if (link)
                            window.open(
                              link.url,
                              "_blank",
                              "noopener,noreferrer"
                            );
                        }}
                      >
                        📄 Open PDF
                      </button>
                      <button
                        className="ai-chat__guide-chip"
                        onClick={() => {
                          const link = pdfLinks[step.formId];
                          if (link)
                            window.open(
                              link.previewBase + "0",
                              "_blank",
                              "noopener,noreferrer"
                            );
                        }}
                      >
                        👁️ Preview
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user)
    return <p className="ai-chat__login">Please log in to use this feature.</p>;

  return (
    <div className="ai-chat">
      {/* Header */}
      <div className="ai-chat__header">
        <div className="ai-chat__avatar">🤖</div>
        <div className="ai-chat__title">
          <div className="ai-chat__welcome">
            Welcome back{user?.displayName ? `, ${user.displayName}` : ""}!
          </div>
          <div className="ai-chat__subtitle">
            Let's work on <strong>{application?.title}</strong>.
          </div>
        </div>
      </div>

      {/* Content Area - Scrollable */}
      <div className="ai-chat__content">
        {/* Form Selection and Quick Actions */}
        <FormSpecificQuickActions />

        {/* General Quick tasks */}
        <div className="ai-chat__guide-card">
          <button
            className="ai-chat__section-toggle"
            onClick={() => setIsGeneralTasksExpanded(!isGeneralTasksExpanded)}
          >
            <span className="ai-chat__section-toggle-icon">
              {isGeneralTasksExpanded ? "▼" : "▶"}
            </span>
            <span className="ai-chat__section-toggle-text">
              General Tasks I can assist you with
            </span>
            <span className="ai-chat__section-toggle-count">
              ({quickTasks.length})
            </span>
          </button>

          <div
            className={`ai-chat__guide-content ${isGeneralTasksExpanded ? "expanded" : "collapsed"
              }`}
          >
            <ul className="ai-chat__guide-list">
              {quickTasks.map((t) => (
                <li key={t.title}>
                  <button
                    className="ai-chat__guide-chip"
                    onClick={() => send(t.prompt)}
                  >
                    {t.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Selected Form Context */}
        {selectedForm && (
          <div className="ai-chat__form-context">
            <div className="ai-chat__form-context-header">
              <span>
                📋 Working on: <strong>{selectedForm.title}</strong>
              </span>
              <button
                className="ai-chat__form-context-clear"
                onClick={() => setSelectedForm(null)}
              >
                ✕ Clear
              </button>
            </div>
            <div className="ai-chat__form-context-info">
              Ask me anything specific about this form. I'll provide targeted
              help based on the form content and your progress.
            </div>
          </div>
        )}

        {/* History */}
        <div className="ai-chat__history">
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.sender}`}>
              <div className="chat-bubble">{m.text}</div>
              <div className="timestamp">
                {(
                  m.timestamp?.toDate?.() || new Date(m.timestamp)
                ).toLocaleTimeString()}
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-msg ai">
              <div className="chat-bubble">
                <LoadingSpinner />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="ai-chat__composer">
        {/* AI Disclaimer */}
        <div className="ai-chat__disclaimer">
          <small>AI responses may contain inaccuracies. Please verify important information with official sources.</small>
        </div>

        <div className="ai-chat__input-section">
          {selectedForm && (
            <div className="ai-chat__form-guidance">
              <strong>📝 Form Guidance:</strong> You're working on the{" "}
              <strong>{selectedForm.title}</strong>. Fill out this form directly in the
              dashboard, then download the completed PDF to print and sign if needed.
            </div>
          )}
          <div className="ai-chat__input-container">
            <textarea
              placeholder={
                selectedForm
                  ? `Ask about ${selectedForm.title}... (e.g., "What does this field mean?")`
                  : 'Ask Orion… (e.g., "What should I do next?")'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              onClick={() => send(input, selectedForm)}
              disabled={!input.trim() || loading}
            >
              {loading ? "…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
