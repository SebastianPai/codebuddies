// src/routes/rankingRoutes.js
import express from "express";
import {
  getRankings,
  getUserRank,
  getPublicRankings,
} from "../controllers/rankingController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/:period", verifyToken, getRankings);
router.get("/user/:period", verifyToken, getUserRank);

// New public route for unauthenticated access
router.get("/public/:period", getPublicRankings);

export default router;
