import User from "../models/User.js"; // Añadir la importación del modelo User
import * as notificationService from "./notificationService.js";

export const addCoins = async (userId, amount) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("Usuario no encontrado");
  }
  user.coins += amount;
  await user.save();
  await notificationService.createNotification(
    userId,
    "coins_added",
    `¡Has ganado ${amount} monedas!`,
    { amount }
  );
  return user.coins;
};

export const deductCoins = async (userId, amount) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("Usuario no encontrado");
  }
  if (user.coins < amount) {
    throw new Error("No tienes suficientes monedas");
  }
  user.coins -= amount;
  await user.save();
  await notificationService.createNotification(
    userId,
    "coins_deducted",
    `Has gastado ${amount} monedas.`,
    { amount }
  );
  return user.coins;
};
