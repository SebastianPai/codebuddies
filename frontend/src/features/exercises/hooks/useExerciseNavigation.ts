import { useNavigate, useParams } from "react-router-dom";
import { Exercise, Lesson } from "@/types/exercise";

export const useExerciseNavigation = (
  exercise: Exercise | null,
  lesson: Lesson | null,
  courseLessons: Lesson[]
) => {
  const navigate = useNavigate();
  const { courseId, lessonId } = useParams<{
    courseId: string;
    lessonId: string;
  }>();

  const handleNavigate = (direction: "prev" | "next") => {
    if (!lesson || !exercise || !courseId || !lessonId) return;

    const currentOrder = exercise.order;
    const sortedExercises = lesson.exercises.sort((a, b) => a.order - b.order);
    const currentIndex = sortedExercises.findIndex(
      (ex) => ex.order === currentOrder
    );
    const lessonIndex = courseLessons.findIndex((l) => l._id === lessonId);

    if (direction === "prev") {
      if (currentIndex > 0) {
        // Navegar al ejercicio anterior
        const prevExercise = sortedExercises[currentIndex - 1];
        navigate(
          `/courses/${courseId}/lessons/${lessonId}/exercises/${prevExercise.order}`
        );
      } else if (lessonIndex > 0) {
        // Navegar a la última lección anterior
        const prevLesson = courseLessons[lessonIndex - 1];
        const sortedPrevExercises = prevLesson.exercises.sort(
          (a, b) => a.order - b.order
        );
        const lastExercise =
          sortedPrevExercises[sortedPrevExercises.length - 1];
        navigate(
          `/courses/${courseId}/lessons/${prevLesson._id}/exercises/${lastExercise.order}`
        );
      }
    } else if (direction === "next") {
      if (currentIndex < sortedExercises.length - 1) {
        // Navegar al siguiente ejercicio
        const nextExercise = sortedExercises[currentIndex + 1];
        navigate(
          `/courses/${courseId}/lessons/${lessonId}/exercises/${nextExercise.order}`
        );
      } else if (lessonIndex < courseLessons.length - 1) {
        // Navegar a la primera lección siguiente
        const nextLesson = courseLessons[lessonIndex + 1];
        const sortedNextExercises = nextLesson.exercises.sort(
          (a, b) => a.order - b.order
        );
        const firstExercise = sortedNextExercises[0];
        navigate(
          `/courses/${courseId}/lessons/${nextLesson._id}/exercises/${firstExercise.order}`
        );
      }
    }
  };

  const hasNextLesson =
    courseLessons.length > 0 &&
    courseLessons.findIndex((l) => l._id === lessonId) <
      courseLessons.length - 1;

  return { handleNavigate, hasNextLesson };
};
