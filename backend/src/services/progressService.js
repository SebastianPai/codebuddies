import Lesson from "../models/LessonModel.js";
import Progress from "../models/ProgressModel.js";

export const canAccessExercise = async (
  userId,
  courseId,
  lessonId,
  exerciseOrder
) => {
  try {
    // Si es el primer ejercicio de la primera lección, siempre es accesible
    if (exerciseOrder === 1) {
      const firstLesson = await Lesson.findOne({ course: courseId }).sort({
        createdAt: 1,
      }); // O usa order si tienes un campo específico
      if (firstLesson && firstLesson._id.toString() === lessonId) {
        return true;
      }
    }

    // Buscar el progreso del usuario en el curso
    const progress = await Progress.findOne({
      user: userId,
      course: courseId,
    }).lean();

    // Si no hay progreso, el ejercicio no es accesible
    if (!progress) {
      return false;
    }

    // Verificar si el ejercicio anterior está completado
    const previousExerciseCompleted = progress.completedExercises.some(
      (ex) =>
        ex.lesson.toString() === lessonId &&
        ex.exerciseOrder === exerciseOrder - 1
    );

    return previousExerciseCompleted;
  } catch (error) {
    console.error("❌ Error en canAccessExercise:", {
      message: error.message,
      stack: error.stack,
      userId,
      courseId,
      lessonId,
      exerciseOrder,
    });
    throw error;
  }
};

export const canAccessLesson = async (userId, courseId, lessonId) => {
  try {
    // Obtener todas las lecciones del curso
    const lessons = await Lesson.find({ course: courseId })
      .sort({ createdAt: 1 })
      .lean(); // O usa order si tienes un campo específico

    const currentLessonIndex = lessons.findIndex(
      (l) => l._id.toString() === lessonId
    );

    // Si es la primera lección, siempre es accesible
    if (currentLessonIndex === 0) {
      return true;
    }

    // Obtener la lección anterior
    const previousLesson = lessons[currentLessonIndex - 1];

    // Buscar el progreso del usuario en el curso
    const progress = await Progress.findOne({
      user: userId,
      course: courseId,
    }).lean();

    // Si no hay progreso, la lección no es accesible
    if (!progress) {
      return false;
    }

    // Verificar si todos los ejercicios de la lección anterior están completados
    const previousLessonExercises = previousLesson.exercises.map(
      (ex) => ex.order
    );
    const completedExercises = progress.completedExercises
      .filter((ex) => ex.lesson.toString() === previousLesson._id.toString())
      .map((ex) => ex.exerciseOrder);

    return previousLessonExercises.every((order) =>
      completedExercises.includes(order)
    );
  } catch (error) {
    console.error("❌ Error en canAccessLesson:", {
      message: error.message,
      stack: error.stack,
      userId,
      courseId,
      lessonId,
    });
    throw error;
  }
};

export const markExerciseCompleted = async (
  userId,
  courseId,
  lessonId,
  exerciseOrder
) => {
  try {
    // Validar parámetros
    if (!userId || !courseId || !lessonId || !exerciseOrder) {
      throw new Error("Faltan parámetros requeridos.");
    }

    // Validar formato de exerciseOrder
    const order = parseInt(exerciseOrder);
    if (isNaN(order)) {
      throw new Error("El orden del ejercicio debe ser un número válido.");
    }

    // Verificar que la lección existe
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      throw new Error("Lección no encontrada.");
    }

    // Verificar que el ejercicio existe
    const exercise = lesson.exercises.find((ex) => ex.order === order);
    if (!exercise) {
      throw new Error("Ejercicio no encontrado.");
    }

    // Buscar o crear el progreso del usuario
    let progress = await Progress.findOne({ user: userId, course: courseId });
    if (!progress) {
      progress = new Progress({
        user: userId,
        course: courseId,
        completedExercises: [],
      });
    }

    // Evitar duplicados
    if (
      !progress.completedExercises.some(
        (ex) => ex.lesson.toString() === lessonId && ex.exerciseOrder === order
      )
    ) {
      progress.completedExercises.push({
        lesson: lessonId,
        exerciseOrder: order,
        completedAt: new Date(),
      });
    }

    await progress.save();
  } catch (error) {
    console.error("❌ Error en markExerciseCompleted:", {
      message: error.message,
      stack: error.stack,
      userId,
      courseId,
      lessonId,
      exerciseOrder,
    });
    throw error;
  }
};
