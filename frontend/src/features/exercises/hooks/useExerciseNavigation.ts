import { useNavigate, useParams } from "react-router-dom";
import { Exercise, Lesson } from "@/types/exercise";

export const useExerciseNavigation = (
  exercise: Exercise | null,
  lesson: Lesson | null
) => {
  const navigate = useNavigate();
  const { courseId, lessonId } = useParams<{
    courseId: string;
    lessonId: string;
  }>();

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

  return { handleNavigate };
};
