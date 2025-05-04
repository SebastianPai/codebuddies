import { useMemo } from "react";
import { Lesson, Progress } from "@/types/course";
import { sortLessons, isLessonCompleted } from "../utils/courseUtils";

export const useCurrentExercise = (lessons: Lesson[], progress: Progress[]) => {
  const sortedLessons = useMemo(() => sortLessons(lessons), [lessons]);

  const currentLessonIndex = useMemo(() => {
    for (let i = 0; i < sortedLessons.length; i++) {
      const lesson = sortedLessons[i];
      const lessonProgress = progress.filter((p) => p.lessonId === lesson._id);
      const exercises = lesson.exercises.sort((a, b) => a.order - b.order);
      const allCompleted = exercises.every((exercise) =>
        lessonProgress.some(
          (p) => p.exerciseOrder === exercise.order && p.completed
        )
      );
      if (!allCompleted) return i;
      if (i === 0 && !lessonProgress.length && exercises.length) return 0;
    }
    return sortedLessons.length - 1;
  }, [sortedLessons, progress]);

  const currentExercise = useMemo(() => {
    if (!lessons.length) return null;
    for (let i = 0; i < sortedLessons.length; i++) {
      const lesson = sortedLessons[i];
      const lessonProgress = progress.filter((p) => p.lessonId === lesson._id);
      const exercises = lesson.exercises.sort((a, b) => a.order - b.order);
      if (!lessonProgress.length && exercises.length)
        return { lessonId: lesson._id, exercise: exercises[0] };
      for (const exercise of exercises) {
        const isCompleted = lessonProgress.some(
          (p) => p.exerciseOrder === exercise.order && p.completed
        );
        if (!isCompleted) return { lessonId: lesson._id, exercise };
      }
      if (isLessonCompleted(lesson, progress) && i < sortedLessons.length - 1) {
        const nextLesson = sortedLessons[i + 1];
        const nextExercises = nextLesson.exercises.sort(
          (a, b) => a.order - b.order
        );
        if (nextExercises.length)
          return { lessonId: nextLesson._id, exercise: nextExercises[0] };
      }
    }
    return null;
  }, [sortedLessons, progress]);

  return { currentExercise, currentLessonIndex };
};
