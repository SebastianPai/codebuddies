// src/controllers/userController.js
import User from "../models/User.js";
import { uploadFileToSpaces } from "../services/spacesService.js";
import * as livesService from "../services/livesService.js";
import * as streakService from "../services/streakService.js";
import * as achievementService from "../services/achievementService.js";
import * as coinService from "../services/coinService.js";
import Power from "../models/Power.js";

export const getRankings = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res
        .status(401)
        .json({ message: "Token inválido o usuario no autenticado" });
    }

    const topUsers = await User.find()
      .sort({ xp: -1 })
      .limit(5)
      .select("name xp level profilePicture activeBorder")
      .populate("activeBorder")
      .lean();

    const currentUser = await User.findById(req.user.userId)
      .select("name xp level profilePicture activeBorder")
      .populate("activeBorder");

    if (!currentUser) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const userRank =
      (await User.countDocuments({ xp: { $gt: currentUser.xp } })) + 1;

    const topRankings = topUsers.map((user, index) => ({
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

    const rankings = [...topRankings];
    const userInTop5 = topRankings.some(
      (r) => r.userId === currentUser._id.toString()
    );
    if (!userInTop5) {
      rankings.push({
        rank: userRank,
        userId: currentUser._id.toString(),
        name: currentUser.name,
        xp: currentUser.xp,
        level: currentUser.level,
        profilePicture: currentUser.profilePicture,
        activeBorder: currentUser.activeBorder
          ? {
              id: currentUser.activeBorder._id.toString(),
              name: currentUser.activeBorder.name,
              description: currentUser.activeBorder.description,
              properties: currentUser.activeBorder.properties || {},
              image: currentUser.activeBorder.image || "",
            }
          : null,
      });
    }

    res.status(200).json({ rankings });
  } catch (error) {
    console.error("Error en getRankings:", error);
    res
      .status(500)
      .json({ message: "Error al obtener rankings", error: error.message });
  }
};

// Resto del código sin cambios
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

export const updateProfileBackground = async (req, res) => {
  try {
    const { background } = req.body;
    if (!background) {
      return res.status(400).json({ message: "Fondo no proporcionado" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { profileBackground: background },
      { new: true, select: "profileBackground" }
    );

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json({
      message: "Fondo de perfil actualizado",
      profileBackground: user.profileBackground,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al actualizar fondo", error: error.message });
  }
};

export const getLives = async (req, res) => {
  try {
    const userId = req.user.userId;
    const lives = await livesService.getLives(userId);
    res.status(200).json({ lives });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener vidas", error: error.message });
  }
};

export const buyLives = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Cantidad de vidas inválida" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    if (user.lives >= 50) {
      return res.status(400).json({ message: "Ya tienes el máximo de vidas" });
    }

    const costPerLife = 50;
    const totalCost = amount * costPerLife;

    await coinService.deductCoins(userId, totalCost);
    const newLives = Math.min(user.lives + amount, 5);
    user.lives = newLives;
    await user.save();

    res.status(200).json({
      message: `${amount} vidas compradas exitosamente`,
      lives: user.lives,
      coins: user.coins,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getStreak = async (req, res) => {
  try {
    const userId = req.user.userId;
    const streak = await streakService.getStreak(userId);
    res.status(200).json({ streak });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener racha", error: error.message });
  }
};

export const getAchievements = async (req, res) => {
  try {
    const userId = req.user.userId;
    const achievements = await achievementService.getAchievements(userId);
    res.status(200).json({ achievements });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener logros", error: error.message });
  }
};

export const getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .select(
        "name level xp profilePicture profileBackground achievements streak borders tags activeBorder activeTag powers activePowers"
      )
      .populate("achievements.achievementId")
      .populate("borders.borderId")
      .populate("tags.tagId")
      .populate("activeBorder")
      .populate("activeTag")
      .populate("powers.powerId")
      .populate("activePowers.powerId");

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json({
      profile: {
        name: user.name,
        level: user.level,
        xp: user.xp,
        profilePicture: user.profilePicture || "",
        profileBackground: user.profileBackground || "",
        achievements: user.achievements.map((a) => ({
          id: a.achievementId._id,
          name: a.achievementId.name,
          description: a.achievementId.description,
          icon: a.achievementId.icon,
          image: a.achievementId.image,
          awardedAt: a.awardedAt,
        })),
        streak: user.streak,
        borders: user.borders.map((b) => ({
          id: b.borderId._id,
          name: b.borderId.name,
          description: b.borderId.description,
          properties: b.borderId.properties,
          image: b.borderId.image,
          acquiredAt: b.acquiredAt,
        })),
        tags: user.tags.map((t) => ({
          id: t.tagId._id,
          name: t.tagId.name,
          description: t.tagId.description,
          properties: t.tagId.properties,
          image: t.tagId.image,
          acquiredAt: t.acquiredAt,
        })),
        activeBorder: user.activeBorder
          ? {
              id: user.activeBorder._id,
              name: user.activeBorder.name,
              description: user.activeBorder.description,
              properties: user.activeBorder.properties,
              image: user.activeBorder.image,
            }
          : null,
        activeTag: user.activeTag
          ? {
              id: user.activeTag._id,
              name: user.activeTag.name,
              description: user.activeTag.description,
              properties: user.activeTag.properties,
              image: user.activeTag.image,
            }
          : null,
        powers: user.powers.map((p) => ({
          id: p.powerId._id,
          name: p.powerId.name,
          description: p.powerId.description,
          effect: p.powerId.effect,
          image: p.powerId.image,
          emoji: p.powerId.emoji,
          usesLeft: p.usesLeft,
          acquiredAt: p.acquiredAt,
        })),
        activePowers: user.activePowers.map((ap) => ({
          id: ap.powerId._id,
          name: ap.powerId.name,
          description: ap.powerId.description,
          effect: ap.powerId.effect,
          image: ap.powerId.image,
          emoji: ap.powerId.emoji,
          remainingDuration: ap.remainingDuration,
          activatedAt: ap.activatedAt,
        })),
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener perfil", error: error.message });
  }
};

export const getCoins = async (req, res) => {
  try {
    const userId = req.user.userId;
    const coins = await coinService.getCoins(userId);
    res.status(200).json({ coins });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener monedas", error: error.message });
  }
};

export const spendCoins = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.userId;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Cantidad de monedas inválida" });
    }

    const coins = await coinService.deductCoins(userId, amount);
    res.status(200).json({ message: "Monedas gastadas", coins });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const setActiveBorder = async (req, res) => {
  try {
    const { borderId } = req.body;
    const userId = req.user.userId;

    console.log(`setActiveBorder: userId=${userId}, borderId=${borderId}`);

    const user = await User.findById(userId).populate("activeBorder");
    if (!user) {
      console.error("Usuario no encontrado");
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (borderId) {
      // Verificar si el borde existe en la colección del usuario
      const borderExists = user.borders.some((b) => {
        const match = b.borderId.toString() === borderId;
        console.log(
          `Comparando borderId: ${b.borderId.toString()} === ${borderId} -> ${match}`
        );
        return match;
      });

      if (!borderExists) {
        console.error(`Borde no poseído: ${borderId}`);
        return res.status(400).json({ message: "No posees este borde" });
      }

      user.activeBorder = borderId;
      console.log(`Activando borde: ${borderId}`);
    } else {
      user.activeBorder = null;
      console.log("Desactivando borde");
    }

    await user.save();
    await user.populate("activeBorder");

    res.status(200).json({
      message: borderId ? "Borde activado" : "Borde desactivado",
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
  } catch (error) {
    console.error("Error en setActiveBorder:", error);
    res
      .status(400)
      .json({ message: error.message || "Error al gestionar el borde" });
  }
};

export const setActiveTag = async (req, res) => {
  try {
    const { tagId } = req.body;
    const userId = req.user.userId;

    console.log(`setActiveTag: userId=${userId}, tagId=${tagId}`);

    const user = await User.findById(userId).populate("activeTag");
    if (!user) {
      console.error("Usuario no encontrado");
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (tagId) {
      // Verificar si la etiqueta existe en la colección del usuario
      const tagExists = user.tags.some((t) => {
        const match = t.tagId.toString() === tagId;
        console.log(
          `Comparando tagId: ${t.tagId.toString()} === ${tagId} -> ${match}`
        );
        return match;
      });

      if (!tagExists) {
        console.error(`Etiqueta no poseída: ${tagId}`);
        return res.status(400).json({ message: "No posees esta etiqueta" });
      }

      user.activeTag = tagId;
      console.log(`Activando etiqueta: ${tagId}`);
    } else {
      user.activeTag = null;
      console.log("Desactivando etiqueta");
    }

    await user.save();
    await user.populate("activeTag");

    res.status(200).json({
      message: tagId ? "Etiqueta activada" : "Etiqueta desactivada",
      activeTag: user.activeTag
        ? {
            id: user.activeTag._id.toString(),
            name: user.activeTag.name,
            description: user.activeTag.description,
            properties: user.activeTag.properties || {},
            image: user.activeTag.image || "",
          }
        : null,
    });
  } catch (error) {
    console.error("Error en setActiveTag:", error);
    res
      .status(400)
      .json({ message: error.message || "Error al gestionar la etiqueta" });
  }
};

export const activatePower = async (req, res) => {
  try {
    const { powerId, action = "activate" } = req.body;
    const userId = req.user.userId;

    console.log(
      `activatePower: userId=${userId}, powerId=${powerId}, action=${action}`
    );

    // Validar entrada
    if (!["activate", "deactivate"].includes(action)) {
      console.error(`Acción inválida: ${action}`);
      return res
        .status(400)
        .json({ message: "Acción inválida. Use 'activate' o 'deactivate'" });
    }

    if (action === "activate" && !powerId) {
      console.error("Se requiere powerId para activar un poder");
      return res
        .status(400)
        .json({ message: "Se requiere powerId para activar un poder" });
    }

    if (action === "deactivate" && !powerId) {
      console.error("Se requiere powerId para desactivar un poder");
      return res
        .status(400)
        .json({ message: "Se requiere powerId para desactivar un poder" });
    }

    // Buscar usuario
    const user = await User.findById(userId).populate("activePowers.powerId");
    if (!user) {
      console.error("Usuario no encontrado");
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (!user.activePowers) user.activePowers = [];

    // Buscar poder
    const powerEntry = user.powers.find(
      (p) => p.powerId.toString() === powerId
    );
    const power = powerId ? await Power.findById(powerId) : null;

    if (action === "activate") {
      // Validaciones para activación
      if (
        !powerEntry ||
        (powerEntry.usesLeft !== undefined && powerEntry.usesLeft <= 0)
      ) {
        console.error(`Poder no poseído o sin usos: ${powerId}`);
        return res.status(400).json({
          message: "No posees este poder o no tienes usos disponibles",
        });
      }

      if (!power) {
        console.error(`Poder no encontrado en DB: ${powerId}`);
        return res.status(404).json({ message: "Poder no encontrado" });
      }

      // Verificar si el poder ya está activo
      const isAlreadyActive = user.activePowers.some(
        (ap) => ap.powerId.toString() === powerId
      );
      if (isAlreadyActive) {
        console.warn(`Poder ya está activo: ${powerId}`);
        return res.status(400).json({ message: "Este poder ya está activo" });
      }

      // Reducir usos
      if (powerEntry.usesLeft !== undefined) {
        powerEntry.usesLeft -= 1;
        if (powerEntry.usesLeft === 0) {
          user.powers = user.powers.filter(
            (p) => p.powerId.toString() !== powerId
          );
          console.log(`Poder agotado, eliminado: ${powerId}`);
        }
      }

      // Activar poder
      user.activePowers.push({
        powerId,
        remainingDuration: power.effect.duration,
        activatedAt: new Date(),
      });
      console.log(
        `Poder activado: ${powerId}, duración=${power.effect.duration} ${power.effect.durationType}`
      );
    } else if (action === "deactivate") {
      // Validaciones para desactivación
      if (!powerEntry) {
        console.error(`Poder no poseído: ${powerId}`);
        return res.status(400).json({ message: "No posees este poder" });
      }

      if (!power) {
        console.error(`Poder no encontrado en DB: ${powerId}`);
        return res.status(404).json({ message: "Poder no encontrado" });
      }

      // Verificar si el poder está activo
      const isActive = user.activePowers.some(
        (ap) => ap.powerId.toString() === powerId
      );
      if (!isActive) {
        console.warn(`Poder no está activo: ${powerId}`);
        return res.status(400).json({ message: "Este poder no está activo" });
      }

      // Desactivar poder específico
      user.activePowers = user.activePowers.filter(
        (ap) => ap.powerId.toString() !== powerId
      );
      console.log(`Poder desactivado: ${powerId}`);
    }

    // Guardar cambios
    await user.save();
    await user.populate("powers.powerId activePowers.powerId");

    // Formatear respuesta
    res.status(200).json({
      message: action === "activate" ? "Poder activado" : "Poder desactivado",
      powers: user.powers.map((p) => ({
        id: p.powerId._id.toString(),
        name: p.powerId.name,
        description: p.powerId.description,
        effect: p.powerId.effect,
        image: p.powerId.image,
        emoji: p.powerId.emoji,
        usesLeft: p.usesLeft,
        acquiredAt: p.acquiredAt,
      })),
      activePowers: user.activePowers.map((ap) => ({
        id: ap.powerId._id.toString(),
        name: ap.powerId.name,
        description: ap.powerId.description,
        effect: ap.powerId.effect,
        image: ap.powerId.image,
        emoji: ap.powerId.emoji,
        remainingDuration: ap.remainingDuration,
        activatedAt: ap.activatedAt,
      })),
    });
  } catch (error) {
    console.error("Error en activatePower:", error);
    res.status(400).json({
      message: error.message || "Error al gestionar el poder",
      error: error.message,
    });
  }
};
