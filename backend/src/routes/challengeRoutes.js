import express from "express";
import {
  getChallengeByLesson,
  getChallengeById,
  createChallenge,
  updateChallenge,
  deleteChallenge,
} from "../controllers/challengeController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/lesson/:lessonId", getChallengeByLesson);
router.get("/:id", getChallengeById);
router.post("/", auth, createChallenge);
router.put("/:id", auth, updateChallenge);
router.delete("/:id", auth, deleteChallenge);

export default router;
