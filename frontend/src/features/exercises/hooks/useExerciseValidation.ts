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
  const { fetchWithAuth, updateUser } = useAuth();
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
            await completeExercise();
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
        await completeExercise();
      }
    }

    setIsModalOpen(true);
  };

  const completeExercise = async () => {
    try {
      const previousLevel = (
        await fetchWithAuth("/api/users/me").then((res) => res.json())
      ).user.level;
      const progressResponse = await fetchWithAuth(
        `/api/progress/courses/${courseId}/lessons/${lessonId}/exercises/${exerciseOrder}/complete`,
        { method: "POST" }
      );
      const progressData = await progressResponse.json();

      if (!progressResponse.ok) {
        throw new Error(progressData.message || "Error al guardar el progreso");
      }

      // Actualizar estado global del usuario
      if (progressData.user) {
        updateUser({
          xp: progressData.user.xp,
          level: progressData.user.level,
          maxXp: progressData.user.maxXp,
          achievements: progressData.user.achievements,
        });

        // Notificar XP ganado
        if (
          progressData.message.includes("Ejercicio marcado como completado")
        ) {
          toast.success(`🎉 +10 XP por completar el ejercicio!`, {
            toastId: `xp-exercise-${exerciseOrder}`,
            autoClose: 3000,
          });
        } else if (
          progressData.message.includes("Ejercicio ya estaba completado")
        ) {
          toast.info("ℹ️ Este ejercicio ya estaba completado.", {
            toastId: `xp-exercise-repeat-${exerciseOrder}`,
            autoClose: 3000,
          });
        }

        // Verificar si completó un curso
        const courseProgress = await fetchWithAuth(
          `/api/progress/courses/${courseId}/progress/all`
        ).then((res) => res.json());
        const { completedExercises, totalExercises } = courseProgress;
        if (completedExercises.length === totalExercises) {
          toast.success(`🏆 +100 XP por completar el curso!`, {
            toastId: `xp-course-${courseId}`,
            autoClose: 3000,
          });
        }

        // Notificar si subió de nivel
        if (progressData.user.level > previousLevel) {
          toast.success(`🎉 ¡Subiste al nivel ${progressData.user.level}!`, {
            toastId: `level-up-${progressData.user.level}`,
            autoClose: 3000,
          });
        }

        // Notificar nuevos logros
        if (
          progressData.user.achievements &&
          progressData.user.achievements.length > 0
        ) {
          const newAchievements = progressData.user.achievements.slice(-1); // Últimos logros
          newAchievements.forEach((achievement: { name: string }) => {
            toast.success(`🏅 Logro desbloqueado: ${achievement.name}`, {
              toastId: `achievement-${achievement.name}`,
              autoClose: 3000,
            });
          });
        }

        toast.success(`🎉 Ejercicio número ${exercise?.order} superado.`, {
          toastId: "progress-success",
          autoClose: 3000,
        });
      }
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
  };

  return {
    modalContent,
    showFeedbackScreen,
    isModalOpen,
    handleCheckAnswer,
    setIsModalOpen,
  };
};
