// backend/src/routes/courseRoutes.js
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
import { upload } from "../services/spacesService.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/module/:moduleId", verifyToken, getCoursesByModuleId);
router.post("/", verifyToken, upload.single("image"), createCourse);
router.get("/", getAllCourses);
router.get("/:id", getCourseById);
router.get("/:id/lessons", verifyToken, getLessonsByCourseId);
router.put("/:id/lessons", verifyToken, updateCourseLessons);
router.put("/:id", verifyToken, upload.single("image"), updateCourse);
router.delete("/:id", verifyToken, deleteCourse);

export default router;
