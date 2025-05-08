"use client";

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { Exercise, Lesson } from "@/types/exercise";

interface ValidationResult {
  isCorrect: boolean;
  message: string;
}

interface UseExerciseValidationReturn {
  modalContent: {
    isCorrect: boolean;
    results: { [language: string]: ValidationResult };
    message: string;
  };
  showFeedbackScreen: "correct" | "incorrect" | null;
  isModalOpen: boolean;
  handleCheckAnswer: () => Promise<void>;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  userProgress: {
    xp: number;
    maxXp: number;
    level: number;
    gainedXp?: number;
    isAlreadyCompleted?: boolean;
  } | null;
}

export const useExerciseValidation = (
  exercise: Exercise | null,
  lesson: Lesson | null,
  codes: { [language: string]: string },
  setIsExerciseCompleted: React.Dispatch<React.SetStateAction<boolean>>
): UseExerciseValidationReturn => {
  const { fetchWithAuth, updateUser } = useAuth();
  const { courseId, lessonId, exerciseOrder } = useParams<{
    courseId?: string;
    lessonId?: string;
    exerciseOrder?: string;
  }>();
  const navigate = useNavigate();
  const [modalContent, setModalContent] = useState<{
    isCorrect: boolean;
    results: { [language: string]: ValidationResult };
    message: string;
  }>({ isCorrect: false, results: {}, message: "" });
  const [showFeedbackScreen, setShowFeedbackScreen] = useState<
    "correct" | "incorrect" | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userProgress, setUserProgress] = useState<{
    xp: number;
    maxXp: number;
    level: number;
    gainedXp?: number;
    isAlreadyCompleted?: boolean;
  } | null>(null);

  const handleCheckAnswer = async () => {
    if (!exercise || !lesson || !courseId || !lessonId || !exerciseOrder) {
      setModalContent({
        isCorrect: false,
        results: {},
        message: "⚠️ Datos del ejercicio o parámetros de URL no válidos.",
      });
      setIsModalOpen(true);
      setShowFeedbackScreen("incorrect");
      setTimeout(() => setShowFeedbackScreen(null), 2000);
      return;
    }

    try {
      // Preparar códigos esperados
      const expectedCodes: { [language: string]: string } = {};
      exercise.codes.forEach((code) => {
        if (code.expectedCode) {
          expectedCodes[code.language] = code.expectedCode;
        }
      });

      if (Object.keys(expectedCodes).length === 0) {
        setModalContent({
          isCorrect: false,
          results: {},
          message: "⚠️ No hay salidas esperadas definidas.",
        });
        setIsModalOpen(true);
        setShowFeedbackScreen("incorrect");
        setTimeout(() => setShowFeedbackScreen(null), 2000);
        return;
      }

      const response = await fetchWithAuth(`/api/lessons/validate-code`, {
        method: "POST",
        body: JSON.stringify({
          codes,
          expectedCodes,
          language: exercise.language,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al validar los códigos");
      }

      const responseData: {
        isCorrect: boolean;
        results: { [language: string]: ValidationResult };
        message: string;
      } = await response.json();

      setModalContent(responseData);
      setShowFeedbackScreen(responseData.isCorrect ? "correct" : "incorrect");
      setTimeout(() => setShowFeedbackScreen(null), 2000);

      if (responseData.isCorrect) {
        setIsExerciseCompleted(true);
        await completeExercise();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "❌ Error al validar los códigos. Intenta de nuevo.";
      setModalContent({
        isCorrect: false,
        results: {},
        message: errorMessage,
      });
      setShowFeedbackScreen("incorrect");
      setTimeout(() => setShowFeedbackScreen(null), 2000);
    }

    setIsModalOpen(true);
  };

  const completeExercise = async () => {
    try {
      if (!courseId || !lessonId || !exerciseOrder) {
        throw new Error("Parámetros de URL no válidos");
      }

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No se encontró el token de autenticación");
      }

      const userDataResponse = await fetchWithAuth("/api/users/me");
      if (!userDataResponse.ok) {
        throw new Error("Error al obtener datos del usuario");
      }
      const userData = await userDataResponse.json();
      const previousLevel = userData.user.level;
      const currentXp = userData.user.xp || 0;
      const currentMaxXp = userData.user.maxXp || 100;
      const currentLevel = userData.user.level || 1;

      const progressResponse = await fetchWithAuth(
        `/api/progress/courses/${courseId}/lessons/${lessonId}/exercises/${exerciseOrder}/complete`,
        { method: "POST" }
      );
      if (!progressResponse.ok) {
        const errorData = await progressResponse.json();
        throw new Error(errorData.message || "Error al guardar el progreso");
      }
      const progressData = await progressResponse.json();

      let gainedXp = 0;
      let isAlreadyCompleted = false;

      const messageLower = (progressData.message || "").toLowerCase();
      if (messageLower.includes("ejercicio ya completado")) {
        isAlreadyCompleted = true;
      } else if (messageLower.includes("marcado como completado")) {
        gainedXp += 10;
      }

      let courseProgress: {
        completedExercises: string[];
        totalExercises: number;
      } = { completedExercises: [], totalExercises: 0 };
      try {
        const courseProgressResponse = await fetchWithAuth(
          `/api/progress/courses/${courseId}/progress/all`
        );
        if (!courseProgressResponse.ok) {
          const errorData = await courseProgressResponse.json();
          throw new Error(
            errorData.message || "Error al obtener el progreso del curso"
          );
        }
        courseProgress = await courseProgressResponse.json();
      } catch (error) {
        // Continuar sin progreso del curso si falla
      }

      if (
        !isAlreadyCompleted &&
        courseProgress.completedExercises.length ===
          courseProgress.totalExercises &&
        courseProgress.totalExercises > 0
      ) {
        gainedXp += 100;
      }

      const newProgress = {
        xp: progressData.user?.xp ?? currentXp,
        maxXp: progressData.user?.maxXp ?? currentMaxXp,
        level: progressData.user?.level ?? currentLevel,
        gainedXp: gainedXp > 0 ? gainedXp : undefined,
        isAlreadyCompleted,
      };

      setUserProgress(newProgress);

      updateUser({
        xp: progressData.user?.xp ?? currentXp,
        level: progressData.user?.level ?? currentLevel,
        maxXp: progressData.user?.maxXp ?? currentMaxXp,
        achievements: progressData.user?.achievements ?? [],
      });

      if (gainedXp > 0) {
        toast.success(`🎉 +${gainedXp} XP por completar el ejercicio!`, {
          toastId: `xp-exercise-${exerciseOrder}`,
          autoClose: 3000,
        });
      } else if (isAlreadyCompleted) {
        toast.info(
          "ℹ️ Misión ya completada. ¡Solo se otorgan 10 XP la primera vez!",
          {
            toastId: `xp-exercise-repeat-${exerciseOrder}`,
            autoClose: 3000,
          }
        );
      }

      if (
        !isAlreadyCompleted &&
        courseProgress.completedExercises.length ===
          courseProgress.totalExercises &&
        courseProgress.totalExercises > 0
      ) {
        toast.success(`🏆 +100 XP por completar el curso!`, {
          toastId: `xp-course-${courseId}`,
          autoClose: 3000,
        });
      }

      if ((progressData.user?.level ?? currentLevel) > previousLevel) {
        toast.success(
          `🎉 ¡Subiste al nivel ${progressData.user?.level ?? currentLevel}!`,
          {
            toastId: `level-up-${progressData.user?.level ?? currentLevel}`,
            autoClose: 3000,
          }
        );
      }

      if (
        progressData.user?.achievements &&
        progressData.user.achievements.length > 0
      ) {
        const newAchievements = progressData.user.achievements.slice(-1);
        newAchievements.forEach((achievement: { name: string }) => {
          toast.success(`🏅 Logro desbloqueado: ${achievement.name}`, {
            toastId: `achievement-${achievement.name}`,
            autoClose: 3000,
          });
        });
      }

      toast.success(`🎉 Ejercicio número ${exercise?.order} superado.`, {
        toastId: `progress-success-${exerciseOrder}`,
        autoClose: 3000,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al guardar el progreso.";
      toast.error(errorMessage, {
        toastId: `progress-error-${exerciseOrder}`,
        autoClose: 3000,
      });
      if (errorMessage.includes("No se encontró el token de autenticación")) {
        navigate("/login", { replace: true });
      }
      setUserProgress({
        xp: userProgress?.xp ?? 0,
        maxXp: userProgress?.maxXp ?? 100,
        level: userProgress?.level ?? 1,
        gainedXp: undefined,
        isAlreadyCompleted: false,
      });
    }
  };

  return {
    modalContent,
    showFeedbackScreen,
    isModalOpen,
    handleCheckAnswer,
    setIsModalOpen,
    userProgress,
  };
};
