export function exercisePath(
  id: string,
  type: "QUIZ" | "CODE" | "LIVE" | string,
): string {
  return `/learn/exercise/${type.toLowerCase()}/${id}`;
}

export function lessonPath(courseId: string, lessonId: string): string {
  return `/courses/${courseId}/lessons/${lessonId}`;
}

// A dónde mandar al alumno al terminar un ejercicio: el siguiente de la
// lección, o la teoría de la lección siguiente (nunca se salta la lectura),
// o el curso si ya no queda nada.
export function nextStepPath(exercise: {
  courseId?: string | null;
  nextExerciseId?: string | null;
  nextExerciseType?: string | null;
  nextLessonId?: string | null;
}): string | null {
  if (exercise.nextExerciseId && exercise.nextExerciseType) {
    return exercisePath(exercise.nextExerciseId, exercise.nextExerciseType);
  }
  if (exercise.courseId && exercise.nextLessonId) {
    return lessonPath(exercise.courseId, exercise.nextLessonId);
  }
  return null;
}
