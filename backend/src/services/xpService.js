// src/services/xpService.js
import User from "../models/User.js";
import * as rankingService from "./rankingService.js";
import * as achievementService from "./achievementService.js";
import Power from "../models/Power.js";
import * as notificationService from "./notificationService.js";

export const addXP = async (userId, xpToAdd) => {
  try {
    const user = await User.findById(userId).populate("activePowers.powerId");
    if (!user) throw new Error("Usuario no encontrado");

    let modifiedXp = xpToAdd;
    const updatedActivePowers = [];

    // Aplicar poderes activos
    for (const activePower of user.activePowers) {
      const power = activePower.powerId;
      if (
        power.effect.durationType === "exercises" &&
        activePower.remainingDuration > 0
      ) {
        switch (power.effect.type) {
          case "double_xp":
            modifiedXp *= 2;
            break;
          case "triple_xp":
            modifiedXp *= 3;
            break;
          case "multiply_xp":
            modifiedXp *= power.effect.value;
            break;
        }
        activePower.remainingDuration -= 1;
        if (activePower.remainingDuration > 0) {
          updatedActivePowers.push(activePower);
        }
      } else if (power.effect.durationType === "days") {
        const daysSinceActivated = Math.floor(
          (new Date() - new Date(activePower.activatedAt)) /
            (1000 * 60 * 60 * 24)
        );
        if (daysSinceActivated < power.effect.duration) {
          updatedActivePowers.push(activePower);
        }
      }
    }

    user.activePowers = updatedActivePowers;
    user.xp += modifiedXp;
    await notificationService.createNotification(
      userId,
      "xp_added",
      `¡Has ganado ${modifiedXp} XP!`,
      { xp: modifiedXp }
    );

    // Verificar si sube de nivel
    let newAchievements = [];
    while (user.xp >= user.maxXp) {
      user.xp -= user.maxXp;
      user.level += 1;
      user.maxXp = Math.round(user.maxXp * 1.5);
      await notificationService.createNotification(
        userId,
        "level_up",
        `¡Felicidades! Has subido al nivel ${user.level}!`,
        { level: user.level }
      );
      const levelAchievements = await achievementService.checkAchievements(
        userId
      );
      newAchievements = [...newAchievements, ...levelAchievements];
    }

    await user.save();
    await rankingService.updateRanking(userId, modifiedXp);
    return { user, newAchievements, modifiedXp };
  } catch (error) {
    throw new Error(`Error al agregar XP: ${error.message}`);
  }
};
