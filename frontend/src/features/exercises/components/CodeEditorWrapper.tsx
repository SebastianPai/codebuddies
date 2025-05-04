"use client";

import { FC } from "react";
import Editor from "@monaco-editor/react";

// Configura Monaco para usar Web Workers locales
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import jsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

// Configura el entorno de Monaco para usar Web Workers locales
self.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    switch (label) {
      case "editorWorkerService":
        return new editorWorker();
      case "css":
        return new cssWorker();
      case "html":
        return new htmlWorker();
      case "javascript":
      case "typescript":
        return new jsWorker();
      default:
        throw new Error(`Unsupported worker label: ${label}`);
    }
  },
};

interface CodeEditorWrapperProps {
  value: string;
  onValueChange: (value: string) => void;
  highlightLanguage: string;
  padding?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const CodeEditorWrapper: FC<CodeEditorWrapperProps> = ({
  value,
  onValueChange,
  highlightLanguage,
  padding = 16,
  className = "",
  style = {},
}) => {
  return (
    <Editor
      height="100%"
      width="100%"
      language={highlightLanguage}
      value={value}
      onChange={(newValue) => onValueChange(newValue || "")}
      theme="vs-dark"
      options={{
        fontFamily: '"Fira Mono", "Courier New", monospace',
        fontSize: 14,
        lineHeight: 1.5 * 14, // Equivale a lineHeight: 1.5
        padding: { top: padding, bottom: padding },
        scrollBeyondLastLine: false,
        minimap: { enabled: false }, // Desactiva el minimapa
        wordWrap: "on", // Activa el ajuste de líneas
        wrappingIndent: "indent", // Indenta las líneas ajustadas
        tabSize: 2,
        automaticLayout: true, // Ajusta el editor al contenedor
      }}
      className={className}
      wrapperProps={{ style: { ...style, padding: `${padding}px` } }}
    />
  );
};
