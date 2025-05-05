import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "path";

export default defineConfig({
  base: "/", // 👈 Esto asegura rutas absolutas que funcionen con Express
  publicDir: "public", // Asegura que Vite use la carpeta public
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/monaco-editor/min/vs/**/*",
          dest: "monaco-editor/min/vs",
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
