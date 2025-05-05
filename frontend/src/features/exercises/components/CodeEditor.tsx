"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/context/ThemeContext";

interface CodeEditorProps {
  language: string;
  htmlCode: string;
  cssCode: string;
  setHtmlCode: (code: string) => void;
  setCssCode: (code: string) => void;
  onRunCode: () => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  language,
  htmlCode,
  cssCode,
  setHtmlCode,
  setCssCode,
  onRunCode,
}) => {
  const { theme } = useTheme();
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const win = window as any;
    if (win.require && containerRef.current) {
      win.require(["vs/editor/editor.main"], () => {
        editorRef.current = win.monaco.editor.create(containerRef.current!, {
          value: language === "html" ? htmlCode : cssCode,
          language,
          theme: theme.name === "dark" ? "vs-dark" : "vs-light",
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: false,
        });

        editorRef.current.onDidChangeModelContent(() => {
          const value = editorRef.current.getValue();
          if (language === "html") setHtmlCode(value);
          else setCssCode(value);
        });
      });
    } else {
      console.error("Monaco loader.js no está disponible");
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, [language, htmlCode, cssCode, setHtmlCode, setCssCode, theme.name]);

  return (
    <div
      ref={containerRef}
      style={{
        height: "100%",
        width: "100%",
        border: `1px solid ${theme.colors.border}`,
        background: theme.colors.card,
      }}
    />
  );
};

export default CodeEditor;
