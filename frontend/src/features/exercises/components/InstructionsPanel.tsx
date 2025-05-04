import { FC, JSX } from "react";
import { useTheme } from "@/context/ThemeContext";
import { InstructionElement } from "@/types/exercise";
import { Highlight, themes } from "prism-react-renderer";
import { Copy } from "lucide-react";
import { toast } from "react-toastify";

interface InstructionsPanelProps {
  instructionElements: InstructionElement[];
  instructionImages: { [key: string]: string };
}

export const InstructionsPanel: FC<InstructionsPanelProps> = ({
  instructionElements,
  instructionImages,
}) => {
  const { theme } = useTheme();

  const renderCodeBlock = (code: string, language: string) => (
    <div className="relative rounded-lg overflow-hidden">
      <Highlight theme={themes.vsDark} code={code} language={language}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${className} p-4 rounded-lg text-sm notranslate`}
            translate="no"
            style={{
              ...style,
              background: theme.colors.card,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              boxShadow: `0 2px 4px rgba(0, 0, 0, 0.3)`,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "0",
                top: "0",
                bottom: "0",
                width: "2rem",
                background: theme.colors.border,
                color: theme.colors.secondary,
                textAlign: "right",
                padding: "1rem 0.5rem",
                borderRight: `1px solid ${theme.colors.border}`,
              }}
            >
              {tokens.map((_, i) => (
                <div key={i} style={{ lineHeight: "1.5rem" }}>
                  {i + 1}
                </div>
              ))}
            </div>
            <div style={{ marginLeft: "2.5rem" }}>
              {tokens.map((line, i) => {
                const { key, ...lineProps } = getLineProps({ line, key: i });
                return (
                  <div key={i} {...lineProps} style={{ lineHeight: "1.5rem" }}>
                    {line.map((token, index) => {
                      const { key: tokenKey, ...tokenProps } = getTokenProps({
                        token,
                        key: index,
                      });
                      return <span key={index} {...tokenProps} />;
                    })}
                  </div>
                );
              })}
            </div>
          </pre>
        )}
      </Highlight>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code);
          toast.success("Código copiado al portapapeles.", {
            toastId: "copy-success",
            autoClose: 3000,
          });
        }}
        className="absolute top-2 right-2 p-2 rounded-md transition-colors"
        style={{
          background: theme.colors.border,
          color: theme.colors.text,
          border: `1px solid ${theme.colors.border}`,
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = theme.colors.accent)
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = theme.colors.border)
        }
        aria-label="Copiar código"
      >
        <Copy className="w-4 h-4" />
      </button>
    </div>
  );

  const renderTextGroup = (group: InstructionElement[]) => {
    const subgroups: InstructionElement[][] = [];
    let currentSubgroup: InstructionElement[] = [];
    let inList = false;

    group.forEach((el, index) => {
      if (el.type === "paragraph-break") {
        if (currentSubgroup.length > 0) {
          subgroups.push(currentSubgroup);
          currentSubgroup = [];
        }
        inList = false;
        return;
      }

      if (el.type === "list-item") {
        if (!inList) {
          if (currentSubgroup.length > 0) {
            subgroups.push(currentSubgroup);
            currentSubgroup = [];
          }
          inList = true;
        }
        currentSubgroup.push(el);
      } else {
        if (inList) {
          if (currentSubgroup.length > 0) {
            subgroups.push(currentSubgroup);
            currentSubgroup = [];
          }
          inList = false;
        }
        currentSubgroup.push(el);
      }

      if (index === group.length - 1 && currentSubgroup.length > 0) {
        subgroups.push(currentSubgroup);
      }
    });

    return (
      <div className="space-y-2">
        {subgroups.map((subgroup, subgroupIndex) => {
          const isList = subgroup.every((el) => el.type === "list-item");

          if (isList) {
            return (
              <ul
                key={`subgroup-${subgroupIndex}`}
                className="text-lg list-disc list-inside space-y-2"
                style={{ color: theme.colors.text, marginBottom: "1rem" }}
              >
                {subgroup.map((el, i) => {
                  let parts: InstructionElement[] = [];
                  try {
                    parts = JSON.parse(el.value);
                  } catch (e) {
                    parts = [{ type: "text", value: el.value }];
                  }
                  return (
                    <li key={i} className="ml-4">
                      {parts.map((part, partIndex) => {
                        switch (part.type) {
                          case "highlight":
                            return (
                              <span
                                key={partIndex}
                                style={{
                                  color: theme.colors.accent,
                                  display: "inline",
                                }}
                              >
                                {part.value}
                              </span>
                            );
                          case "highlight-secondary":
                            return (
                              <span
                                key={partIndex}
                                style={{
                                  color: theme.colors.secondary || "#f59e0b",
                                  display: "inline",
                                }}
                              >
                                {part.value}
                              </span>
                            );
                          case "underline":
                            return (
                              <u
                                key={partIndex}
                                style={{
                                  textDecoration: "underline",
                                  color: theme.colors.text,
                                  display: "inline",
                                }}
                              >
                                {part.value}
                              </u>
                            );
                          case "inline-code":
                            return (
                              <code
                                key={partIndex}
                                className="notranslate"
                                translate="no"
                                style={{
                                  background: theme.colors.border,
                                  color: theme.colors.text,
                                  padding: "2px 4px",
                                  borderRadius: "4px",
                                  fontFamily: "monospace",
                                  display: "inline",
                                }}
                              >
                                {part.value}
                              </code>
                            );
                          case "title":
                            return (
                              <span
                                key={partIndex}
                                style={{
                                  fontSize: "1.5rem",
                                  fontWeight: "bold",
                                  color: theme.colors.accent,
                                  display: "inline",
                                }}
                              >
                                {part.value}
                              </span>
                            );
                          case "text":
                            return <span key={partIndex}>{part.value}</span>;
                          default:
                            return null;
                        }
                      })}
                    </li>
                  );
                })}
              </ul>
            );
          }

          if (subgroup.every((el) => el.type === "paragraph-break")) {
            return null;
          }

          return (
            <p
              key={`subgroup-${subgroupIndex}`}
              className="text-lg whitespace-pre-wrap break-words"
              style={{ color: theme.colors.text, marginBottom: "1rem" }}
            >
              {subgroup.map((el, i) => {
                switch (el.type) {
                  case "text":
                    return <span key={i}>{el.value}</span>;
                  case "highlight":
                    return (
                      <span
                        key={i}
                        style={{
                          color: theme.colors.accent,
                          display: "inline",
                        }}
                      >
                        {el.value}
                      </span>
                    );
                  case "highlight-secondary":
                    return (
                      <span
                        key={i}
                        style={{
                          color: theme.colors.secondary || "#f59e0b",
                          display: "inline",
                        }}
                      >
                        {el.value}
                      </span>
                    );
                  case "title":
                    return (
                      <span
                        key={i}
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: "bold",
                          color: theme.colors.accent,
                          display: "inline",
                        }}
                      >
                        {el.value}
                      </span>
                    );
                  case "inline-code":
                    return (
                      <code
                        key={i}
                        className="notranslate"
                        translate="no"
                        style={{
                          background: theme.colors.border,
                          color: theme.colors.text,
                          padding: "2px 4px",
                          borderRadius: "4px",
                          fontFamily: "monospace",
                          display: "inline",
                        }}
                      >
                        {el.value}
                      </code>
                    );
                  case "underline":
                    return (
                      <u
                        key={i}
                        style={{
                          textDecoration: "underline",
                          color: theme.colors.text,
                          display: "inline",
                        }}
                      >
                        {el.value}
                      </u>
                    );
                  default:
                    return null;
                }
              })}
            </p>
          );
        })}
      </div>
    );
  };

  if (instructionElements.length === 0) {
    return (
      <p className="text-lg" style={{ color: theme.colors.text }}>
        No hay instrucciones disponibles para este ejercicio.
      </p>
    );
  }

  const groupedElements: JSX.Element[] = [];
  let currentTextGroup: InstructionElement[] = [];

  instructionElements.forEach((element, index) => {
    if (
      [
        "text",
        "highlight",
        "highlight-secondary",
        "underline",
        "inline-code",
        "title",
        "list-item",
        "paragraph-break",
      ].includes(element.type)
    ) {
      currentTextGroup.push(element);
    } else {
      if (currentTextGroup.length > 0) {
        groupedElements.push(
          <div key={`text-group-${index}`} className="space-y-2">
            {renderTextGroup(currentTextGroup)}
          </div>
        );
        currentTextGroup = [];
      }

      if (element.type === "code" && element.value) {
        groupedElements.push(
          <div key={`code-${index}`} className="space-y-2">
            <p
              className="text-sm font-semibold"
              style={{ color: theme.colors.accent }}
            >
              Ejemplo de Código ({element.language}):
            </p>
            {renderCodeBlock(element.value, element.language)}
          </div>
        );
      } else if (element.type === "image" && element.value) {
        groupedElements.push(
          <div key={`image-${index}`} className="space-y-2">
            <img
              src={instructionImages[element.value] || ""}
              alt={`Imagen ${index + 1}`}
              className="w-full max-w-md rounded-md object-contain"
              onError={() =>
                toast.error(`No se pudo cargar la imagen ${index + 1}.`, {
                  toastId: "image-error",
                  autoClose: 3000,
                })
              }
              style={{ border: `1px solid ${theme.colors.border}` }}
            />
          </div>
        );
      }
    }
  });

  if (currentTextGroup.length > 0) {
    groupedElements.push(
      <div key="text-group-final" className="space-y-2">
        {renderTextGroup(currentTextGroup)}
      </div>
    );
  }

  return <div className="space-y-4">{groupedElements}</div>;
};
