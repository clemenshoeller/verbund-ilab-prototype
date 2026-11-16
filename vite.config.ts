import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works under any path (container, sub-folder, file preview).
export default defineConfig({
  base: "./",
  plugins: [react()],
  // If 5173 is taken, Vite picks the next free port and prints the address.
  server: { port: 5173 },
});
