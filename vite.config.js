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
        target: "http://localhost:3000", // or use local mock file
        rewrite: (path) => path.replace(/^\/api\/ai-chat/, ""),
      },
    },
  },
});
