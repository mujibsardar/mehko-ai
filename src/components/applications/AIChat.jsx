import React, { useState, useRef, useEffect, useMemo } from "react";
import "./AIChat.scss";
import useAuth from "../../hooks/useAuth";
import {
  saveChatMessages,
  loadChatMessages,
  pinApplication,
  loadFormData, // reuse your helpers
} from "../../firebase/userData";

const API_APP = "http://127.0.0.1:8081";
const API_CHAT = "http://localhost:3000/api/ai-chat";

export default function AIChat({
  application,
  currentStep,
  currentStepId,
  completedStepIds = [],
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // overlays (template fields), saved answers, and pdf refs
  const [overlayMap, setOverlayMap] = useState({}); // {formId: fields[]}
  const [formDataMap, setFormDataMap] = useState({}); // {formId: {...answers}}

  const [pdfText, setPdfText] = useState({});
  const [pdfLinks, setPdfLinks] = useState({});

  // Normalize steps with completion so the model doesn't have to infer
  const computedSteps = useMemo(() => {
    const steps = application?.steps || [];
    return steps.map((s) => {
      const sid = s.id || s._id;
      return { ...s, _id: sid, isComplete: completedStepIds.includes(sid) };
    });
  }, [application?.steps, completedStepIds]);

  // Fetch overlays for all pdf steps
  useEffect(() => {
    (async () => {
      if (!application?.steps) return;
      const map = {};
      for (const step of application.steps) {
        if (step.type === "pdf" && step.formId) {
          try {
            const r = await fetch(
              `${API_APP}/apps/${application.id}/forms/${step.formId}/template`
            );
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
      const linkMap = {};
      for (const step of application.steps) {
        if (step.type === "pdf" && step.formId) {
          // text
          try {
            const r = await fetch(
              `http://127.0.0.1:8081/apps/${application.id}/forms/${step.formId}/text`
            );
            if (r.ok) {
              const j = await r.json();
              textMap[step.formId] = Array.isArray(j.pages)
                ? j.pages.join("\n\n---\n\n")
                : "";
            }
          } catch {}
          // links
          linkMap[step.formId] = {
            title: step.title || step.formId,
            url: `http://127.0.0.1:8081/apps/${application.id}/forms/${step.formId}/pdf?inline=0`,
            previewBase: `http://127.0.0.1:8081/apps/${application.id}/forms/${step.formId}/preview-page?page=`,
          };
        }
      }
      setPdfText(textMap);
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
            text: `Welcome! I’m here to help with ${application.title}. Ask me anything or pick a quick task below.`,
            timestamp: new Date(),
          },
        ]);
      }
    });
  }, [user?.uid, application?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const quickTasks = useMemo(
    () => [
      "What are the required forms?",
      "Which step should I do next?",
      "Explain how to submit the public health app.",
      "What steps have I completed?",
      "Show fields for my current form.",
    ],
    []
  );

  const send = async (text) => {
    if (!text?.trim()) return;
    const userMsg = { sender: "user", text, timestamp: new Date() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(API_CHAT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({
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
            pdfText, // full extracted text
            pdfLinks, // {formId: {title,url,previewBase}}
          },
        }),
      });

      const data = await res.json();
      const aiMsg = {
        sender: "ai",
        text: data.reply || "Sorry, I don’t have a response right now.",
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
      send(input);
    }
  };

  function PdfChips() {
    const pdfSteps = (application?.steps || []).filter(
      (s) => s.type === "pdf" && s.formId
    );
    if (!pdfSteps.length) return null;

    const open = (formId, page) => {
      const link = pdfLinks[formId];
      if (!link) return;
      if (typeof page === "number") {
        window.open(link.previewBase + page, "_blank", "noopener,noreferrer");
      } else {
        window.open(link.url, "_blank", "noopener,noreferrer");
      }
    };

    // prefer current step first
    const ordered = [...pdfSteps].sort(
      (a, b) =>
        (a.formId === currentStep?.formId ? -1 : 0) -
        (b.formId === currentStep?.formId ? -1 : 0)
    );

    return (
      <div
        className="ai-chat__pdf-chips"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" }}
      >
        {ordered.map((s) => (
          <div
            key={s.formId}
            style={{ display: "flex", gap: 6, alignItems: "center" }}
          >
            <button
              className="ai-chat__guide-chip"
              onClick={() => open(s.formId)}
            >
              Open {s.title || s.formId} (PDF)
            </button>
            <button
              className="ai-chat__guide-chip"
              onClick={() => open(s.formId, 0)}
            >
              Preview p.1
            </button>
          </div>
        ))}
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
            Let’s work on <strong>{application?.title}</strong>.
          </div>
        </div>
        <button className="ai-chat__pill" type="button">
          Quick Guide
        </button>
      </div>

      {/* Quick tasks */}
      <div className="ai-chat__guide-card">
        <div className="ai-chat__guide-title">Tasks I can assist you with:</div>
        <ul className="ai-chat__guide-list">
          {quickTasks.map((t) => (
            <li key={t}>
              <button className="ai-chat__guide-chip" onClick={() => send(t)}>
                {t}
              </button>
            </li>
          ))}
        </ul>
        <PdfChips />
      </div>

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
        <div ref={chatEndRef} />
      </div>

      {/* Composer */}
      <div className="ai-chat__composer">
        <textarea
          placeholder="Ask Orion… (e.g., “What should I do next?”)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button onClick={() => send(input)} disabled={!input.trim() || loading}>
          {loading ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
