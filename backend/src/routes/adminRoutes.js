// src/routes/adminRoutes.js
import express from "express";
import {
  createAchievement,
  getAchievements,
  updateAchievement,
  deleteAchievement,
  createShopItem,
  getShopItems,
  updateShopItem,
  deleteShopItem,
  createPower,
  getPowers,
  updatePower,
  deletePower,
} from "../controllers/adminController.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { restrictToAdmin } from "../middleware/restrictToAdmin.js";

const router = express.Router();

router.use(verifyToken, restrictToAdmin);

// Rutas para logros
router.post("/achievements", createAchievement);
router.get("/achievements", getAchievements);
router.put("/achievements/:id", updateAchievement);
router.delete("/achievements/:id", deleteAchievement);

// Rutas para ítems de la tienda
router.post("/shop", createShopItem);
router.get("/shop", getShopItems);
router.put("/shop/:id", updateShopItem);
router.delete("/shop/:id", deleteShopItem);

// Rutas para poderes
router.post("/powers", createPower);
router.get("/powers", getPowers);
router.put("/powers/:id", updatePower);
router.delete("/powers/:id", deletePower);

export default router;
