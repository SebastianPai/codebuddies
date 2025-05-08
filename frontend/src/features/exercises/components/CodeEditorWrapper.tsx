"use client";

import { FC } from "react";
import Editor from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { loader } from "@monaco-editor/react";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import jsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

// Configura la ruta base para Monaco Editor
loader.config({
  paths: {
    vs: "/monaco-editor/vs", // Apunta a public/monaco-editor/vs
  },
});

interface CodeEditorWrapperProps {
  value: string;
  onValueChange: (value: string) => void; // Ajustado para aceptar solo string
  highlightLanguage: string;
  padding?: number;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export const CodeEditorWrapper: FC<CodeEditorWrapperProps> = ({
  value,
  onValueChange,
  highlightLanguage,
  padding = 16,
  className = "",
  style = {},
  disabled = false,
}) => {
  const beforeMount = (monaco: typeof Monaco) => {
    self.MonacoEnvironment = {
      baseUrl: "/monaco-editor/vs/", // Ruta correcta para los recursos
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
  };

  return (
    <Editor
      height="100%"
      width="100%"
      language={highlightLanguage}
      value={value}
      onChange={(newValue) => !disabled && onValueChange(newValue || "")}
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
        readOnly: disabled,
      }}
      className={className}
      wrapperProps={{ style: { ...style, padding: `${padding}px` } }}
    />
  );
};
