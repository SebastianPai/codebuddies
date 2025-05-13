import User from "../models/User.js";
import * as notificationService from "./notificationService.js"; // Ajusta la ruta según tu estructura

export const getLives = async (userId) => {
  const user = await User.findById(userId);
  const now = new Date();
  const lastReset = new Date(user.lastLivesReset);

  const isSameDay = (date1, date2) =>
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();

  if (!isSameDay(now, lastReset)) {
    user.lives = 5; // Resetear vidas cada día
    user.lastLivesReset = now;
    await user.save();
  }

  return user.lives;
};

export const deductLife = async (userId) => {
  const user = await User.findById(userId);
  if (user.lives > 0) {
    user.lives -= 1;
    await user.save();
    await notificationService.createNotification(
      userId,
      "lives_deducted",
      `Has perdido una vida. Te quedan ${user.lives} vidas.`,
      { lives: user.lives }
    );
  } else {
    throw new Error("No tienes vidas suficientes");
  }
  return user.lives;
};
