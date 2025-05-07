"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import Navbar from "@/components/common/Navbar";
import { InstructionsPanel } from "../components/InstructionsPanel";
import { ExerciseHeader } from "../components/ExerciseHeader";
import { CodeEditorWrapper } from "../components/CodeEditorWrapper";
import { PreviewPanel } from "../components/PreviewPanel";
import { toast } from "react-toastify";
import { TerminalPanel } from "../components/TerminalPanel";
import { NavigationControls } from "../components/NavigationControls";
import { useExerciseData } from "../hooks/useExerciseData";
import { useIframePreview } from "../hooks/useIframePreview";
import { useExerciseValidation } from "../hooks/useExerciseValidation";
import { useExerciseNavigation } from "../hooks/useExerciseNavigation";
import { convertImageToBase64 } from "../services/imageService";
import { InstructionElement, Exercise, Lesson } from "@/types/exercise";
import {
  ChevronLeft,
  ChevronRight,
  Code,
  Info,
  Play,
  Copy,
} from "lucide-react";

const SolveExercise: React.FC = () => {
  const { theme } = useTheme();
  const {
    exercise,
    lesson,
    loading,
    isExerciseCompleted,
    instructionElements,
    htmlCode,
    cssCode,
    jsCode,
    setIsExerciseCompleted,
    setHtmlCode,
    setCssCode,
    setJsCode,
  } = useExerciseData();
  const { iframeContent, isIframeLoading } = useIframePreview(
    htmlCode,
    cssCode,
    exercise
  );
  const {
    modalContent,
    showFeedbackScreen,
    isModalOpen,
    handleCheckAnswer,
    setIsModalOpen,
    userProgress,
  } = useExerciseValidation(
    exercise,
    lesson,
    htmlCode,
    cssCode,
    jsCode,
    setIsExerciseCompleted
  );
  const { handleNavigate } = useExerciseNavigation(exercise, lesson);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [instructionImages, setInstructionImages] = useState<{
    [key: string]: string;
  }>({});
  const [activeSection, setActiveSection] = useState<
    "code" | "preview" | "instructions"
  >("code");

  useEffect(() => {
    const loadInstructionImages = async () => {
      const imageElements = instructionElements.filter(
        (el): el is { type: "image"; value: string } =>
          el.type === "image" && !!el.value
      );
      const imagePromises = imageElements.map(async (el) => ({
        url: el.value,
        base64: await convertImageToBase64(el.value),
      }));
      const resolvedImages = await Promise.all(imagePromises);
      const imagesMap = resolvedImages.reduce(
        (acc, { url, base64 }) => ({
          ...acc,
          [url]: base64 || "",
        }),
        {}
      );
      setInstructionImages(imagesMap);
    };

    if (instructionElements.length > 0) {
      loadInstructionImages();
    }
  }, [instructionElements]);

  const handleRunCode = () => {
    if (
      exercise?.language === "javascript" ||
      exercise?.language === "python"
    ) {
      setTerminalOutput(">> Simulando ejecución del código...");
    }
  };

  const renderContent = (): React.ReactNode => {
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
          <ExerciseHeader exercise={exercise} />
          <div
            className="md:hidden flex justify-around p-4 border-b"
            style={{ borderColor: theme.colors.border }}
          >
            <button
              className={`px-4 py-2 rounded-md font-bold transition-colors ${
                activeSection === "instructions" ? "border-b-4" : ""
              }`}
              style={{
                background:
                  activeSection === "instructions"
                    ? theme.colors.accent
                    : theme.colors.card,
                color:
                  activeSection === "instructions"
                    ? theme.colors.buttonText
                    : theme.colors.text,
                borderColor: theme.colors.border,
              }}
              onClick={() => setActiveSection("instructions")}
            >
              Instrucciones
            </button>
            <button
              className={`px-4 py-2 rounded-md font-bold transition-colors ${
                activeSection === "code" ? "border-b-4" : ""
              }`}
              style={{
                background:
                  activeSection === "code"
                    ? theme.colors.accent
                    : theme.colors.card,
                color:
                  activeSection === "code"
                    ? theme.colors.buttonText
                    : theme.colors.text,
                borderColor: theme.colors.border,
              }}
              onClick={() => setActiveSection("code")}
            >
              Código
            </button>
            <button
              className={`px-4 py-2 rounded-md font-bold transition-colors ${
                activeSection === "preview" ? "border-b-4" : ""
              }`}
              style={{
                background:
                  activeSection === "preview"
                    ? theme.colors.accent
                    : theme.colors.card,
                color:
                  activeSection === "preview"
                    ? theme.colors.buttonText
                    : theme.colors.text,
                borderColor: theme.colors.border,
              }}
              onClick={() => setActiveSection("preview")}
            >
              Vista Previa
            </button>
          </div>
          <div className="flex flex-1 overflow-hidden flex-col md:flex-row h-full">
            <div
              className={`w-full p-6 overflow-y-auto border-r min-w-0 ${
                activeSection === "instructions"
                  ? "block h-full"
                  : "hidden md:block md:w-1/3"
              }`}
              style={{
                background: theme.colors.card,
                borderColor: theme.colors.border,
              }}
            >
              <div className="space-y-6 max-w-full h-full">
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
                <InstructionsPanel
                  instructionElements={instructionElements}
                  instructionImages={instructionImages}
                />
              </div>
            </div>
            <div
              className={`w-full min-w-0 flex-1 ${
                activeSection === "code"
                  ? "block h-full"
                  : "hidden md:block md:w-1/3"
              }`}
              style={{ flex: "1 1 0", height: "100%" }}
            >
              <div
                className="flex-1 overflow-hidden p-4"
                style={{ height: "100%" }}
              >
                <CodeEditorWrapper
                  value={exercise.language === "html" ? htmlCode : cssCode}
                  onValueChange={
                    exercise.language === "html" ? setHtmlCode : setCssCode
                  }
                  highlightLanguage={exercise.language}
                  padding={16}
                  className="font-mono text-sm rounded-lg h-full outline-none"
                  style={{
                    background: theme.colors.card,
                    color: theme.colors.text,
                    border: `1px solid ${theme.colors.border}`,
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                    height: "100%",
                  }}
                />
              </div>
            </div>
            <div
              className={`w-full flex flex-col min-w-0 flex-1 ${
                activeSection === "preview"
                  ? "block h-full"
                  : "hidden md:block md:w-1/3"
              }`}
              style={{ flex: "1 1 0" }}
            >
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
              <PreviewPanel
                iframeContent={iframeContent}
                isIframeLoading={isIframeLoading}
              />
            </div>
          </div>
          <NavigationControls
            exercise={exercise}
            lesson={lesson}
            isExerciseCompleted={isExerciseCompleted}
            htmlCode={htmlCode}
            cssCode={cssCode}
            jsCode={jsCode}
            onNavigate={handleNavigate}
            onCheckAnswer={handleCheckAnswer}
          />
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
        <div
          className="md:hidden flex justify-around p-4 border-b"
          style={{ borderColor: theme.colors.border }}
        >
          <button
            className={`px-4 py-2 rounded-md font-bold transition-colors ${
              activeSection === "instructions" ? "border-b-4" : ""
            }`}
            style={{
              background:
                activeSection === "instructions"
                  ? theme.colors.accent
                  : theme.colors.card,
              color:
                activeSection === "instructions"
                  ? theme.colors.buttonText
                  : theme.colors.text,
              borderColor: theme.colors.border,
            }}
            onClick={() => setActiveSection("instructions")}
          >
            Instrucciones
          </button>
          <button
            className={`px-4 py-2 rounded-md font-bold transition-colors ${
              activeSection === "code" ? "border-b-4" : ""
            }`}
            style={{
              background:
                activeSection === "code"
                  ? theme.colors.accent
                  : theme.colors.card,
              color:
                activeSection === "code"
                  ? theme.colors.buttonText
                  : theme.colors.text,
              borderColor: theme.colors.border,
            }}
            onClick={() => setActiveSection("code")}
          >
            Código
          </button>
        </div>
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          <div
            className={`w-full md:w-1/2 overflow-y-auto p-6 border-r min-w-0 ${
              activeSection === "instructions" ? "block" : "hidden md:block"
            }`}
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
              <InstructionsPanel
                instructionElements={instructionElements}
                instructionImages={instructionImages}
              />
            </div>
          </div>
          <div
            className={`w-full md:w-1/2 flex flex-col min-w-0 ${
              activeSection === "code" ? "block" : "hidden md:block"
            }`}
            style={{ height: "100%" }}
          >
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
              style={{ background: theme.colors.card, height: "100%" }}
            >
              <CodeEditorWrapper
                value={jsCode}
                onValueChange={setJsCode}
                highlightLanguage={
                  exercise.language === "javascript" ? "javascript" : "python"
                }
                padding={16}
                className="font-mono text-sm rounded-lg h-full outline-none"
                style={{
                  background: theme.colors.card,
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.border}`,
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                  height: "100%",
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
                      autoClose: 3000,
                    });
                  }}
                  className="p-2 rounded-md"
                  style={{ color: theme.colors.text }}
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>
            <TerminalPanel terminalOutput={terminalOutput} />
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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex justify-center items-center p-4">
          <div
            className="p-8 rounded-lg max-w-md w-full animate-pulse"
            style={{
              background: theme.colors.card,
              border: `4px solid ${
                modalContent.isCorrect
                  ? theme.colors.success
                  : theme.colors.error
              }`,
            }}
          >
            <div className="flex justify-center mb-4">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-full"
                style={{
                  background: modalContent.isCorrect
                    ? theme.colors.success
                    : theme.colors.error,
                }}
              >
                <span className="text-2xl">
                  {modalContent.isCorrect ? "🎉" : "💀"}
                </span>
              </div>
            </div>

            <h1
              className="text-3xl uppercase font-mono text-center font-bold tracking-widest mb-4"
              style={{
                color: modalContent.isCorrect
                  ? theme.colors.success
                  : theme.colors.error,
              }}
            >
              {modalContent.isCorrect ? "¡ÉXITO!" : "¡ERROR!"}
            </h1>

            <div
              className="p-4 rounded-md"
              style={{
                border: `2px solid ${
                  modalContent.isCorrect
                    ? theme.colors.success
                    : theme.colors.error
                }`,
                background: theme.colors.background,
              }}
            >
              <p
                className="text-center font-mono text-sm uppercase tracking-wide"
                style={{ color: theme.colors.highlightText }}
              >
                {modalContent.message}
              </p>

              <div className="flex justify-center mt-4">
                <div className="relative animate-bounce">
                  <img
                    src={
                      modalContent.isCorrect
                        ? "/images/feliz1.png"
                        : "/images/triste2.png"
                    }
                    alt={
                      modalContent.isCorrect
                        ? "Mascota feliz"
                        : "Mascota triste"
                    }
                    className={
                      modalContent.isCorrect
                        ? "mx-auto w-36 h-32 pixelated"
                        : "mx-auto w-32 h-32 pixelated"
                    }
                  />
                  <div className="absolute -top-2 -right-2 text-xl animate-bounce">
                    {modalContent.isCorrect ? "😊" : "😢"}
                  </div>
                </div>
              </div>

              <p
                className="text-center mt-4 font-mono text-xs"
                style={{ color: theme.colors.text }}
              >
                <span
                  style={{
                    color: modalContent.isCorrect
                      ? theme.colors.success
                      : theme.colors.error,
                  }}
                >
                  BITZI
                </span>{" "}
                ESTÁ {modalContent.isCorrect ? "FELIZ" : "TRISTE"}...
              </p>

              {modalContent.isCorrect && userProgress && (
                <div className="mt-4">
                  <p
                    className="text-center font-mono text-sm"
                    style={{ color: theme.colors.highlightText }}
                  >
                    {userProgress.isAlreadyCompleted
                      ? "ℹ️ Misión ya completada. ¡Solo se otorgan 10 XP la primera vez!"
                      : userProgress.gainedXp && userProgress.gainedXp > 0
                      ? `🎉 +${userProgress.gainedXp} XP GANADOS`
                      : "🎉 Ejercicio completado"}
                  </p>
                  <p
                    className="text-center font-mono text-xs mt-2"
                    style={{ color: theme.colors.text }}
                  >
                    TOTAL: {userProgress.xp}/{userProgress.maxXp} XP
                  </p>
                  <div className="mt-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ background: theme.colors.progressBackground }}
                    >
                      <div
                        className="h-2 rounded-full"
                        style={{
                          background: theme.colors.progressFill,
                          width: `${
                            (userProgress.xp / userProgress.maxXp) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              {!modalContent.isCorrect && userProgress && (
                <div className="mt-4">
                  <p
                    className="text-center font-mono text-sm"
                    style={{ color: theme.colors.highlightText }}
                  >
                    ❌ Intenta de nuevo para ganar XP
                  </p>
                  <p
                    className="text-center font-mono text-xs mt-2"
                    style={{ color: theme.colors.text }}
                  >
                    TOTAL: {userProgress.xp}/{userProgress.maxXp} XP
                  </p>
                  <div className="mt-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ background: theme.colors.progressBackground }}
                    >
                      <div
                        className="h-2 rounded-full"
                        style={{
                          background: theme.colors.progressFill,
                          width: `${
                            (userProgress.xp / userProgress.maxXp) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  if (modalContent.isCorrect) {
                    handleNavigate("next");
                  }
                }}
                className="border-2 hover:scale-105 transition duration-150 py-2 rounded-md font-bold uppercase tracking-widest px-4 flex items-center justify-center"
                style={{
                  background: modalContent.isCorrect
                    ? theme.colors.success
                    : theme.colors.error,
                  color: theme.colors.buttonText,
                  borderColor: theme.colors.border,
                }}
              >
                <span className="mr-2">
                  {modalContent.isCorrect ? "➡️" : "🔄"}
                </span>
                {modalContent.isCorrect ? "Continuar" : "Reintentar"}
              </button>

              <button
                onClick={() => setIsModalOpen(false)}
                className="border-2 hover:scale-105 transition duration-150 py-2 rounded-md font-bold uppercase tracking-widest px-4 flex items-center justify-center"
                style={{
                  background: theme.colors.secondaryButton,
                  color: theme.colors.buttonText,
                  borderColor: theme.colors.border,
                }}
              >
                <span className="mr-2">❌</span> Cerrar
              </button>
            </div>

            {userProgress && (
              <div
                className="mt-6 border-t-2 pt-4"
                style={{
                  borderColor: modalContent.isCorrect
                    ? theme.colors.success
                    : theme.colors.error,
                }}
              >
                <div className="flex justify-between">
                  <div
                    className="font-mono text-xs"
                    style={{ color: theme.colors.highlightText }}
                  >
                    NIVEL: {userProgress.level}
                  </div>
                  <div
                    className="font-mono text-xs"
                    style={{ color: theme.colors.highlightText }}
                  >
                    VIDAS: ❤️❤️❤️
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {renderContent()}
    </div>
  );
};

export default SolveExercise;
