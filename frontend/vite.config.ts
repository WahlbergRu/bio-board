import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
  },
  server: {
    host: '0.0.0.0',
    port: 8401,
    proxy: {
      "/api": { target: "http://localhost:8400", changeOrigin: true },
      "/mcp": { target: "http://localhost:8400", changeOrigin: true },
      "/ws": { target: "http://localhost:8400", changeOrigin: true, ws: true },
    },
  },
});
