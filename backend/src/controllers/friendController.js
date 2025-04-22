import Friend from "../models/FriendModel.js";
import User from "../models/User.js";

// Enviar solicitud de amistad
export const addFriend = async (req, res) => {
  const { email } = req.body;

  try {
    console.log("Email recibido en solicitud:", email);
    console.log("Buscando usuario con:", email.toLowerCase());

    const recipient = await User.findOne({ email: email.toLowerCase() });
    console.log("Recipient encontrado:", recipient);

    if (!recipient) {
      return res.status(404).json({ message: "El usuario no existe" });
    }

    // Evitar solicitudes duplicadas
    const existingRequest = await Friend.findOne({
      requester: req.user.userId,
      recipient: recipient._id,
    });

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "Ya has enviado una solicitud a este usuario" });
    }

    const newRequest = new Friend({
      requester: req.user.userId,
      recipient: recipient._id,
      status: "pending",
    });

    await newRequest.save();
    res.status(201).json({ message: "Solicitud enviada" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al enviar solicitud", error: err.message });
  }
};

// Obtener lista de amigos aceptados
export const getFriends = async (req, res) => {
  try {
    const userId = req.user.userId;

    const friends = await Friend.find({
      status: "accepted",
      $or: [{ requester: userId }, { recipient: userId }],
    }).populate("requester recipient", "name email");

    // Filtrar para que solo devuelva al "otro" usuario
    const formatted = friends.map((rel) => {
      const friend =
        rel.requester._id.toString() === userId ? rel.recipient : rel.requester;
      return {
        _id: friend._id,
        name: friend.name,
        email: friend.email,
      };
    });

    res.json(formatted);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al obtener amigos", error: err.message });
  }
};

// Obtener solicitudes de amistad recibidas
export const getPendingRequests = async (req, res) => {
  try {
    const requests = await Friend.find({
      recipient: req.user.userId,
      status: "pending",
    }).populate("requester", "email"); // 👈 Esto es clave

    res.json(requests);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener solicitudes",
      error: error.message,
    });
  }
};

// Aceptar o rechazar solicitud
export const respondToRequest = async (req, res) => {
  const { requestId, action } = req.body;

  if (!["accepted", "rejected"].includes(action)) {
    return res.status(400).json({ message: "Acción inválida" });
  }

  try {
    const request = await Friend.findOne({
      _id: requestId,
      recipient: req.user.userId,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    request.status = action;
    await request.save();

    res.json({
      message: `Solicitud ${action === "accepted" ? "aceptada" : "rechazada"}`,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al responder solicitud", error: err.message });
  }
};

// Obtener solicitudes de amistad enviadas por el usuario (pendientes)
export const getSentRequests = async (req, res) => {
  try {
    const sentRequests = await Friend.find({
      requester: req.user.userId,
      status: "pending",
    }).populate("recipient", "email");

    res.json(sentRequests);
  } catch (err) {
    res.status(500).json({
      message: "Error al obtener solicitudes enviadas",
      error: err.message,
    });
  }
};

export const deleteRequest = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const request = await Friend.findOne({
      _id: id,
      requester: userId,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({
        message: "Solicitud no encontrada o no autorizada para eliminar.",
      });
    }

    await request.deleteOne();

    res.json({ message: "Solicitud eliminada correctamente." });
  } catch (err) {
    console.error("❌ Error al eliminar solicitud:", err.message);
    res.status(500).json({ message: "Error al eliminar solicitud." });
  }
};

export const removeFriend = async (req, res) => {
  const userId = req.user.userId;
  const { friendId } = req.params;

  try {
    const friendship = await Friend.findOneAndDelete({
      status: "accepted",
      $or: [
        { requester: userId, recipient: friendId },
        { requester: friendId, recipient: userId },
      ],
    });

    if (!friendship) {
      return res
        .status(404)
        .json({ message: "Amistad no encontrada o ya eliminada." });
    }

    res.json({ message: "Amigo eliminado correctamente." });
  } catch (error) {
    console.error("❌ Error al eliminar amigo:", error.message);
    res.status(500).json({ message: "Error al eliminar amigo." });
  }
};
