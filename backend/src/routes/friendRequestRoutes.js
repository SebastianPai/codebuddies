import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
  getPendingRequests,
  respondToRequest,
  getSentRequests,
  deleteRequest, // 👈 Agregá esta línea
} from "../controllers/friendController.js";

import auth from "../middleware/auth.js";

const router = express.Router();

// Obtener solicitudes de amistad pendientes
router.get("/requests", verifyToken, getPendingRequests);

// Aceptar o rechazar solicitud
router.post("/respond", verifyToken, respondToRequest);

router.get("/sent", auth, getSentRequests);

router.delete("/:id", auth, deleteRequest);

// Ruta de prueba
router.get("/ping", (req, res) => {
  res.send("Friend request route funcionando ✅");
});

export default router;
