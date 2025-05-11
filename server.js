import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/ai-chat", async (req, res) => {
  const { messages, countyId } = req.body;

  const lastQuestion = messages[messages.length - 1]?.content || "";

  // Simulated AI reply
  const fakeReply = `This is a simulated response for "${countyId}". You asked: "${lastQuestion}".`;

  res.json({ reply: fakeReply });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🧠 Mock AI server running on http://localhost:${PORT}`);
});
