// scripts/api-gateway.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import httpProxy from "http-proxy";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3001;
const FASTAPI_URL = process.env.FASTAPI_URL || "http://fastapi-worker:8000";
const AI_SERVER_URL = process.env.AI_SERVER_URL || "http://ai-server:3000";

const proxy = httpProxy.createProxyServer({});

// tiny helper
async function forwardRequest(target, req, res) {
  proxy.web(req, res, { target }, (err) => {
    console.error("Proxy error:", err?.message || err);
    res.status(502).json({ error: "Bad gateway", detail: err?.message || String(err) });
  });
}

app.get("/health", (_req, res) => res.json({ ok: true }));

// AI server proxies
app.use("/api/ai-chat", async (req, res) => forwardRequest(AI_SERVER_URL, req, res));
app.use("/api/ai-analyze-pdf", async (req, res) => forwardRequest(AI_SERVER_URL, req, res));
app.use("/api/form-fields", async (req, res) => forwardRequest(AI_SERVER_URL, req, res));
app.use("/api/fill-pdf", async (req, res) => forwardRequest(AI_SERVER_URL, req, res));

// FastAPI proxies
app.use("/api/apps", async (req, res) => forwardRequest(FASTAPI_URL, req, res));
app.use("/api/process-county", async (req, res) => forwardRequest(FASTAPI_URL, req, res));

// serve static SPA
app.use(express.static(path.join(__dirname, "..", "dist")));

// Express 5: use '/*' (not '*')
// CRASHES - NOT NEEDED
// app.get("/*", (_req, res) => {
//   res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
// });

// SUBSTITUTE FOR ABOVE
// serve static SPA
const distDir = path.join(__dirname, "..", "dist");
app.use(express.static(distDir));

// Catch-all for NON-API routes (Express 5-safe)
app.get(/^(?!\/api(\/|$)).*/, (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway on :${PORT}`);
  console.log(`   FastAPI: ${FASTAPI_URL}`);
  console.log(`   AI:      ${AI_SERVER_URL}`);
});
