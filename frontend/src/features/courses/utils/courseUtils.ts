import { Lesson, Progress } from "@/types/course";

export const isLessonCompleted = (
  lesson: Lesson,
  progress: Progress[]
): boolean => {
  const lessonProgress = progress.filter((p) => p.lessonId === lesson._id);
  return lesson.exercises.every((exercise) =>
    lessonProgress.some(
      (p) => p.exerciseOrder === exercise.order && p.completed
    )
  );
};

export const sortLessons = (lessons: Lesson[]): Lesson[] => {
  return [...lessons].sort((a, b) => a._id.localeCompare(b._id));
};

export const calculateProgress = (
  lessons: Lesson[],
  progress: Progress[]
): { total: number; completed: number; percentage: number } => {
  const total = lessons.reduce((acc, l) => acc + l.exercises.length, 0);
  const completed = progress.filter((p) => p.completed).length;
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  return { total, completed, percentage };
};
