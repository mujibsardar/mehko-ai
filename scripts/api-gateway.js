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

// tiny proxy helper with optional prefix rewrite
function proxyTo(target, rewriteRe) {
  return (req, res) => {
    if (rewriteRe) req.url = req.url.replace(rewriteRe, "") || "/";
    proxy.web(req, res, { target, changeOrigin: true }, (err) => {
      console.error("Proxy error:", err?.message || err);
      res.status(502).json({ error: "Bad gateway", detail: err?.message || String(err) });
    });
  };
}

app.get("/health", (_req, res) => res.json({ ok: true }));

// AI server proxies
app.use("/api/ai-chat",          proxyTo(AI_SERVER_URL,   /^\/api\/ai-chat/));
app.use("/api/ai-analyze-pdf",   proxyTo(AI_SERVER_URL,   /^\/api\/ai-analyze-pdf/));
app.use("/api/form-fields",      proxyTo(AI_SERVER_URL,   /^\/api\/form-fields/));
app.use("/api/fill-pdf",         proxyTo(AI_SERVER_URL,   /^\/api\/fill-pdf/));

// FastAPI proxies
app.use("/api/apps",             proxyTo(FASTAPI_URL,     /^\/api\/apps/));
app.use("/api/process-county",   proxyTo(FASTAPI_URL,     /^\/api\/process-county/));

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
