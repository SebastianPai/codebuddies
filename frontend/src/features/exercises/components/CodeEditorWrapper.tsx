import { FC } from "react";
import Editor from "@monaco-editor/react";

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
