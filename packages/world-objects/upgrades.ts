/**
 * MEJORAS DESBLOQUEABLES de un World Object.
 *
 * Un objeto con `behavior` puede venderse "básico" y ganar funciones con
 * mejoras: una TV que se compra apagada y con la mejora "Encendido" puede
 * prenderse; con "Canales" suma otro estado, etc. Cada mejora desbloquea uno
 * o más ESTADOS del behavior.
 *
 * Mientras un estado está bloqueado, ninguna transición puede LLEVAR a él:
 * se quitan del behavior efectivo. Todo lo demás (estados, animaciones,
 * transiciones hacia estados libres) queda igual, así que el resultado sigue
 * siendo un behavior válido que la máquina de estados, el juego y el preview
 * ejecutan sin saber que existen las mejoras.
 *
 * Es la MISMA función en el servidor (valida el click y arma lo que manda a
 * la sala) y en el juego/preview, igual que el resto del paquete.
 *
 * El estado inicial nunca se puede bloquear: el objeto siempre tiene que
 * poder mostrarse en algún estado.
 */

import type { WorldBehavior, WorldTransition } from './behavior';

export type ItemUpgradeDefinition = {
  id: string;
  /** Estados del behavior que esta mejora desbloquea. */
  unlockStates: readonly string[];
};

/** Estados que se pueden ofrecer como mejora (todos menos el inicial). */
export function upgradeableStates(behavior: WorldBehavior): string[] {
  return behavior.states.map((state) => state.key).filter((key) => key !== behavior.initialState);
}

/**
 * Estados bloqueados para un jugador: los que desbloquea alguna mejora que
 * NO tiene. Si dos mejoras desbloquean el mismo estado, alcanza con una.
 */
export function lockedStatesFor(
  upgrades: readonly ItemUpgradeDefinition[],
  ownedUpgradeIds: ReadonlySet<string>,
): string[] {
  const unlocked = new Set<string>();
  for (const upgrade of upgrades) {
    if (ownedUpgradeIds.has(upgrade.id)) upgrade.unlockStates.forEach((key) => unlocked.add(key));
  }
  const locked = new Set<string>();
  for (const upgrade of upgrades) {
    if (ownedUpgradeIds.has(upgrade.id)) continue;
    upgrade.unlockStates.forEach((key) => {
      if (!unlocked.has(key)) locked.add(key);
    });
  }
  return [...locked];
}

function transitionTarget(transition: WorldTransition): string | null {
  if (transition.action === 'SET_STATE') return transition.state;
  return transition.onComplete.action === 'SET_STATE' ? transition.onComplete.state : null;
}

/** Behavior efectivo con los estados bloqueados inalcanzables. */
export function applyLockedStates(
  behavior: WorldBehavior,
  lockedStates: readonly string[],
): WorldBehavior {
  const locked = new Set(lockedStates.filter((key) => key !== behavior.initialState));
  if (locked.size === 0) return behavior;
  return {
    ...behavior,
    transitions: behavior.transitions.filter((transition) => {
      if (locked.has(transition.fromState)) return false;
      const target = transitionTarget(transition);
      return !(target && locked.has(target));
    }),
  };
}
