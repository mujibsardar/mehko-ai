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
      // All API endpoints go to Caddy reverse proxy (port 80)
      // Caddy handles routing to FastAPI backend
      "/api": {
        target: "http://localhost",
        changeOrigin: true,
      },
    },
  },
});
