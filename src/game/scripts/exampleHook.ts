import { GameAction, PlayerState } from '@game/core';

// Hook ejemplo: cada vez que un jugador se mueve, recibe +1 xp
export function xpOnMoveHook(action: GameAction) {
  if (action.type !== 'MOVE') return;

  // Aquí simulamos un sistema de XP
  const player = globalThis['players']?.get(action.entityId) as
    | PlayerState
    | undefined;
  if (!player) return;

  if (!('xp' in player)) (player as any).xp = 0;
  (player as any).xp += 1;

  console.log(
    `[HOOK] Player ${player.id} ahora tiene ${(player as any).xp} XP`,
  );
}
