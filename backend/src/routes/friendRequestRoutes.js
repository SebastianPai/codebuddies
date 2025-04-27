// routes/friendRoutes.js
import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
  getPendingRequests,
  respondToRequest,
  getSentRequests,
  deleteRequest,
} from "../controllers/friendController.js";

const router = express.Router();

// Obtener solicitudes de amistad pendientes
router.get("/requests", verifyToken, getPendingRequests);

// Aceptar o rechazar solicitud
router.post("/respond", verifyToken, respondToRequest);

// Obtener solicitudes enviadas
router.get("/sent", verifyToken, getSentRequests);

// Eliminar solicitud
router.delete("/:id", verifyToken, deleteRequest);

// Ruta de prueba
router.get("/ping", (req, res) => {
  res.send("Friend request route funcionando ✅");
});

export default router;
