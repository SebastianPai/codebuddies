import { GameAction, PlayerState } from '@game/core';
import { moveXPChallenge } from './challenges/moveXPChallenge';
import { GameChallengesService } from '../modules/game/game-challenges.service';
import { PrismaService } from '../prisma/prisma.service';
import { RewardService } from '../modules/game/reward/reward.service';

// Creamos los servicios (singleton)
const prisma = new PrismaService();
const rewardService = new RewardService();
const challengesService = new GameChallengesService(prisma, rewardService);

class GameDispatcher {
  private beforeHooks: ((action: GameAction) => void)[] = [];
  private afterHooks: ((action: GameAction) => void)[] = [];

  async dispatch(action: GameAction) {
    // 🔹 antes de aplicar acción
    this.beforeHooks.forEach((fn) => fn(action));

    // 🔹 después de acción → aplicamos retos activos
    const activeChallenges = [moveXPChallenge];
    for (const challenge of activeChallenges) {
      if (!challenge.active) continue;

      const player: PlayerState = globalThis['players']?.get(action.entityId);
      if (!player) continue;

      // 🚀 Ejecutamos challenge (script) con servicio de challenges
      await challenge.script(player, challengesService);
    }

    // 🔹 después de aplicar acción
    this.afterHooks.forEach((fn) => fn(action));
  }

  addBeforeHook(fn: (action: GameAction) => void) {
    this.beforeHooks.push(fn);
  }

  addAfterHook(fn: (action: GameAction) => void) {
    this.afterHooks.push(fn);
  }
}

// 🔹 Exportamos instancia única
export const dispatch = new GameDispatcher();

// 🔥 AFTER HOOK GLOBAL (eventos del juego)
dispatch.addAfterHook(async (action) => {
  if (action.type === 'MOVE') {
    // ⚡ trigger ligero (NO DB pesada aquí)
    // Ejemplo: podrías marcar actividad del jugador
    // Ejemplo futuro:
    // globalThis.lastPlayerActivity[action.entityId] = Date.now();
    // 🔥 IMPORTANTE:
    // NO llamar simulación aquí
    // NO hacer loops
    // NO hacer queries pesadas
  }
});
