import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { Lesson, Progress } from "@/types/course";
import { checkExerciseAccessApi } from "../services/courseService";
import { sortLessons, isLessonCompleted } from "../utils/courseUtils";

export const useExerciseAccess = (lessons: Lesson[], progress: Progress[]) => {
  const { fetchWithAuth } = useAuth();

  const checkExerciseAccess = async (
    lessonId: string,
    exerciseOrder: number,
    lessonIndex: number
  ): Promise<boolean> => {
    const lessonProgress = progress.filter((p) => p.lessonId === lessonId);
    const isExerciseCompleted = lessonProgress.some(
      (p) => p.exerciseOrder === exerciseOrder && p.completed
    );
    if (isExerciseCompleted) return true;

    const isExerciseAccessible =
      exerciseOrder === 1 ||
      lessonProgress.some(
        (p) => p.exerciseOrder === exerciseOrder - 1 && p.completed
      );
    if (isExerciseAccessible) return true;

    if (exerciseOrder === 1 && lessonIndex > 0) {
      const sortedLessons = sortLessons(lessons);
      const prevLesson = sortedLessons[lessonIndex - 1];
      const prevLessonProgress = progress.filter(
        (p) => p.lessonId === prevLesson._id
      );
      const isPrevLessonCompleted = isLessonCompleted(
        prevLesson,
        prevLessonProgress
      );
      if (isPrevLessonCompleted) {
        toast.info("Acceso permitido: la lección anterior está completada.", {
          toastId: `access-granted-${lessonId}-${exerciseOrder}`,
        });
        return true;
      }
    }

    try {
      const canAccess = await checkExerciseAccessApi(
        lessons[lessonIndex].courseId,
        lessonId,
        exerciseOrder,
        fetchWithAuth
      );
      if (!canAccess) {
        toast.warn(
          "Debes completar todos los ejercicios de la lección anterior primero.",
          { toastId: `access-error-${lessonId}-${exerciseOrder}` }
        );
      }
      return canAccess;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error al verificar el acceso al ejercicio.";
      toast.error(errorMessage, {
        toastId: `access-error-${lessonId}-${exerciseOrder}`,
      });
      return false;
    }
  };

  return { checkExerciseAccess };
};
