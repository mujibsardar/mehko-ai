import React, { useState } from "react";
import axios from "axios";

const AIChat = () => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const askAI = async () => {
    setLoading(true);
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: question }],
      },
      {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
      }
    );

    setAnswer(response.data.choices[0].message.content);
    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-xl font-bold">MEHKO AI Assistant</h2>
      <textarea
        value={question}
        placeholder="Ask about MEHKO permits..."
        onChange={(e) => setQuestion(e.target.value)}
      ></textarea>
      <button onClick={askAI} disabled={loading}>
        {loading ? "Loading..." : "Ask"}
      </button>
      <div className="mt-4">{answer}</div>
    </div>
  );
};

export default AIChat;
