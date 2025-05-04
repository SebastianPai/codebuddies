import { FC, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { CodeEditorWrapper } from "./CodeEditorWrapper";
import { Copy, FileCode, FileText, Monitor, Play } from "lucide-react";
import { toast } from "react-toastify";

interface CodeEditorProps {
  language: string;
  htmlCode: string;
  cssCode: string;
  setHtmlCode: (code: string) => void;
  setCssCode: (code: string) => void;
  onRunCode: () => void;
}

export const CodeEditor: FC<CodeEditorProps> = ({
  language,
  htmlCode,
  cssCode,
  setHtmlCode,
  setCssCode,
  onRunCode,
}) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState("index.html");

  const handleCopy = () => {
    navigator.clipboard.writeText(
      language === "css"
        ? cssCode
        : activeTab === "index.html"
        ? htmlCode
        : cssCode
    );
    toast.success("Código copiado al portapapeles.", {
      toastId: "copy-success",
      autoClose: 3000,
    });
  };

  const code =
    language === "css"
      ? cssCode
      : activeTab === "index.html"
      ? htmlCode
      : cssCode;
  const highlightLanguage = language === "css" ? "css" : "html";

  return (
    <div
      className="w-full flex flex-col border-r h-full"
      style={{
        borderColor: theme.colors.border,
        background: theme.colors.card,
      }}
    >
      {language === "html" && (
        <div
          className="flex border-b"
          style={{ borderColor: theme.colors.border }}
        >
          <button
            className={`px-4 py-2 flex items-center ${
              activeTab === "index.html" ? "text-white" : "text-gray-400"
            }`}
            style={{
              background:
                activeTab === "index.html"
                  ? theme.colors.card
                  : theme.colors.border,
            }}
            onClick={() => setActiveTab("index.html")}
          >
            <FileCode
              className="w-4 h-4 mr-2"
              style={{ color: theme.colors.accent }}
            />
            index.html
          </button>
          <button
            className={`px-4 py-2 flex items-center ${
              activeTab === "styles.css" ? "text-white" : "text-gray-400"
            }`}
            style={{
              background:
                activeTab === "styles.css"
                  ? theme.colors.card
                  : theme.colors.border,
            }}
            onClick={() => setActiveTab("styles.css")}
          >
            <FileText
              className="w-4 h-4 mr-2"
              style={{ color: theme.colors.accent }}
            />
            styles.css
          </button>
        </div>
      )}
      <div className="flex-1 font-mono text-sm w-full h-full">
        <CodeEditorWrapper
          value={code}
          onValueChange={(newCode) =>
            language === "css"
              ? setCssCode(newCode)
              : activeTab === "index.html"
              ? setHtmlCode(newCode)
              : setCssCode(newCode)
          }
          highlightLanguage={highlightLanguage}
          padding={16}
          className="font-mono text-sm w-full h-full outline-none"
          style={{
            background: theme.colors.card,
            color: theme.colors.text,
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
          }}
        />
      </div>
      <div
        className="flex justify-between items-center p-2 border-t w-full sticky bottom-0 md:static z-10"
        style={{
          background: theme.colors.card,
          borderColor: theme.colors.border,
        }}
      >
        <div>
          <button
            onClick={onRunCode}
            className="flex items-center justify-center px-4 py-2 rounded-md"
            style={{
              background: theme.colors.accent,
              color: theme.colors.buttonText,
            }}
          >
            <Play className="w-4 h-4 mr-2" />
            Run
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleCopy}
            className="p-2 rounded-md"
            style={{ color: theme.colors.text }}
          >
            <Copy className="w-5 h-5" />
          </button>
          <button
            className="p-2 rounded-md"
            style={{ color: theme.colors.text }}
          >
            <Monitor className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
