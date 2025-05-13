// src/services/streakService.js
import User from "../models/User.js";
import { addXP } from "./xpService.js";
import * as achievementService from "./achievementService.js";
import * as notificationService from "./notificationService.js"; // Nuevo: Importar notificationService
import Power from "../models/Power.js";

export const updateStreak = async (userId) => {
  const user = await User.findById(userId).populate("activePowers.powerId");
  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  const now = new Date();
  const nowUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const lastActivity = user.lastActivity ? new Date(user.lastActivity) : null;
  const lastActivityUTC = lastActivity
    ? new Date(
        Date.UTC(
          lastActivity.getUTCFullYear(),
          lastActivity.getUTCMonth(),
          lastActivity.getUTCDate()
        )
      )
    : null;

  console.log(
    `updateStreak: userId=${userId}, nowUTC=${nowUTC.toISOString()}, lastActivityUTC=${
      lastActivityUTC ? lastActivityUTC.toISOString() : "null"
    }, currentStreak=${user.streak}`
  );

  let bonusXP = 0;
  let streakProtected = false;

  const isSameDay = (date1, date2) =>
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate();

  const isYesterday = (date1, date2) => {
    const yesterday = new Date(date2);
    yesterday.setUTCDate(date2.getUTCDate() - 1);
    return isSameDay(date1, yesterday);
  };

  // Verificar si hay un protector de racha activo
  const activePowers = user.activePowers.filter((ap) => {
    const power = ap.powerId;
    if (power.effect.type === "streak_protector" && ap.remainingDuration > 0) {
      const daysSinceActivated = Math.floor(
        (new Date() - new Date(ap.activatedAt)) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceActivated < power.effect.duration) {
        streakProtected = true;
        ap.remainingDuration -= 1;
        console.log(
          `Protector de racha activo: powerId=${power._id}, remainingDuration=${ap.remainingDuration}`
        );
        return ap.remainingDuration > 0;
      }
    }
    return false;
  });

  user.activePowers = activePowers;

  try {
    if (!lastActivity) {
      user.streak = 1;
      await notificationService.createNotification(
        userId,
        "streak_updated",
        "¡Has comenzado una racha de 1 día!",
        { streak: user.streak }
      );
      console.log(`Nueva racha iniciada: streak=${user.streak}`);
    } else if (isSameDay(nowUTC, lastActivityUTC)) {
      console.log("Actividad en el mismo día, racha sin cambios");
      await user.save();
      return { streak: user.streak, bonusXP: 0, newAchievements: [] };
    } else if (isYesterday(lastActivityUTC, nowUTC)) {
      user.streak += 1;
      await notificationService.createNotification(
        userId,
        "streak_updated",
        `¡Tu racha ha aumentado a ${user.streak} días!`,
        { streak: user.streak }
      );
      console.log(`Racha incrementada: streak=${user.streak}`);
      if (user.streak >= 5) bonusXP = 20;
      else if (user.streak >= 3) bonusXP = 10;
      else if (user.streak >= 2) bonusXP = 5;
      if (bonusXP > 0) {
        await addXP(userId, bonusXP);
        console.log(`Bonus XP otorgado: ${bonusXP}`);
      }
    } else if (streakProtected) {
      await notificationService.createNotification(
        userId,
        "streak_protected",
        `Tu racha ha sido protegida por un poder activo.`,
        { streak: user.streak }
      );
      console.log("Racha protegida por poder");
    } else {
      user.streak = 1;
      await notificationService.createNotification(
        userId,
        "streak_updated",
        `Tu racha ha sido reiniciada a 1 día.`,
        { streak: user.streak }
      );
      console.log(`Racha reiniciada: streak=${user.streak}`);
    }

    user.lastActivity = now;
    await user.save();
    console.log(
      `Usuario guardado: streak=${
        user.streak
      }, lastActivity=${user.lastActivity.toISOString()}`
    );
  } catch (error) {
    console.error(`Error al actualizar racha para userId=${userId}:`, error);
    throw new Error("Error al actualizar la racha");
  }

  // Verificar logros después de actualizar la racha
  const newAchievements = await achievementService.checkAchievements(userId);

  return { streak: user.streak, bonusXP, newAchievements };
};

export const getStreak = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("Usuario no encontrado");
  }
  return user.streak || 0;
};
