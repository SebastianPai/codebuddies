import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
  canAccessExercise,
  canAccessLesson,
  getCourseProgress,
  getExerciseProgress,
  completeExercise,
} from "../controllers/progressController.js";

const router = express.Router();

// Primero las rutas MÁS específicas
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

// Y al final las rutas genéricas
router.get("/:courseId/all", verifyToken, getCourseProgress);

export default router;
