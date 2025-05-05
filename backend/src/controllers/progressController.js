import * as progressService from "../services/progressService.js";
import Lesson from "../models/LessonModel.js";
import Course from "../models/CourseModel.js";
import Progress from "../models/ProgressModel.js";
import { addXP } from "../services/xpService.js";

const EXERCISE_XP = 10; // XP por ejercicio
const COURSE_COMPLETION_XP = 100; // XP por completar curso

// Verificar si un usuario puede acceder a un ejercicio
export const canAccessExercise = async (req, res) => {
  const { courseId, lessonId, exerciseOrder } = req.params;
  const userId = req.user.userId;
  try {
    const canAccess = await progressService.canAccessExercise(
      userId,
      courseId,
      lessonId,
      parseInt(exerciseOrder)
    );
    if (canAccess) {
      res.status(200).json({ canAccess: true });
    } else {
      res.status(403).json({
        canAccess: false,
        message: "Debes completar los ejercicios anteriores primero.",
      });
    }
  } catch (error) {
    console.error("❌ Error en canAccessExercise:", error);
    res.status(500).json({ message: "Error al verificar acceso" });
  }
};

// Verificar si un usuario puede acceder a una lección
export const canAccessLesson = async (req, res) => {
  const { courseId, lessonId } = req.params;
  const userId = req.user.userId;
  try {
    const canAccess = await progressService.canAccessLesson(
      userId,
      courseId,
      lessonId
    );
    if (canAccess) {
      res.status(200).json({ canAccess: true });
    } else {
      res.status(403).json({
        canAccess: false,
        message: "Debes completar todas las lecciones anteriores.",
      });
    }
  } catch (error) {
    console.error("❌ Error en canAccessLesson:", error);
    res.status(500).json({ message: "Error al verificar acceso a la lección" });
  }
};

// Obtener todo el progreso de un usuario en un curso
export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    // Validar courseId
    if (!courseId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "ID de curso inválido" });
    }

    // Buscar el progreso del usuario en el curso
    const progress = await Progress.findOne({ user: userId, course: courseId })
      .select("completedExercises")
      .lean();

    // Si no hay progreso, devolver un array vacío
    if (!progress) {
      return res.status(200).json([]);
    }

    // Transformar los datos para que coincidan con el formato esperado
    const progressData = progress.completedExercises.map((exercise) => ({
      lessonId: exercise.lesson.toString(),
      exerciseOrder: exercise.exerciseOrder,
      completed: true,
      completedAt: exercise.completedAt,
    }));

    res.status(200).json(progressData);
  } catch (error) {
    console.error("❌ Error en getCourseProgress:", {
      message: error.message,
      stack: error.stack,
      courseId: req.params.courseId,
      userId: req.user?.userId,
    });
    res.status(500).json({ message: "Error al obtener el progreso del curso" });
  }
};

// Obtener el progreso de un ejercicio
export const getExerciseProgress = async (req, res) => {
  try {
    const { courseId, lessonId, exerciseOrder } = req.params;
    const userId = req.user.userId; // Cambiado de req.user.id a req.user.userId

    // Validar parámetros
    if (!courseId || !lessonId || !exerciseOrder) {
      return res.status(400).json({ message: "Faltan parámetros requeridos." });
    }

    // Buscar el curso
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Curso no encontrado." });
    }

    // Buscar la lección
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lección no encontrada." });
    }

    // Verificar que el ejercicio existe
    const exercise = lesson.exercises.find(
      (ex) => ex.order === parseInt(exerciseOrder)
    );
    if (!exercise) {
      return res.status(404).json({ message: "Ejercicio no encontrado." });
    }

    // Buscar el progreso del usuario
    const progress = await Progress.findOne({ user: userId, course: courseId });
    if (!progress) {
      return res.json({ completed: false });
    }

    // Verificar si el ejercicio está completado
    const isCompleted = progress.completedExercises.some(
      (ex) =>
        ex.lesson.toString() === lessonId &&
        ex.exerciseOrder === parseInt(exerciseOrder)
    );

    res.json({ completed: isCompleted });
  } catch (error) {
    console.error("Error al obtener progreso:", error);
    res.status(500).json({ message: "Error del servidor." });
  }
};

// Completar un ejercicio
export const completeExercise = async (req, res) => {
  try {
    const { courseId, lessonId, exerciseOrder } = req.params;
    const userId = req.user.userId;

    // Validar parámetros
    if (!courseId || !lessonId || !exerciseOrder) {
      return res.status(400).json({ message: "Faltan parámetros requeridos." });
    }

    // Validar formato de exerciseOrder
    const order = parseInt(exerciseOrder);
    if (isNaN(order)) {
      return res
        .status(400)
        .json({ message: "El orden del ejercicio debe ser un número válido." });
    }

    // Verificar que el curso existe
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Curso no encontrado." });
    }

    // Verificar que la lección existe
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lección no encontrada." });
    }

    // Verificar que el ejercicio existe
    const exercise = lesson.exercises.find((ex) => ex.order === order);
    if (!exercise) {
      return res.status(404).json({ message: "Ejercicio no encontrado." });
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

    // Verificar si el ejercicio ya está completado
    const isAlreadyCompleted = progress.completedExercises.some(
      (ex) => ex.lesson.toString() === lessonId && ex.exerciseOrder === order
    );

    if (!isAlreadyCompleted) {
      // Agregar ejercicio completado
      progress.completedExercises.push({
        lesson: lessonId,
        exerciseOrder: order,
        completedAt: new Date(),
      });

      // Guardar progreso
      await progress.save();

      // Otorgar XP por ejercicio
      const updatedUser = await addXP(userId, EXERCISE_XP);

      // Verificar si el curso está completo
      const lessons = await Lesson.find({ course: courseId });
      const totalExercises = lessons.reduce(
        (sum, l) => sum + l.exercises.length,
        0
      );
      const completedExercises = progress.completedExercises.length;
      const completionPercentage = (completedExercises / totalExercises) * 100;

      if (completionPercentage === 100) {
        // Verificar si el curso ya fue marcado como completado
        const user = await User.findById(userId);
        if (!user.completedCourses.includes(courseId)) {
          user.completedCourses.push(courseId);
          await user.save();
          // Otorgar XP por completar curso
          await addXP(userId, COURSE_COMPLETION_XP);
        }
      }

      res.json({
        message: "Ejercicio marcado como completado.",
        user: {
          xp: updatedUser.xp,
          level: updatedUser.level,
          maxXp: updatedUser.maxXp,
        },
      });
    } else {
      res.json({ message: "Ejercicio ya estaba completado." });
    }
  } catch (error) {
    console.error("Error al completar ejercicio:", {
      message: error.message,
      stack: error.stack,
      courseId: req.params.courseId,
      lessonId: req.params.lessonId,
      exerciseOrder: req.params.exerciseOrder,
      userId: req.user?.userId,
    });
    res.status(500).json({ message: "Error del servidor." });
  }
};
