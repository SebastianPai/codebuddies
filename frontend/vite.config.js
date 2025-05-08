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
          src: "node_modules/monaco-editor/min/vs/**/*",
          dest: "monaco-editor/vs",
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  assetsInclude: ["**/*.worker.js"],
  optimizeDeps: {
    include: ["monaco-editor", "monaco-python"],
  },
  build: {
    rollupOptions: {
      external: [
        "monaco-editor/esm/vs/editor/editor.worker",
        "monaco-editor/esm/vs/language/css/css.worker",
        "monaco-editor/esm/vs/language/html/html.worker",
        "monaco-editor/esm/vs/language/typescript/ts.worker",
      ],
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
