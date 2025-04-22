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
  createExercise, // Add new import
} from "../controllers/lessonController.js";

const router = express.Router();

// Lesson routes
router.get("/courses/:courseId/lessons", getLessonsByCourse);
router.post("/", createLesson);
router.get("/", getAllLessons);
router.get("/:id", getLessonById);
router.put("/:id", updateLesson);
router.delete("/:id", deleteLesson);

// Exercise routes
router.post("/:lessonId/exercises", createExercise); // New route
router.get("/:lessonId/exercises/:order", getExerciseByOrder);
router.put("/:lessonId/exercises/:order", updateExercise);
router.delete("/:lessonId/exercises/:order", deleteExercise);

export default router;
