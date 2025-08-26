import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ["import", "mixed-decls", "legacy-js-api"],
        quietDeps: true,
        style: "compressed",
      },
    },
  },
  server: {
    proxy: {
      // PDF-related endpoints go to Python FastAPI server (port 8000)
      // Strip /api prefix since Python server expects /apps/... not /api/apps/...
      "/api/apps": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      // AI chat endpoint goes to Node.js server (port 3000)
      "/api/ai-chat": {
        target: "http://localhost:3000",
        rewrite: (path) => path.replace(/^\/api\/ai-chat/, ""),
      },
      // PDF download endpoint goes to Node.js server (port 3000)
      "/api/download-pdf": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      // Admin endpoints go to Node.js server (port 3000)
      "/api/admin": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      // Default fallback for other /api endpoints goes to Node.js server (port 3000)
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
