"use client";

import { useEffect } from "react";
import { ThemeProvider } from "@/context/ThemeContext";
import "@/styles/globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const loadMonacoLoader = () => {
      if (document.getElementById("monaco-loader")) {
        return;
      }

      const script = document.createElement("script");
      script.id = "monaco-loader";
      script.src = "/monaco-editor/min/vs/loader.js"; // Ruta local
      script.async = true;

      script.onload = () => {
        const win = window as any;
        if (win.require) {
          win.require.config({
            paths: {
              vs: "/monaco-editor/min/vs",
            },
          });
        }
      };

      script.onerror = () => {
        console.error("No se pudo cargar Monaco loader.js");
      };

      document.head.appendChild(script);
    };

    loadMonacoLoader();

    return () => {
      const script = document.getElementById("monaco-loader");
      if (script) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return (
    <html lang="es">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
