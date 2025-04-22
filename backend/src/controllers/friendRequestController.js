// src/controllers/friendRequestController.js
import FriendRequest from "../models/FriendRequestModel.js";
import User from "../models/UserModel.js";
import Friend from "../models/FriendModel.js";

export const sendFriendRequest = async (req, res) => {
  const { email } = req.body;

  try {
    const receiver = await User.findOne({ email });
    if (!receiver)
      return res.status(404).json({ message: "Usuario no encontrado" });

    const existingRequest = await FriendRequest.findOne({
      sender: req.user.userId,
      receiver: receiver._id,
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Solicitud ya enviada" });
    }

    const newRequest = new FriendRequest({
      sender: req.user.userId,
      receiver: receiver._id,
    });

    await newRequest.save();
    res.status(201).json({ message: "Solicitud enviada" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error enviando solicitud", error: error.message });
  }
};

export const respondToRequest = async (req, res) => {
  const { requestId, action } = req.body; // action: "accepted" o "rejected"

  try {
    const request = await FriendRequest.findById(requestId);
    if (!request)
      return res.status(404).json({ message: "Solicitud no encontrada" });

    if (request.receiver.toString() !== req.user.userId)
      return res.status(403).json({ message: "No autorizado" });

    request.status = action;
    await request.save();

    if (action === "accepted") {
      // Crear relación de amistad en ambos sentidos
      await Friend.create([
        {
          name: "",
          email: "",
          addedBy: request.sender,
          friendId: request.receiver,
        },
        {
          name: "",
          email: "",
          addedBy: request.receiver,
          friendId: request.sender,
        },
      ]);
    }

    res.json({ message: `Solicitud ${action}` });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error actualizando solicitud", error: error.message });
  }
};

export const getPendingRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      receiver: req.user.userId,
      status: "pending",
    }).populate("sender", "email");

    res.json(requests);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener solicitudes", error: error.message });
  }
};
