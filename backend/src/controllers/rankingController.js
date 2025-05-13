// src/controllers/rankingController.js
import User from "../models/User.js";
import * as rankingService from "../services/rankingService.js";

export const getRankings = async (req, res) => {
  try {
    const { period } = req.params;
    if (!["global", "weekly", "monthly"].includes(period)) {
      return res.status(400).json({ message: "Período inválido" });
    }

    if (period === "global") {
      const topUsers = await User.find()
        .sort({ level: -1, xp: -1 })
        .limit(10)
        .select("name xp level profilePicture activeBorder")
        .populate("activeBorder")
        .lean();

      const rankings = topUsers.map((user, index) => ({
        rank: index + 1,
        userId: user._id.toString(),
        name: user.name,
        xp: user.xp,
        level: user.level,
        profilePicture: user.profilePicture,
        activeBorder: user.activeBorder
          ? {
              id: user.activeBorder._id.toString(),
              name: user.activeBorder.name,
              description: user.activeBorder.description,
              properties: user.activeBorder.properties || {},
              image: user.activeBorder.image || "",
            }
          : null,
      }));

      console.log("Rankings global:", JSON.stringify(rankings, null, 2)); // Log para depuración
      return res.status(200).json({ rankings });
    }

    const rankings = await rankingService.getRankings(period);
    console.log(`Rankings ${period}:`, JSON.stringify(rankings, null, 2)); // Log para depuración
    res.status(200).json({ rankings });
  } catch (error) {
    console.error("Error en getRankings:", error);
    res
      .status(500)
      .json({ message: "Error al obtener rankings", error: error.message });
  }
};

export const getUserRank = async (req, res) => {
  try {
    const { period } = req.params;
    const userId = req.user.userId;

    if (!["global", "weekly", "monthly"].includes(period)) {
      return res.status(400).json({ message: "Período inválido" });
    }

    if (period === "global") {
      const user = await User.findById(userId)
        .select("level xp activeBorder")
        .populate("activeBorder");
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      const rank =
        (await User.countDocuments({ level: { $gt: user.level } })) +
        (await User.countDocuments({
          level: user.level,
          xp: { $gt: user.xp },
        })) +
        1;
      return res.status(200).json({
        rank,
        xp: user.xp,
        level: user.level,
        activeBorder: user.activeBorder
          ? {
              id: user.activeBorder._id.toString(),
              name: user.activeBorder.name,
              description: user.activeBorder.description,
              properties: user.activeBorder.properties || {},
              image: user.activeBorder.image || "",
            }
          : null,
      });
    }

    const userRank = await rankingService.getUserRank(userId, period);
    res.status(200).json(userRank);
  } catch (error) {
    console.error("Error en getUserRank:", error);
    res
      .status(500)
      .json({ message: "Error al obtener ranking", error: error.message });
  }
};

// Existing getRankings and getUserRank functions remain unchanged...

export const getPublicRankings = async (req, res) => {
  try {
    const { period } = req.params;
    if (!["weekly", "monthly"].includes(period)) {
      return res
        .status(400)
        .json({
          message: "Período inválido. Solo se permiten 'weekly' o 'monthly'.",
        });
    }

    const rankings = await rankingService.getRankings(period);
    console.log(
      `Rankings públicos ${period}:`,
      JSON.stringify(rankings, null, 2)
    ); // Log para depuración
    res.status(200).json({ rankings });
  } catch (error) {
    console.error("Error en getPublicRankings:", error);
    res
      .status(500)
      .json({
        message: "Error al obtener rankings públicos",
        error: error.message,
      });
  }
};
