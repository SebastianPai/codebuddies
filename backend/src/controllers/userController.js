import User from "../models/User.js";
import { uploadFileToSpaces } from "../services/spacesService.js";

export const getRankings = async (req, res) => {
  try {
    // Validar req.user
    if (!req.user || !req.user.userId) {
      return res
        .status(401)
        .json({ message: "Token inválido o usuario no autenticado" });
    }

    // Obtener top 5 usuarios
    const topUsers = await User.find()
      .sort({ xp: -1 })
      .limit(5)
      .select("name xp level profilePicture")
      .lean();

    // Obtener usuario actual
    const currentUser = await User.findById(req.user.userId).select(
      "name xp level profilePicture"
    );
    if (!currentUser) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Calcular ranking del usuario
    const userRank =
      (await User.countDocuments({ xp: { $gt: currentUser.xp } })) + 1;

    // Formatear top 5
    const topRankings = topUsers.map((user, index) => ({
      rank: index + 1,
      name: user.name,
      xp: user.xp,
      level: user.level,
      profilePicture: user.profilePicture,
    }));

    // Combinar rankings
    const rankings = [...topRankings];
    const userInTop5 = topRankings.some((r) => r.name === currentUser.name);
    if (!userInTop5) {
      rankings.push({
        rank: userRank,
        name: currentUser.name,
        xp: currentUser.xp,
        level: currentUser.level,
        profilePicture: currentUser.profilePicture,
      });
    }

    res.status(200).json({ rankings });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener rankings", error: error.message });
  }
};

export const updateProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No se proporcionó ninguna imagen" });
    }

    const result = await uploadFileToSpaces(req.file);
    const imageUrl = result.Location;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { profilePicture: imageUrl },
      { new: true, select: "-password" }
    );

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json({
      message: "Foto de perfil actualizada",
      profilePicture: user.profilePicture,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
