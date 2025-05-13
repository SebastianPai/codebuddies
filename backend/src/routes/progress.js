// src/routes/progress.js
import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
  canAccessExercise,
  canAccessLesson,
  getCourseProgress,
  getExerciseProgress,
  completeExercise,
  skipExercise,
} from "../controllers/progressController.js";

const router = express.Router();

// Primero las rutas más específicas
router.get(
  "/courses/:courseId/lessons/:lessonId/exercises/:exerciseOrder/progress",
  verifyToken,
  getExerciseProgress
);

router.post(
  "/courses/:courseId/lessons/:lessonId/exercises/:exerciseOrder/complete",
  verifyToken,
  completeExercise
);

router.post(
  "/courses/:courseId/lessons/:lessonId/exercises/:exerciseOrder/skip",
  verifyToken,
  skipExercise
);

router.get(
  "/:courseId/:lessonId/:exerciseOrder/can-access",
  verifyToken,
  canAccessExercise
);

router.get(
  "/:courseId/:lessonId/can-access-lesson",
  verifyToken,
  canAccessLesson
);

router.get("/courses/:courseId/progress/all", verifyToken, getExerciseProgress);

// Rutas genéricas
router.get("/:courseId/all", verifyToken, getCourseProgress);

export default router;
