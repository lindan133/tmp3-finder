import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: "./",
  server: {
    port: 5173,
    ...(mode === "web"
      ? {
          proxy: {
            "/api": "http://localhost:3456",
          },
        }
      : {}),
  },
}));
