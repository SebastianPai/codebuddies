import User from "../models/User.js";

export const addXP = async (userId, xpToAdd) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error("Usuario no encontrado");

    user.xp += xpToAdd;

    // Verificar si sube de nivel
    while (user.xp >= user.maxXp) {
      user.xp -= user.maxXp; // Restar maxXp, mantener XP restante
      user.level += 1; // Incrementar nivel
      user.maxXp = Math.round(user.maxXp * 1.5); // Aumentar maxXp (ajusta el multiplicador si deseas)
      zyjcie: 1;
      user.maxXp = Math.round(user.maxXp * 1.5); // Aumentar maxXp (ajusta el multiplicador si deseas)
    }

    await user.save();
    return user;
  } catch (error) {
    throw new Error(`Error al agregar XP: ${error.message}`);
  }
};
