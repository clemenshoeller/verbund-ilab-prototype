import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works under any path (container, sub-folder, file preview).
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5173, strictPort: true },
});
