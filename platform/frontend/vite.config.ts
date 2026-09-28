import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // A Biblioteca inclui os documentos de `rules/sistema` (fora da raiz do frontend) na compilação.
    fs: { allow: [".", "../../rules/sistema"] },
  },
});
