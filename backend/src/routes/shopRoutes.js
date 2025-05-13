// src/routes/shopRoutes.js
import express from "express";
import { getShopItems, purchaseItem } from "../controllers/shopController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", verifyToken, getShopItems);
router.post("/purchase", verifyToken, purchaseItem);

export default router;
