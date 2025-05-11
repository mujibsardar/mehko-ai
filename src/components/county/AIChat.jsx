import React, { useState } from "react";
import "./AIChat.scss";

const AIChat = ({ county }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          countyId: county.id,
        }),
      });
      const data = await res.json();
      const botReply = {
        role: "assistant",
        content: data.reply || "Sorry, try again.",
      };
      setMessages((prev) => [...prev, botReply]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-chat">
      <h3>Ask MEHKO AI</h3>
      <div className="chat-box">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {loading && <div className="chat-msg assistant">Thinking…</div>}
      </div>

      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          placeholder={`Ask about ${county.name}...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          Send
        </button>
      </form>
    </div>
  );
};

export default AIChat;
