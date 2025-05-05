import { FC, Dispatch, SetStateAction } from "react";
import Editor from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import jsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

interface CodeEditorWrapperProps {
  value: string;
  onValueChange: Dispatch<SetStateAction<string>>;
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
    self.MonacoEnvironment = {
      baseUrl: "/code-editor/",
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
      onChange={(newValue) => onValueChange(newValue || "")}
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
