import express from "express";
import {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourseLessons,
  getLessonsByCourseId,
  updateCourse,
  deleteCourse,
  getCoursesByModuleId,
} from "../controllers/courseController.js";

const router = express.Router();

router.get("/module/:moduleId", getCoursesByModuleId);
router.post("/", createCourse);
router.get("/", getAllCourses);
router.get("/:id", getCourseById);
router.get("/:id/lessons", getLessonsByCourseId);
router.put("/:id/lessons", updateCourseLessons);
router.put("/:id", updateCourse); // 👈 nuevo
router.delete("/:id", deleteCourse); // 👈 nuevo

export default router;
