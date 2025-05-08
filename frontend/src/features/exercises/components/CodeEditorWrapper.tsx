"use client";

import { FC } from "react";
import Editor from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { loader } from "@monaco-editor/react";

// Configura la ruta base para Monaco Editor
loader.config({
  paths: {
    vs: "/monaco-editor/vs", // Apunta a public/monaco-editor/vs
  },
});

interface CodeEditorWrapperProps {
  value: string;
  onValueChange: (value: string) => void; // Cambiado de Dispatch<SetStateAction<string>>
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
  const beforeMount = (monaco: typeof Monaco) => {
    // Registra el lenguaje python
    monaco.languages.register({ id: "python" });

    self.MonacoEnvironment = {
      baseUrl: "/monaco-editor/vs/",
      getWorkerUrl(_: string, label: string) {
        switch (label) {
          case "editorWorkerService":
            return "/monaco-editor/vs/editor/editor.worker.js";
          case "css":
            return "/monaco-editor/vs/language/css/css.worker.js";
          case "html":
            return "/monaco-editor/vs/language/html/html.worker.js";
          case "javascript":
          case "typescript":
            return "/monaco-editor/vs/language/typescript/ts.worker.js";
          case "python": // Usa el worker genérico para python
            return "/monaco-editor/vs/editor/editor.worker.js";
          default:
            return "/monaco-editor/vs/editor/editor.worker.js";
        }
      },
    };
  };

  return (
    <Editor
      height="100%"
      width="100%"
      language={highlightLanguage}
      value={value}
      onChange={(newValue) => onValueChange(newValue ?? "")} // Maneja undefined
      theme="vs-dark"
      beforeMount={beforeMount}
      options={{
        fontFamily: '"Fira Mono", "Courier New", monospace',
        fontSize: 14,
        lineHeight: 1.5 * 14,
        padding: { top: padding, bottom: padding },
        scrollBeyondLastLine: false,
        minimap: { enabled: false },
        wordWrap: "on",
        wrappingIndent: "indent",
        tabSize: 2,
        automaticLayout: true,
      }}
      className={className}
      wrapperProps={{ style: { ...style, padding: `${padding}px` } }}
    />
  );
};
