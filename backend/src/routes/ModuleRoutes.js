import express from "express";
import {
  createModule,
  getModules,
  getModuleById,
  getCoursesByModule,
  updateModule,
  deleteModule,
} from "../controllers/moduleController.js";

const router = express.Router();

router.post("/", createModule);
router.get("/", getModules);
router.get("/:id", getModuleById);
router.get("/:id/courses", getCoursesByModule);
router.put("/:id", updateModule); // 👈 nuevo
router.delete("/:id", deleteModule); // 👈 nuevo

export default router;
