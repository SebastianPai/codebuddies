import express from "express";
import {
  createLesson,
  getAllLessons,
  getLessonById,
  getLessonsByCourse,
  updateLesson,
  deleteLesson,
  getExerciseByOrder,
  updateExercise,
  deleteExercise,
  createExercise,
  validateCode, // Cambiado de validateHtml
} from "../controllers/lessonController.js";
import {
  canAccessLesson,
  canAccessExercise,
} from "../controllers/progressController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Ruta para SolveExercise.tsx
router.get("/:id", verifyToken, getLessonById);
router.get("/:lessonId/exercises/:order", verifyToken, getExerciseByOrder);

// Lesson routes
router.get(
  "/courses/:courseId/lessons",
  verifyToken,
  canAccessLesson,
  getLessonsByCourse
);
router.post("/", verifyToken, createLesson);
router.get("/", getAllLessons);
router.get(
  "/courses/:courseId/lessons/:id",
  verifyToken,
  canAccessLesson,
  getLessonById
);
router.put("/:id", verifyToken, updateLesson);
router.delete("/:id", verifyToken, deleteLesson);

// Exercise routes
router.post("/:lessonId/exercises", verifyToken, createExercise);
router.get(
  "/courses/:courseId/lessons/:lessonId/exercises/:order",
  verifyToken,
  canAccessExercise,
  getExerciseByOrder
);
router.put("/:lessonId/exercises/:order", verifyToken, updateExercise);
router.delete("/:lessonId/exercises/:order", verifyToken, deleteExercise);

// Ruta para validar código
router.post("/validate-code", verifyToken, validateCode);

export default router;
