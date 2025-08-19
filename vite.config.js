import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ["mixed-decls"],
      },
    },
  },
  server: {
    proxy: {
      "/api/ai-chat": {
        target: "http://localhost:3000",
        rewrite: (path) => path.replace(/^\/api\/ai-chat/, ""),
      },
      "/api": {
        target: "http://127.0.0.1:8081",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""), // strip "/api"
      },
    },
  },
});
