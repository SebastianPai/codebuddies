import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "path";

export default defineConfig({
  base: "/",
  publicDir: "public",
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: "src/assets/fonts/Pixelify_Sans/*.ttf",
          dest: "assets/fonts/Pixelify_Sans",
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  assetsInclude: ["**/*.worker.js", "**/*.ttf"],
  optimizeDeps: {
    include: ["monaco-editor", "monaco-python"],
  },
  build: {
    sourcemap: false, // Desactiva source maps para evitar errores
    rollupOptions: {
      output: {
        manualChunks: {
          "monaco-editor": ["monaco-editor", "monaco-python"],
        },
      },
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
    fs: {
      allow: [".", path.resolve(__dirname, "node_modules/monaco-editor")],
    },
  },
});
