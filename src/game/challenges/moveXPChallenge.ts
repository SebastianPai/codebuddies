import { PlayerState } from '@game/core';
import { GameChallengesService } from '../../modules/game/game-challenges.service';

// Challenge de movimiento
export const moveXPChallenge = {
  id: 'move_xp_001',
  name: 'Moverse para ganar XP',
  description: 'Gana XP cada vez que te mueves',
  active: true,

  // Se ejecuta cada vez que el jugador hace una acción
  script: async (
    playerState: PlayerState,
    challengesService: GameChallengesService,
  ) => {
    if (!playerState.id) return;

    const xpAmount = 1; // XP por movimiento
    const coinAmount = 0; // Cambia si quieres coins por movimiento

    // 1️⃣ Actualizamos XP y nivel en la DB
    await challengesService.addXP(playerState.id, xpAmount, 'Movimiento');

    // 2️⃣ Actualizamos coins si corresponde
    if (coinAmount > 0) {
      await challengesService.addCoins(
        playerState.id,
        coinAmount,
        'Movimiento',
      );
    }

    // 3️⃣ Solo para log: obtenemos el usuario actualizado de Prisma
    const updatedPlayer = await challengesService['prisma'].user.findUnique({
      where: { id: playerState.id },
    });

    console.log(
      `[Challenge] Player ${playerState.id} ahora tiene ${updatedPlayer?.experience} XP, nivel ${updatedPlayer?.level}, coins ${updatedPlayer?.coins}`,
    );
  },
};
