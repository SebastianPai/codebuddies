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
import multer from "multer";

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Save files to the 'uploads' directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + file.originalname); // Unique filename
  },
});

const upload = multer({ storage });

const router = express.Router();

router.get("/module/:moduleId", getCoursesByModuleId);
router.post("/", upload.single("image"), createCourse); // Handle image upload
router.get("/", getAllCourses);
router.get("/:id", getCourseById);
router.get("/:id/lessons", getLessonsByCourseId);
router.put("/:id/lessons", updateCourseLessons);
router.put("/:id", upload.single("image"), updateCourse); // Handle image upload
router.delete("/:id", deleteCourse);

export default router;
