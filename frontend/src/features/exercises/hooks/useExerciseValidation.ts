import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { Exercise, Lesson } from "@/types/exercise";
import { normalizeCSS, normalizeCode } from "../services/validationService";

interface UseExerciseValidationReturn {
  modalContent: { isCorrect: boolean; message: string };
  showFeedbackScreen: "correct" | "incorrect" | null;
  isModalOpen: boolean;
  handleCheckAnswer: () => Promise<void>;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useExerciseValidation = (
  exercise: Exercise | null,
  lesson: Lesson | null,
  htmlCode: string,
  cssCode: string,
  jsCode: string,
  setIsExerciseCompleted: React.Dispatch<React.SetStateAction<boolean>>
): UseExerciseValidationReturn => {
  const { fetchWithAuth } = useAuth();
  const { courseId, lessonId, exerciseOrder } = useParams<{
    courseId: string;
    lessonId: string;
    exerciseOrder: string;
  }>();
  const navigate = useNavigate();
  const [modalContent, setModalContent] = useState<{
    isCorrect: boolean;
    message: string;
  }>({ isCorrect: false, message: "" });
  const [showFeedbackScreen, setShowFeedbackScreen] = useState<
    "correct" | "incorrect" | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
              { method: "POST" }
            );
            if (!progressResponse.ok) {
              const errorData = await progressResponse.json();
              throw new Error(
                errorData.message || "Error al guardar el progreso"
              );
            }
            toast.success(`🎉 Ejercicio número ${exercise.order} superado.`, {
              toastId: "progress-success",
              autoClose: 3000,
            });
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "❌ Error al validar el código. Intenta de nuevo.";
          setModalContent({ isCorrect: false, message: errorMessage });
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
            { method: "POST" }
          );
          if (!progressResponse.ok) {
            const errorData = await progressResponse.json();
            throw new Error(
              errorData.message || "Error al guardar el progreso"
            );
          }
          toast.success(`🎉 Ejercicio número ${exercise.order} superado.`, {
            toastId: "progress-success",
            autoClose: 3000,
          });
        } catch (progressError: unknown) {
          const errorMessage =
            progressError instanceof Error
              ? progressError.message
              : "Error al guardar el progreso.";
          toast.error(errorMessage, {
            toastId: "progress-error",
            autoClose: 3000,
          });
        }
      }
    }

    setIsModalOpen(true);
  };

  return {
    modalContent,
    showFeedbackScreen,
    isModalOpen,
    handleCheckAnswer,
    setIsModalOpen,
  };
};
