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
      "/api/ai-chat": {
        target: "http://localhost:3000",
        rewrite: (path) => path.replace(/^\/api\/ai-chat/, ""),
      },
      "/api/download-pdf": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/api/admin": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
