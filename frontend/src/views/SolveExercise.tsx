"use client";

import { useEffect, useState, useCallback, JSX } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Code,
  Play,
  ChevronLeft,
  ChevronRight,
  Info,
  Copy,
  FileCode,
  FileText,
  Monitor,
} from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import Editor from "react-simple-code-editor";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "@/context/ThemeContext";
import Navbar from "../components/Navbar";
import Modal from "react-modal";

// Configurar react-modal
Modal.setAppElement("#root");

interface Exercise {
  order: number;
  title: string;
  content: string;
  instructions?: string;
  language: string;
  expectedOutput?: string;
}

interface Lesson {
  _id: string;
  title: string;
  exercises: Exercise[];
}

type InstructionElement =
  | { type: "text"; value: string }
  | { type: "code"; language: string; value: string }
  | { type: "image"; value: string }
  | { type: "underline"; value: string }
  | { type: "inline-code"; value: string }
  | { type: "title"; value: string }
  | { type: "list-item"; value: string }
  | { type: "highlight"; value: string }
  | { type: "highlight-secondary"; value: string }
  | { type: "paragraph-break" };

interface ErrorResponse {
  message?: string;
}

export default function SolveExercise() {
  const { theme } = useTheme();
  const { fetchWithAuth } = useAuth();
  const { courseId, lessonId, exerciseOrder } = useParams<{
    courseId: string;
    lessonId: string;
    exerciseOrder: string;
  }>();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [htmlCode, setHtmlCode] = useState(
    "<!-- Escribe tu código aquí ❤️ -->\n\n"
  );
  const [cssCode, setCssCode] = useState("/* Estilos para la página */\n\n");
  const [jsCode, setJsCode] = useState("// Escribe tu código aquí\n\n");
  const [activeTab, setActiveTab] = useState("index.html");
  const [terminalOutput, setTerminalOutput] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{
    isCorrect: boolean;
    message: string;
  }>({ isCorrect: false, message: "" });
  const [loading, setLoading] = useState(true);
  const [instructionElements, setInstructionElements] = useState<
    InstructionElement[]
  >([]);
  const [isExerciseCompleted, setIsExerciseCompleted] = useState(false);
  const [showFeedbackScreen, setShowFeedbackScreen] = useState<
    "correct" | "incorrect" | null
  >(null);

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) {
      return "/uploads/default-image.jpg";
    }
    if (imagePath.startsWith("data:")) {
      return imagePath;
    }
    const baseUrl =
      import.meta.env.VITE_API_URL ||
      "https://codebuddies-jh-3e772884b367.herokuapp.com";

    if (imagePath.startsWith("/uploads/")) {
      return `${baseUrl}${imagePath}`;
    }

    return `${baseUrl}/api/proxy-image?url=${encodeURIComponent(imagePath)}`;
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (!courseId || !lessonId || !exerciseOrder) {
        throw new Error(
          `Parámetros inválidos: courseId=${courseId}, lessonId=${lessonId}, exerciseOrder=${exerciseOrder}`
        );
      }

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error(
          "No se encontró un token de autenticación. Por favor, inicia sesión."
        );
      }

      const lessonRes = await fetchWithAuth(`/api/lessons/${lessonId}`);
      if (!lessonRes.ok) {
        const errorData = await lessonRes.json();
        throw new Error(errorData.message || "Error al obtener la lección");
      }
      const lessonData = await lessonRes.json();
      setLesson(lessonData);

      const exerciseRes = await fetchWithAuth(
        `/api/lessons/${lessonId}/exercises/${exerciseOrder}`
      );
      if (!exerciseRes.ok) {
        const errorData = await exerciseRes.json();
        throw new Error(errorData.message || "Error al obtener el ejercicio");
      }
      const fetchedExercise = await exerciseRes.json();
      setExercise(fetchedExercise);

      if (fetchedExercise.language === "html") {
        setHtmlCode(
          fetchedExercise.content || "<!-- Escribe tu código aquí ❤️ -->\n\n"
        );
        setCssCode("/* Estilos para la página */\n\n");
      } else if (fetchedExercise.language === "css") {
        setCssCode(
          fetchedExercise.content || "/* Estilos para la página */\n\n"
        );
        setHtmlCode("");
      } else if (fetchedExercise.language === "javascript") {
        setJsCode(fetchedExercise.content || "// Escribe tu código aquí\n\n");
        setHtmlCode("");
      }

      if (fetchedExercise.instructions) {
        parseInstructions(fetchedExercise.instructions);
      }

      const progressRes = await fetchWithAuth(
        `/api/progress/courses/${courseId}/lessons/${lessonId}/exercises/${exerciseOrder}/progress`
      );
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        setIsExerciseCompleted(progressData.completed || false);
      } else {
        setIsExerciseCompleted(false);
        const errorData = await progressRes.json();
        toast.warn(
          errorData.message || "No se pudo cargar el progreso del ejercicio.",
          {
            toastId: "progress-error",
          }
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "No se pudo cargar el ejercicio.";
      toast.error(errorMessage, { toastId: "fetch-error" });
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonId, exerciseOrder, fetchWithAuth]);

  useEffect(() => {
    if (courseId && lessonId && exerciseOrder) {
      fetchData();
    } else {
      toast.error("Faltan parámetros en la URL.", { toastId: "url-error" });
      setLoading(false);
    }
  }, [courseId, lessonId, exerciseOrder, fetchData]);

  const parseInstructions = (instructions: string) => {
    const elements: InstructionElement[] = [];
    let inCodeBlock = false;
    let codeBlockLanguage = "";
    let codeBlockContent: string[] = [];

    const lines = instructions.split("\n");

    lines.forEach((line, index) => {
      if (line.trim().startsWith("```")) {
        if (inCodeBlock) {
          elements.push({
            type: "code",
            language: codeBlockLanguage || "text",
            value: codeBlockContent.join("\n"),
          });
          inCodeBlock = false;
          codeBlockLanguage = "";
          codeBlockContent = [];
        } else {
          inCodeBlock = true;
          codeBlockLanguage = line.trim().slice(3).trim() || "text";
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      if (!line.trim()) {
        elements.push({ type: "paragraph-break" });
        return;
      }

      const subLines = line.split("\\n").filter((subLine) => subLine.trim());

      subLines.forEach((subLine, subIndex) => {
        const imageMatch =
          subLine.match(/!\[.*?\]\((.*?)\)/) ||
          subLine.match(/(https?:\/\/.*\.(?:png|jpg|jpeg|gif))/i);
        if (imageMatch) {
          elements.push({
            type: "image",
            value: imageMatch[1] || imageMatch[0],
          });
          if (subIndex < subLines.length - 1) {
            elements.push({ type: "paragraph-break" });
          }
          return;
        }

        if (
          subLine.trim().startsWith("- ") ||
          subLine.trim().startsWith("* ")
        ) {
          const content = subLine.slice(subLine.indexOf(subLine.trim()[0]) + 2);
          if (content) {
            const parts: InstructionElement[] = [];
            let currentText = "";
            const regex =
              /(\*\*[^\*]+\*\*)|(__[^_]+__)|(_[^_]+_)|(`[^`]+`)|(##[^#]+##)|(<[a-zA-Z0-9]+>)/g;
            let lastIndex = 0;
            let match;

            while ((match = regex.exec(content)) !== null) {
              const matchStart = match.index;
              const matchEnd = matchStart + match[0].length;

              if (lastIndex < matchStart) {
                currentText = content.slice(lastIndex, matchStart);
                if (currentText) {
                  parts.push({ type: "text", value: currentText });
                }
              }

              const matchedText = match[0];
              if (matchedText.startsWith("**") && matchedText.endsWith("**")) {
                parts.push({
                  type: "highlight",
                  value: matchedText.slice(2, -2),
                });
              } else if (
                matchedText.startsWith("__") &&
                matchedText.endsWith("__")
              ) {
                parts.push({
                  type: "highlight-secondary",
                  value: matchedText.slice(2, -2),
                });
              } else if (
                matchedText.startsWith("_") &&
                matchedText.endsWith("_")
              ) {
                parts.push({
                  type: "underline",
                  value: matchedText.slice(1, -1),
                });
              } else if (
                matchedText.startsWith("`") &&
                matchedText.endsWith("`")
              ) {
                parts.push({
                  type: "inline-code",
                  value: matchedText.slice(1, -1),
                });
              } else if (
                matchedText.startsWith("##") &&
                matchedText.endsWith("##")
              ) {
                parts.push({
                  type: "title",
                  value: matchedText.slice(2, -2),
                });
              } else if (matchedText.match(/^<[a-zA-Z0-9]+>$/)) {
                parts.push({
                  type: "inline-code",
                  value: matchedText.slice(1, -1),
                });
              }

              lastIndex = matchEnd;
            }

            if (lastIndex < content.length) {
              currentText = content.slice(lastIndex);
              if (currentText) {
                parts.push({ type: "text", value: currentText });
              }
            }

            elements.push({
              type: "list-item",
              value: JSON.stringify(parts),
            });
          }
          if (subIndex < subLines.length - 1) {
            elements.push({ type: "paragraph-break" });
          }
          return;
        }

        let currentText = "";
        const regex =
          /(\*\*[^\*]+\*\*)|(__[^_]+__)|(_[^_]+_)|(`[^`]+`)|(##[^#]+##)|(<[a-zA-Z0-9]+>)/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(subLine)) !== null) {
          const matchStart = match.index;
          const matchEnd = matchStart + match[0].length;

          if (lastIndex < matchStart) {
            currentText = subLine.slice(lastIndex, matchStart);
            if (currentText) {
              elements.push({ type: "text", value: currentText });
            }
          }

          const matchedText = match[0];
          if (matchedText.startsWith("**") && matchedText.endsWith("**")) {
            elements.push({
              type: "highlight",
              value: matchedText.slice(2, -2),
            });
          } else if (
            matchedText.startsWith("__") &&
            matchedText.endsWith("__")
          ) {
            elements.push({
              type: "highlight-secondary",
              value: matchedText.slice(2, -2),
            });
          } else if (matchedText.startsWith("_") && matchedText.endsWith("_")) {
            elements.push({
              type: "underline",
              value: matchedText.slice(1, -1),
            });
          } else if (matchedText.startsWith("`") && matchedText.endsWith("`")) {
            elements.push({
              type: "inline-code",
              value: matchedText.slice(1, -1),
            });
          } else if (
            matchedText.startsWith("##") &&
            matchedText.endsWith("##")
          ) {
            elements.push({
              type: "title",
              value: matchedText.slice(2, -2),
            });
          } else if (matchedText.match(/^<[a-zA-Z0-9]+>$/)) {
            elements.push({
              type: "inline-code",
              value: matchedText.slice(1, -1),
            });
          }

          lastIndex = matchEnd;
        }

        if (lastIndex < subLine.length) {
          currentText = subLine.slice(lastIndex);
          if (currentText) {
            elements.push({ type: "text", value: currentText });
          }
        }

        if (subIndex < subLines.length - 1) {
          elements.push({ type: "paragraph-break" });
        }
      });
    });

    if (inCodeBlock && codeBlockContent.length > 0) {
      elements.push({
        type: "code",
        language: codeBlockLanguage || "text",
        value: codeBlockContent.join("\n"),
      });
    }

    setInstructionElements(elements);
  };

  const handleNavigate = (direction: "prev" | "next") => {
    if (!lesson || !exercise) return;

    const currentOrder = exercise.order;
    const sortedExercises = lesson.exercises.sort((a, b) => a.order - b.order);
    const currentIndex = sortedExercises.findIndex(
      (ex) => ex.order === currentOrder
    );

    if (direction === "prev" && currentIndex > 0) {
      const prevExercise = sortedExercises[currentIndex - 1];
      navigate(
        `/courses/${courseId}/lessons/${lessonId}/exercises/${prevExercise.order}`
      );
    } else if (
      direction === "next" &&
      currentIndex < sortedExercises.length - 1
    ) {
      const nextExercise = sortedExercises[currentIndex + 1];
      navigate(
        `/courses/${courseId}/lessons/${lessonId}/exercises/${nextExercise.order}`
      );
    }
  };

  const handleRunCode = () => {
    if (
      exercise?.language === "javascript" ||
      exercise?.language === "python"
    ) {
      setTerminalOutput(">> Simulando ejecución del código...");
    }
  };

  const handleCheckAnswer = async () => {
    if (!exercise?.expectedOutput) {
      setModalContent({
        isCorrect: false,
        message: "⚠️ No hay salida esperada definida.",
      });
      setIsModalOpen(true);
      setShowFeedbackScreen("incorrect");
      setTimeout(() => setShowFeedbackScreen(null), 2000);
      return;
    }

    const normalizeCSS = (code: string) =>
      code
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "")
        .trim()
        .replace(/\s+/g, " ")
        .replace(/; /g, ";")
        .replace(/ *{ */g, "{")
        .replace(/ *} */g, "}");

    const normalizeCode = (code: string) =>
      code
        .trim()
        .replace(/\s+/g, " ")
        .replace(/[\r\n]+/g, "")
        .toLowerCase();

    let userOutput = "";
    let expectedOutput = exercise.expectedOutput;

    switch (exercise.language) {
      case "html":
        try {
          const response = await fetchWithAuth(`/api/lessons/validate-html`, {
            method: "POST",
            body: JSON.stringify({
              userCode: htmlCode,
              expectedOutput: exercise.expectedOutput,
            }),
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.message || "Error al validar el código HTML"
            );
          }
          const responseData = await response.json();

          setModalContent({
            isCorrect: responseData.isCorrect,
            message: responseData.message,
          });

          setShowFeedbackScreen(
            responseData.isCorrect ? "correct" : "incorrect"
          );
          setTimeout(() => setShowFeedbackScreen(null), 2000);

          if (responseData.isCorrect) {
            setIsExerciseCompleted(true);
            const progressResponse = await fetchWithAuth(
              `/api/progress/courses/${courseId}/lessons/${lessonId}/exercises/${exerciseOrder}/complete`,
              {
                method: "POST",
              }
            );
            if (!progressResponse.ok) {
              const errorData = await progressResponse.json();
              throw new Error(
                errorData.message || "Error al guardar el progreso"
              );
            }
            toast.success(`🎉 Ejercicio número ${exercise.order} superado.`, {
              toastId: "progress-success",
            });
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "❌ Error al validar el código. Intenta de nuevo.";
          setModalContent({
            isCorrect: false,
            message: errorMessage,
          });
          setShowFeedbackScreen("incorrect");
          setTimeout(() => setShowFeedbackScreen(null), 2000);
        }
        break;

      case "css":
        userOutput = normalizeCSS(cssCode);
        expectedOutput = normalizeCSS(expectedOutput);
        break;

      case "javascript":
        userOutput = normalizeCode(jsCode);
        expectedOutput = normalizeCode(expectedOutput);
        break;

      default:
        setModalContent({
          isCorrect: false,
          message: "⚠️ Lenguaje no soportado.",
        });
        setIsModalOpen(true);
        setShowFeedbackScreen("incorrect");
        setTimeout(() => setShowFeedbackScreen(null), 2000);
        return;
    }

    if (exercise.language !== "html") {
      const isCorrect = userOutput === expectedOutput;
      setModalContent({
        isCorrect,
        message: isCorrect
          ? "✅ ¡Respuesta correcta!"
          : "❌ Intenta de nuevo. Verifica la sintaxis y el contenido del código.",
      });
      setShowFeedbackScreen(isCorrect ? "correct" : "incorrect");
      setTimeout(() => setShowFeedbackScreen(null), 2000);

      if (isCorrect) {
        setIsExerciseCompleted(true);
        try {
          const progressResponse = await fetchWithAuth(
            `/api/progress/courses/${courseId}/lessons/${lessonId}/exercises/${exerciseOrder}/complete`,
            {
              method: "POST",
            }
          );
          if (!progressResponse.ok) {
            const errorData = await progressResponse.json();
            throw new Error(
              errorData.message || "Error al guardar el progreso"
            );
          }
          toast.success(`🎉 Ejercicio número ${exercise.order} superado.`, {
            toastId: "progress-success",
          });
        } catch (progressError: unknown) {
          const errorMessage =
            progressError instanceof Error
              ? progressError.message
              : "Error al guardar el progreso.";
          toast.error(errorMessage, { toastId: "progress-error" });
        }
      }
    }

    setIsModalOpen(true);
  };

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

  const renderPreview = () => {
    const escapeCode = (code: string) =>
      code.replace(/</g, "<").replace(/>/g, ">");

    const proxiedHtmlCode = htmlCode.replace(
      /<img[^>]+src=["'](.*?)["']/gi,
      (match, url) => `<img src="${getImageUrl(url)}"`
    );

    const cssContent =
      exercise?.language === "html" || exercise?.language === "css"
        ? escapeCode(cssCode)
        : "";
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>${cssContent}</style>
      </head>
      <body>
        ${escapeCode(proxiedHtmlCode)}
      </body>
      </html>
    `;
    return (
      <iframe
        srcDoc={htmlContent}
        className="w-full h-full rounded-b-lg"
        title="Vista previa del ejercicio"
        style={{
          background:
            theme.name === "dark" ? "#FFFFFF" : theme.colors.background,
          border: `1px solid ${theme.colors.border}`,
        }}
        sandbox="allow-scripts" // Solo allow-scripts
      />
    );
  };

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

  const renderInstructions = () => {
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
                src={getImageUrl(element.value)}
                alt={`Imagen ${index + 1}`}
                className="w-full max-w-md rounded-md object-contain"
                onError={() =>
                  toast.error(`No se pudo cargar la imagen ${index + 1}.`, {
                    toastId: "image-error",
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

  const renderContent = () => {
    if (loading) {
      return (
        <div
          className="flex justify-center p-8"
          style={{
            background: theme.colors.background,
            color: theme.colors.text,
          }}
        >
          <div
            className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"
            style={{ borderColor: theme.colors.accent }}
            aria-label="Cargando ejercicio"
          ></div>
        </div>
      );
    }

    if (!exercise) {
      return (
        <div
          className="p-8 text-center"
          style={{
            background: theme.colors.background,
            color: theme.colors.text,
          }}
        >
          <p style={{ color: theme.colors.secondary }} aria-live="polite">
            Ejercicio no encontrado.
          </p>
        </div>
      );
    }

    if (exercise.language === "html" || exercise.language === "css") {
      return (
        <>
          <header
            className="flex items-center justify-between p-4 border-b"
            style={{
              background: theme.colors.card,
              borderColor: theme.colors.border,
            }}
          >
            <h1
              className="text-4xl font-bold"
              style={{ color: theme.colors.text }}
            >
              Ejercicio - {exercise.language.toUpperCase()}
            </h1>
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
            </div>
          </header>

          <div className="flex flex-1 overflow-hidden">
            <div
              className="w-1/3 p-6 overflow-y-auto border-r min-w-0"
              style={{
                background: theme.colors.card,
                borderColor: theme.colors.border,
              }}
            >
              <div className="space-y-6 max-w-full">
                <h2
                  className="text-4xl font-bold mb-4"
                  style={{ color: theme.colors.text }}
                >
                  {`${exercise.order}. ${exercise.title}`}
                </h2>
                <div className="flex items-center mb-4">
                  <span className="mr-2" style={{ color: theme.colors.accent }}>
                    #
                  </span>
                  <h3
                    className="text-2xl font-bold"
                    style={{ color: theme.colors.text }}
                  >
                    {exercise.language.toUpperCase()}
                  </h3>
                </div>
                <div className="space-y-4">{renderInstructions()}</div>
              </div>
            </div>

            <div
              className="w-1/3 flex flex-col border-r min-w-0"
              style={{ borderColor: theme.colors.border }}
            >
              {exercise.language === "html" && (
                <div
                  className="flex border-b"
                  style={{ borderColor: theme.colors.border }}
                >
                  <button
                    className={`px-4 py-2 flex items-center ${
                      activeTab === "index.html"
                        ? "text-white"
                        : "text-gray-400"
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
                      activeTab === "styles.css"
                        ? "text-white"
                        : "text-gray-400"
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
              <div className="flex-1 overflow-auto font-mono text-sm">
                <Editor
                  value={
                    exercise.language === "css"
                      ? cssCode
                      : activeTab === "index.html"
                      ? htmlCode
                      : cssCode
                  }
                  onValueChange={(code) =>
                    exercise.language === "css"
                      ? setCssCode(code)
                      : activeTab === "index.html"
                      ? setHtmlCode(code)
                      : setCssCode(code)
                  }
                  highlight={(code) => (
                    <Highlight
                      theme={themes.vsDark}
                      code={code}
                      language={exercise.language === "css" ? "css" : "html"}
                    >
                      {({
                        className,
                        style,
                        tokens,
                        getLineProps,
                        getTokenProps,
                      }) => (
                        <pre
                          className={className}
                          style={{
                            ...style,
                            background: theme.colors.card,
                            color: theme.colors.text,
                            border: `1px solid ${theme.colors.border}`,
                            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                          }}
                        >
                          {tokens.map((line, i) => {
                            const { key, ...lineProps } = getLineProps({
                              line,
                              key: i,
                            });
                            return (
                              <div key={i} {...lineProps}>
                                {line.map((token, index) => {
                                  const { key: tokenKey, ...tokenProps } =
                                    getTokenProps({ token, key: index });
                                  return <span key={index} {...tokenProps} />;
                                })}
                              </div>
                            );
                          })}
                        </pre>
                      )}
                    </Highlight>
                  )}
                  padding={16}
                  className="font-mono text-sm rounded-lg h-full outline-none"
                  style={{
                    background: theme.colors.card,
                    color: theme.colors.text,
                  }}
                />
              </div>
              <div
                className="flex items-center justify-between p-2 border-t"
                style={{
                  background: theme.colors.card,
                  borderColor: theme.colors.border,
                }}
              >
                <button
                  onClick={handleRunCode}
                  className="flex items-center justify-center px-4 py-2 rounded-md"
                  style={{
                    background: theme.colors.accent,
                    color: theme.colors.buttonText,
                  }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Runn
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        exercise.language === "css"
                          ? cssCode
                          : activeTab === "index.html"
                          ? htmlCode
                          : cssCode
                      );
                      toast.success("Código copiado al portapapeles.", {
                        toastId: "copy-success",
                      });
                    }}
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

            <div className="w-1/3 flex flex-col min-w-0">
              <div
                className="p-2 flex items-center justify-between border-b"
                style={{
                  background: theme.colors.card,
                  borderColor: theme.colors.border,
                }}
              >
                <div className="flex space-x-1 ml-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="flex-1 mx-4">
                  <div
                    className="rounded-md px-2 py-1 text-center text-sm"
                    style={{
                      background: theme.colors.border,
                      color: theme.colors.text,
                    }}
                  >
                    index.html
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-auto">{renderPreview()}</div>
            </div>
          </div>

          <footer
            className="border-t p-2 flex items-center justify-between"
            style={{
              background: theme.colors.card,
              borderColor: theme.colors.border,
            }}
          >
            <div className="flex items-center">
              <button
                className="p-2 rounded-md"
                style={{
                  background: theme.colors.border,
                  color: theme.colors.text,
                }}
              >
                <Code className="w-5 h-5" />
              </button>
              <div className="ml-4 text-sm">
                <div className="font-bold" style={{ color: theme.colors.text }}>
                  {`${exercise.order}. ${exercise.title}`}
                </div>
                <div style={{ color: theme.colors.accent }}>10 XP</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleNavigate("prev")}
                disabled={
                  !lesson ||
                  !exercise ||
                  lesson.exercises.findIndex(
                    (ex) => ex.order === exercise.order
                  ) === 0
                }
                className="px-4 py-2 rounded-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: theme.colors.border,
                  color: theme.colors.text,
                }}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                <span>Anterior</span>
              </button>
              <button
                onClick={handleCheckAnswer}
                className="px-4 py-2 rounded-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: theme.colors.accent,
                  color: theme.colors.buttonText,
                }}
                disabled={
                  exercise.language === "css"
                    ? !cssCode.trim()
                    : !htmlCode.trim()
                }
              >
                <Play className="w-4 h-4 mr-2" />
                <span>Comprobar</span>
              </button>
              <button
                onClick={() => handleNavigate("next")}
                disabled={
                  !lesson ||
                  !exercise ||
                  lesson.exercises.findIndex(
                    (ex) => ex.order === exercise.order
                  ) ===
                    lesson.exercises.length - 1 ||
                  !isExerciseCompleted
                }
                className="px-4 py-2 rounded-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: theme.colors.border,
                  color: theme.colors.text,
                }}
              >
                <span>Próximo</span>
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
              <button
                className="p-2 rounded-md"
                style={{
                  background: theme.colors.border,
                  color: theme.colors.text,
                }}
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center">
              <div className="flex -space-x-2">
                <div
                  className="w-8 h-8 rounded-full bg-red-500 border-2"
                  style={{ borderColor: theme.colors.border }}
                ></div>
                <div
                  className="w-8 h-8 rounded-full bg-blue-500 border-2"
                  style={{ borderColor: theme.colors.border }}
                ></div>
                <div
                  className="w-8 h-8 rounded-full bg-green-500 border-2"
                  style={{ borderColor: theme.colors.border }}
                ></div>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
                  style={{
                    background: theme.colors.accent,
                    color: theme.colors.buttonText,
                    borderColor: theme.colors.border,
                  }}
                >
                  +13
                </div>
              </div>
            </div>
          </footer>
        </>
      );
    }

    return (
      <>
        <div
          className="p-4 border-b"
          style={{ borderColor: theme.colors.border }}
        >
          <h1
            className="text-4xl font-bold"
            style={{ color: theme.colors.text }}
          >
            Ejercicio - {exercise.language.toUpperCase()}
          </h1>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div
            className="w-1/2 overflow-y-auto p-6 border-r min-w-0"
            style={{ borderColor: theme.colors.border }}
          >
            <div className="space-y-6 max-w-full">
              <h2
                className="text-4xl font-bold mb-4"
                style={{ color: theme.colors.text }}
              >
                {`${exercise.order}. ${exercise.title}`}
              </h2>
              <div className="flex items-center mb-4">
                <span className="mr-2" style={{ color: theme.colors.accent }}>
                  #
                </span>
                <h3
                  className="text-2xl font-bold"
                  style={{ color: theme.colors.text }}
                >
                  {exercise.language.toUpperCase()}
                </h3>
              </div>
              <div className="space-y-4">{renderInstructions()}</div>
            </div>
          </div>

          <div className="w-1/2 flex flex-col min-w-0">
            <div
              className="flex items-center p-2 border-b"
              style={{
                background: theme.colors.card,
                borderColor: theme.colors.border,
              }}
            >
              <div className="flex items-center space-x-2 px-2">
                <Code size={16} style={{ color: theme.colors.accent }} />
                <span style={{ color: theme.colors.text }}>
                  {exercise.language === "javascript"
                    ? "script.js"
                    : exercise.language === "python"
                    ? "script.py"
                    : "code"}
                </span>
              </div>
            </div>

            <div
              className="flex-1 overflow-hidden p-4"
              style={{ background: theme.colors.card }}
            >
              <Editor
                value={jsCode}
                onValueChange={setJsCode}
                highlight={(code) => (
                  <Highlight
                    theme={themes.vsDark}
                    code={code}
                    language={
                      exercise.language === "javascript"
                        ? "js"
                        : exercise.language
                    }
                  >
                    {({
                      className,
                      style,
                      tokens,
                      getLineProps,
                      getTokenProps,
                    }) => (
                      <pre
                        className={className}
                        style={{
                          ...style,
                          background: theme.colors.card,
                          color: theme.colors.text,
                          border: `1px solid ${theme.colors.border}`,
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                        }}
                      >
                        {tokens.map((line, i) => {
                          const { key, ...lineProps } = getLineProps({
                            line,
                            key: i,
                          });
                          return (
                            <div key={i} {...lineProps}>
                              {line.map((token, index) => {
                                const { key: tokenKey, ...tokenProps } =
                                  getTokenProps({ token, key: index });
                                return <span key={index} {...tokenProps} />;
                              })}
                            </div>
                          );
                        })}
                      </pre>
                    )}
                  </Highlight>
                )}
                padding={16}
                className="font-mono text-sm rounded-lg h-full outline-none"
                style={{
                  background: theme.colors.card,
                  color: theme.colors.text,
                }}
              />
            </div>

            <div
              className="flex items-center justify-between p-2 border-t"
              style={{
                background: theme.colors.card,
                borderColor: theme.colors.border,
              }}
            >
              <button
                onClick={handleRunCode}
                className="px-4 py-1 rounded flex items-center space-x-2"
                style={{
                  background: theme.colors.accent,
                  color: theme.colors.buttonText,
                }}
              >
                <Play size={16} />
                <span>Run</span>
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(jsCode);
                    toast.success("Código copiado al portapapeles.", {
                      toastId: "copy-success",
                    });
                  }}
                  className="p-2 rounded-md"
                  style={{ color: theme.colors.text }}
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div
              className="h-1/3 border-t flex flex-col"
              style={{
                background: theme.colors.card,
                borderColor: theme.colors.border,
              }}
            >
              <div
                className="p-2 border-b"
                style={{
                  background: theme.colors.card,
                  borderColor: theme.colors.border,
                }}
              >
                <h3 style={{ color: theme.colors.text }}>Terminal</h3>
              </div>
              <div
                className="flex-1 p-4 font-mono text-sm overflow-auto"
                style={{ color: theme.colors.text }}
              >
                {terminalOutput || ">"}
              </div>
            </div>
          </div>
        </div>

        <footer
          className="p-4 border-t flex justify-center items-center space-x-3"
          style={{ borderColor: theme.colors.border }}
        >
          <button
            onClick={() => handleNavigate("prev")}
            disabled={
              !lesson ||
              !exercise ||
              lesson.exercises.findIndex(
                (ex) => ex.order === exercise.order
              ) === 0
            }
            className="px-4 py-2 rounded flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: theme.colors.border,
              color: theme.colors.text,
            }}
          >
            <ChevronLeft size={16} />
            <span>Anterior</span>
          </button>

          <button
            onClick={handleCheckAnswer}
            className="px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: theme.colors.accent,
              color: theme.colors.buttonText,
            }}
            disabled={
              exercise.language === "html" || exercise.language === "css"
                ? !htmlCode.trim() && !cssCode.trim()
                : !jsCode.trim()
            }
          >
            Comprobar respuesta
          </button>

          <button
            onClick={() => handleNavigate("next")}
            disabled={
              !lesson ||
              !exercise ||
              lesson.exercises.findIndex(
                (ex) => ex.order === exercise.order
              ) ===
                lesson.exercises.length - 1 ||
              !isExerciseCompleted
            }
            className="px-4 py-2 rounded flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: theme.colors.border,
              color: theme.colors.text,
            }}
          >
            <span>Próximo</span>
            <ChevronRight size={16} />
          </button>

          <button className="ml-2" style={{ color: theme.colors.text }}>
            <Info size={16} />
          </button>
        </footer>
      </>
    );
  };

  return (
    <div
      className="flex flex-col h-screen relative"
      style={{
        background: theme.colors.background,
        color: theme.colors.text,
      }}
    >
      {showFeedbackScreen && (
        <div
          className={`absolute inset-0 z-50 transition-opacity duration-500 ${
            showFeedbackScreen === "correct"
              ? "bg-green-500 opacity-50"
              : "bg-red-500 opacity-50"
          }`}
        ></div>
      )}
      <Navbar />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick={false}
        closeButton={true}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={theme.name}
        limit={3}
      />
      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        style={{
          content: {
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            marginRight: "-50%",
            transform: "translate(-50%, -50%)",
            background: modalContent.isCorrect ? "#22c55e" : "#ef4444",
            color: theme.colors.buttonText,
            borderRadius: "8px",
            padding: "20px",
            border: `2px solid ${theme.colors.border}`,
            width: "400px",
            textAlign: "center",
            zIndex: 1000,
          },
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1000,
          },
        }}
      >
        <h2 className="text-xl font-bold mb-4">
          {modalContent.isCorrect ? "¡Correcto!" : "Error"}
        </h2>
        <p className="mb-4">{modalContent.message}</p>
        <button
          onClick={() => {
            setIsModalOpen(false);
            if (modalContent.isCorrect) {
              handleNavigate("next");
            }
          }}
          style={{
            background: theme.colors.accent,
            color: theme.colors.buttonText,
            padding: "8px 16px",
            borderRadius: "4px",
          }}
        >
          {modalContent.isCorrect ? "Continuar" : "Cerrar"}
        </button>
      </Modal>
      {renderContent()}
    </div>
  );
}
