import * as progressService from "../services/progressService.js";
import * as achievementService from "../services/achievementService.js"; // Nuevo: para logros
import Lesson from "../models/LessonModel.js";
import Course from "../models/CourseModel.js";
import Progress from "../models/ProgressModel.js";
import Power from "../models/Power.js"; // Nuevo: para poderes
import User from "../models/User.js"; // Necesario para completedCourses y activePowers
import { addXP } from "../services/xpService.js";
import * as coinService from "../services/coinService.js"; // Nuevo: para monedas

const EXERCISE_XP = 10;
const EXERCISE_COINS = 5; // Nuevo: Monedas por ejercicio
const COURSE_COMPLETION_XP = 100;
const COURSE_COMPLETION_COINS = 50; // Nuevo: Monedas por curso completo

// Verificar si un usuario puede acceder a un ejercicio (endpoint)
export const canAccessExercise = async (req, res) => {
  try {
    const { courseId, lessonId, exerciseOrder } = req.params;
    const userId = req.user.userId;

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
    console.error("Error en canAccessExercise:", error);
    res.status(500).json({ message: "Error al verificar acceso" });
  }
};

// Verificar si un usuario puede acceder a una lección (endpoint)
export const canAccessLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user.userId;

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
    console.error("Error en canAccessLesson:", error);
    res.status(500).json({ message: "Error al verificar acceso a la lección" });
  }
};

// Middleware: Verificar acceso a una lección
export const canAccessLessonMiddleware = async (req, res, next) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user.userId;

    const canAccess = await progressService.canAccessLesson(
      userId,
      courseId,
      lessonId
    );

    if (!canAccess) {
      return res.status(403).json({
        message: "Debes completar las lecciones anteriores primero.",
      });
    }

    next();
  } catch (error) {
    console.error("Error en canAccessLessonMiddleware:", error.message);
    res.status(500).json({ message: "Error al verificar acceso a la lección" });
  }
};

// Middleware: Verificar acceso a un ejercicio
export const canAccessExerciseMiddleware = async (req, res, next) => {
  try {
    const { courseId, lessonId, order } = req.params;
    const userId = req.user.userId;

    const canAccess = await progressService.canAccessExercise(
      userId,
      courseId,
      lessonId,
      parseInt(order)
    );

    if (!canAccess) {
      return res.status(403).json({
        message: "Debes completar los ejercicios anteriores primero.",
      });
    }

    next();
  } catch (error) {
    console.error("Error en canAccessExerciseMiddleware:", error.message);
    res.status(500).json({ message: "Error al verificar acceso al ejercicio" });
  }
};

// Obtener todo el progreso de un usuario en un curso
export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    // Validar courseId
    if (!courseId.match(/^[0-9a-fA-F]{24}$/)) {
      console.error("ID de curso inválido:", courseId);
      return res.status(400).json({ message: "ID de curso inválido" });
    }

    // Buscar el progreso del usuario en el curso
    const progress = await Progress.findOne({ user: userId, course: courseId })
      .select("completedExercises")
      .lean();

    // Si no hay progreso, devolver un array vacío
    if (!progress) {
      console.log(
        `No se encontró progreso para userId: ${userId}, courseId: ${courseId}`
      );
      res.set("Cache-Control", "no-store");
      return res.status(200).json([]);
    }

    // Validar que completedExercises sea un array
    if (!Array.isArray(progress.completedExercises)) {
      console.error(
        `completedExercises no es un array para userId: ${userId}, courseId: ${courseId}`,
        progress.completedExercises
      );
      res.set("Cache-Control", "no-store");
      return res.status(200).json([]);
    }

    // Transformar los datos
    const progressData = progress.completedExercises.map((exercise) => ({
      lessonId: exercise.lesson.toString(),
      exerciseOrder: exercise.exerciseOrder,
      completed: true,
      completedAt: exercise.completedAt,
    }));

    // Log de la respuesta
    console.log(
      `Respuesta de getCourseProgress para userId: ${userId}, courseId: ${courseId}`,
      progressData
    );

    res.set("Cache-Control", "no-store");
    res.status(200).json(progressData);
  } catch (error) {
    console.error("Error en getCourseProgress:", {
      message: error.message,
      stack: error.stack,
      courseId: req.params.courseId,
      userId: req.user?.userId,
    });
    res.set("Cache-Control", "no-store");
    return res.status(500).json([]);
  }
};

// Obtener el progreso de un ejercicio
export const getExerciseProgress = async (req, res) => {
  try {
    const { courseId, lessonId, exerciseOrder } = req.params;
    const userId = req.user.userId;

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

    res.json({ completed: isCompleted }); // Mantener formato antiguo
  } catch (error) {
    console.error("Error en getExerciseProgress:", error);
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
      console.error("Faltan parámetros requeridos:", {
        courseId,
        lessonId,
        exerciseOrder,
      });
      return res.status(400).json({ message: "Faltan parámetros requeridos." });
    }

    // Validar formato de exerciseOrder
    const order = parseInt(exerciseOrder);
    if (isNaN(order)) {
      console.error("Orden de ejercicio inválido:", exerciseOrder);
      return res
        .status(400)
        .json({ message: "El orden del ejercicio debe ser un número válido." });
    }

    // Verificar que el curso existe
    const course = await Course.findById(courseId);
    if (!course) {
      console.error(`Curso no encontrado: ${courseId}`);
      return res.status(404).json({ message: "Curso no encontrado." });
    }

    // Verificar que la lección existe
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      console.error(`Lección no encontrada: ${lessonId}`);
      return res.status(404).json({ message: "Lección no encontrada." });
    }

    // Verificar que el ejercicio existe
    const exercise = lesson.exercises.find((ex) => ex.order === order);
    if (!exercise) {
      console.error(
        `Ejercicio no encontrado: lessonId=${lessonId}, order=${order}`
      );
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

    let gainedXp = 0;
    let gainedCoins = 0;
    let newAchievements = [];

    if (!isAlreadyCompleted) {
      // Agregar ejercicio completado
      await progressService.markExerciseCompleted(
        userId,
        courseId,
        lessonId,
        order
      );

      // Otorgar XP y monedas por ejercicio
      const updatedUser = await addXP(userId, EXERCISE_XP);
      await coinService.addCoins(userId, EXERCISE_COINS);
      gainedXp = EXERCISE_XP;
      gainedCoins = EXERCISE_COINS;

      // Verificar logros
      newAchievements = await achievementService.checkAchievements(userId);

      // Verificar si el curso está completo
      const lessons = await Lesson.find({ course: courseId });
      const totalExercises = lessons.reduce(
        (sum, l) => sum + l.exercises.length,
        0
      );
      const completedExercises = progress.completedExercises.length + 1;
      const completionPercentage = (completedExercises / totalExercises) * 100;

      if (completionPercentage === 100) {
        const user = await User.findById(userId);
        if (!user.completedCourses.includes(courseId)) {
          user.completedCourses.push(courseId);
          await user.save();
          // Otorgar XP y monedas por completar curso
          await addXP(userId, COURSE_COMPLETION_XP);
          await coinService.addCoins(userId, COURSE_COMPLETION_COINS);
          gainedXp += COURSE_COMPLETION_XP;
          gainedCoins += COURSE_COMPLETION_COINS;
          console.log(
            `Curso completado: ${courseId}, +${COURSE_COMPLETION_XP} XP, +${COURSE_COMPLETION_COINS} monedas`
          );
        }
      }

      // Recargar usuario para obtener valores actualizados
      const finalUser = await User.findById(userId);

      console.log(
        `Ejercicio completado: userId=${userId}, courseId=${courseId}, lessonId=${lessonId}, order=${order}, gainedXp=${gainedXp}, gainedCoins=${gainedCoins}`
      );

      res.status(200).json({
        message:
          completionPercentage === 100
            ? "Curso completado."
            : "Ejercicio marcado como completado.",
        user: {
          xp: finalUser.xp,
          level: finalUser.level,
          maxXp: finalUser.maxXp,
          coins: finalUser.coins, // Nuevo
        },
        gainedXp,
        gainedCoins, // Nuevo
        newAchievements,
      });
    } else {
      console.log(
        `Ejercicio ya completado: userId=${userId}, courseId=${courseId}, lessonId=${lessonId}, order=${order}`
      );
      const user = await User.findById(userId);
      res.status(200).json({
        message: "Ejercicio ya estaba completado.",
        user: {
          xp: user.xp,
          level: user.level,
          maxXp: user.maxXp,
          coins: user.coins, // Nuevo
        },
        gainedXp: 0,
        gainedCoins: 0, // Nuevo
        newAchievements: [],
      });
    }
  } catch (error) {
    console.error("Error en completeExercise:", {
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

// Saltar un ejercicio usando un poder (nuevo)
export const skipExercise = async (req, res) => {
  try {
    const { courseId, lessonId, exerciseOrder } = req.params;
    const { powerId } = req.body;
    const userId = req.user.userId;

    // Validar parámetros
    if (!courseId || !lessonId || !exerciseOrder || !powerId) {
      return res.status(400).json({ message: "Faltan parámetros requeridos." });
    }

    // Validar formato de exerciseOrder
    const order = parseInt(exerciseOrder);
    if (isNaN(order)) {
      return res
        .status(400)
        .json({ message: "El orden del ejercicio debe ser un número válido." });
    }

    // Verificar poder activo
    const user = await User.findById(userId).populate("activePowers.powerId");
    const activePower = user.activePowers.find(
      (ap) =>
        ap.powerId._id.toString() === powerId &&
        ap.powerId.effect.type === "skip_exercise"
    );

    if (!activePower || activePower.remainingDuration <= 0) {
      return res
        .status(400)
        .json({ message: "No tienes un poder activo para saltar ejercicios" });
    }

    // Verificar que la lección existe
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lección no encontrada" });
    }

    // Verificar que el ejercicio existe
    const exercise = lesson.exercises.find((ex) => ex.order === order);
    if (!exercise) {
      return res.status(404).json({ message: "Ejercicio no encontrado" });
    }

    // Marcar ejercicio como completado
    await progressService.markExerciseCompleted(
      userId,
      courseId,
      lessonId,
      order
    );

    // Reducir duración del poder
    activePower.remainingDuration -= 1;
    if (activePower.remainingDuration <= 0) {
      user.activePowers = user.activePowers.filter(
        (ap) => ap.powerId.toString() !== powerId
      );
    }
    await user.save();

    // Verificar logros
    const newAchievements = await achievementService.checkAchievements(userId);

    // Verificar si el curso está completo (antiguo)
    const lessons = await Lesson.find({ course: courseId });
    const totalExercises = lessons.reduce(
      (sum, l) => sum + l.exercises.length,
      0
    );
    const progress = await Progress.findOne({ user: userId, course: courseId });
    const completedExercises = progress
      ? progress.completedExercises.length
      : 1;
    const completionPercentage = (completedExercises / totalExercises) * 100;

    if (completionPercentage === 100) {
      const user = await User.findById(userId);
      if (!user.completedCourses.includes(courseId)) {
        user.completedCourses.push(courseId);
        await user.save();
        await addXP(userId, COURSE_COMPLETION_XP);
      }
    }

    res.json({
      message: "Ejercicio saltado exitosamente",
      newAchievements,
    });
  } catch (error) {
    console.error("Error en skipExercise:", error.message);
    res.status(500).json({ message: "Error al saltar el ejercicio" });
  }
};
