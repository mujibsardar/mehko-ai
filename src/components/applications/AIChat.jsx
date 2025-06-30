import React, { useState, useRef, useEffect } from "react";
import "./AIChat.scss";
import useAuth from "../../hooks/useAuth";
import { saveChatMessages, loadChatMessages } from "../../firebase/userData";

function AIChat({ application }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!user || !application?.id) return;

    loadChatMessages(user.uid, application.id).then((msgs) => {
      if (msgs?.length) {
        setMessages(msgs);
      } else {
        setMessages([
          {
            sender: "ai",
            text: `Hi! I'm your assistant for ${application.title}. Ask me anything about the application process.`,
            timestamp: new Date(),
          },
        ]);
      }
    });
  }, [user?.uid, application?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input, timestamp: new Date() };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.sender === "ai" ? "assistant" : "user",
            content: m.text,
          })),
          applicationId: application.id,
        }),
      });

      const data = await res.json();
      const aiMessage = {
        sender: "ai",
        text: data.reply || "Sorry, I don't have a response right now.",
        timestamp: new Date(),
      };

      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);
      await saveChatMessages(user.uid, application.id, updatedMessages);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Oops, something went wrong.",
          timestamp: new Date(),
        },
      ]);
    }

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) return <p>Please log in to use this feature.</p>;

  return (
    <div className="ai-chat">
      <div className="chat-history">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-msg ${msg.sender}`}>
            <div className="chat-bubble">{msg.text}</div>
            <div className="timestamp">
              {(
                msg.timestamp.toDate?.() || new Date(msg.timestamp)
              ).toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="chat-input">
        <textarea
          placeholder="Ask something..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button onClick={handleSend} disabled={!input.trim() || loading}>
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default AIChat;
