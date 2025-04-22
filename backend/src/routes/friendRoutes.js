import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
  addFriend,
  getFriends,
  getPendingRequests,
  respondToRequest,
  removeFriend,
} from "../controllers/friendController.js";

import auth from "../middleware/auth.js";

const router = express.Router();

// Enviar solicitud de amistad
router.post("/request", verifyToken, addFriend);

// Obtener amigos aceptados
router.get("/", verifyToken, getFriends);

// Obtener solicitudes de amistad recibidas (pendientes)
router.get("/requests", verifyToken, getPendingRequests);

// Aceptar o rechazar solicitud
router.post("/respond", verifyToken, respondToRequest);

router.delete("/:friendId", auth, removeFriend);

export default router;
