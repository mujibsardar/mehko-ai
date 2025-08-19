import { useState, useRef, useEffect, useMemo } from "react";
import "./AIChat.scss";
import useAuth from "../../hooks/useAuth";
import {
  saveChatMessages,
  loadChatMessages,
  pinApplication,
} from "../../firebase/userData";

export default function AIChat({ application }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const [applicationForms, setApplicationForms] = useState({});

  // Fetch per-step form fields once
  useEffect(() => {
    const enrich = async () => {
      if (!application?.steps) return;
      const map = {};
      for (const step of application.steps) {
        if (step.type === "form" && step.formName) {
          try {
            const res = await fetch(
              `http://localhost:3000/api/form-fields?applicationId=${application.id}&formName=${step.formName}`
            );
            const data = await res.json();
            map[step.id] = data.fields || [];
          } catch (e) {
            console.error(`Failed to fetch fields for ${step.id}`, e);
          }
        }
      }
      setApplicationForms(map);
    };
    enrich();
  }, [application?.id]);

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
      const res = await fetch("http://localhost:3000/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({
            role: m.sender === "ai" ? "assistant" : "user",
            content: m.text,
          })),
          applicationId: application.id,
          context: {
            title: application.title,
            steps: application.steps,
            completedStepIds: application.completedStepIds || [],
            rootDomain: application.rootDomain,
            comments: application.comments || [],
            forms: applicationForms,
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

      {/* Quick tasks card (like Jobright’s checklist) */}
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
      </div>

      {/* Messages */}
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
