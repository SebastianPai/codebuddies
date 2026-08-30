// Lógica PURA de la mascota (sin Prisma, sin Nest): decaimiento de stats,
// estado de ánimo y aplicación de acciones de cuidado. Todo esto tiene
// tests en pet.logic.spec.ts — es la parte que sí se puede verificar sin
// levantar el juego.

import {
  PET_ACTIONS,
  PET_DECAY_PER_HOUR,
  PET_ENERGY_RECOVERY_PER_HOUR,
  PET_HEALED_HEALTH_THRESHOLD,
  PET_HEALTH_DROP_PER_HOUR,
  PET_HEALTH_RECOVERY_PER_HOUR,
  PET_MAX_DECAY_HOURS,
  PET_NEGLECT_HAPPINESS_PENALTY_PER_HOUR,
  PET_NEGLECT_THRESHOLD,
  PET_SICK_HEALTH_THRESHOLD,
  PET_SLEEP_ENERGY_THRESHOLD,
  PET_STAT_MAX,
  PET_STAT_MIN,
  PET_WELL_FED_THRESHOLD,
  PetAction,
} from './pet.constants';

export type PetMood = 'HAPPY' | 'CONTENT' | 'SAD' | 'SICK' | 'SLEEPING';

export interface PetStats {
  hunger: number;
  thirst: number;
  happiness: number;
  energy: number;
  health: number;
  sick: boolean;
}

export interface PetTimestamps {
  lastTickAt: Date | string;
  lastFedAt: Date | string;
  lastWateredAt: Date | string;
  lastPlayedAt: Date | string;
}

export type PetState = PetStats & PetTimestamps;

const clampStat = (n: number): number =>
  Math.max(PET_STAT_MIN, Math.min(PET_STAT_MAX, Math.round(n)));

const hoursBetween = (from: Date | string, to: Date): number => {
  const ms = to.getTime() - new Date(from).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0; // reloj hacia atrás / mismo instante
  return Math.min(ms / 3_600_000, PET_MAX_DECAY_HOURS);
};

/**
 * Aplica el decaimiento acumulado desde `lastTickAt` hasta `now`. Devuelve
 * un estado nuevo (no muta) con `lastTickAt` avanzado. Si no pasó tiempo,
 * devuelve el mismo objeto tal cual.
 */
export function applyDecay<T extends PetState>(pet: T, now: Date = new Date()): T {
  const hours = hoursBetween(pet.lastTickAt, now);
  if (hours === 0) return pet;

  let hunger = pet.hunger - PET_DECAY_PER_HOUR.hunger * hours;
  let thirst = pet.thirst - PET_DECAY_PER_HOUR.thirst * hours;
  let happiness = pet.happiness - PET_DECAY_PER_HOUR.happiness * hours;

  const sleeping = pet.energy < PET_SLEEP_ENERGY_THRESHOLD;
  let energy = sleeping
    ? pet.energy + PET_ENERGY_RECOVERY_PER_HOUR * hours
    : pet.energy - PET_DECAY_PER_HOUR.energy * hours;

  const neglected =
    hunger < PET_NEGLECT_THRESHOLD || thirst < PET_NEGLECT_THRESHOLD;
  if (neglected) {
    happiness -= PET_NEGLECT_HAPPINESS_PENALTY_PER_HOUR * hours;
  }

  let health = pet.health;
  if (neglected) {
    health -= PET_HEALTH_DROP_PER_HOUR * hours;
  } else if (
    hunger > PET_WELL_FED_THRESHOLD &&
    thirst > PET_WELL_FED_THRESHOLD
  ) {
    health += PET_HEALTH_RECOVERY_PER_HOUR * hours;
  }

  hunger = clampStat(hunger);
  thirst = clampStat(thirst);
  happiness = clampStat(happiness);
  energy = clampStat(energy);
  health = clampStat(health);

  let sick = pet.sick;
  if (health < PET_SICK_HEALTH_THRESHOLD) sick = true;
  else if (health >= PET_HEALED_HEALTH_THRESHOLD) sick = false;

  return {
    ...pet,
    hunger,
    thirst,
    happiness,
    energy,
    health,
    sick,
    lastTickAt: now,
  };
}

/** Estado de ánimo derivado de los stats. Precedencia: enferma > dormida >
 *  triste > feliz > normal. */
export function deriveMood(pet: PetStats): PetMood {
  if (pet.sick) return 'SICK';
  if (pet.energy < PET_SLEEP_ENERGY_THRESHOLD) return 'SLEEPING';
  if (pet.happiness < 30 || pet.hunger < 25 || pet.thirst < 25) return 'SAD';
  if (pet.happiness >= 70 && pet.hunger >= 50 && pet.thirst >= 50) return 'HAPPY';
  return 'CONTENT';
}

const LAST_ACTION_FIELD: Record<PetAction, keyof PetTimestamps> = {
  feed: 'lastFedAt',
  water: 'lastWateredAt',
  play: 'lastPlayedAt',
};

/** ms que faltan para poder repetir `action` (0 = ya se puede). */
export function actionCooldownRemaining(
  pet: PetTimestamps,
  action: PetAction,
  now: Date = new Date(),
): number {
  const last = pet[LAST_ACTION_FIELD[action]];
  const elapsed = now.getTime() - new Date(last).getTime();
  return Math.max(0, PET_ACTIONS[action].cooldownMs - elapsed);
}

export class PetCooldownError extends Error {
  constructor(
    public readonly action: PetAction,
    public readonly remainingMs: number,
  ) {
    super(`cooldown:${action}`);
    this.name = 'PetCooldownError';
  }
}

/**
 * Aplica una acción de cuidado sobre un estado YA decaído. No muta. Lanza
 * PetCooldownError si todavía está en cooldown.
 */
export function applyAction<T extends PetState>(
  pet: T,
  action: PetAction,
  now: Date = new Date(),
): T {
  const remaining = actionCooldownRemaining(pet, action, now);
  if (remaining > 0) throw new PetCooldownError(action, remaining);

  const cfg = PET_ACTIONS[action];
  const next: T = { ...pet, [LAST_ACTION_FIELD[action]]: now };
  (next as PetStats)[cfg.stat] = clampStat(
    (pet as PetStats)[cfg.stat] + cfg.amount,
  );
  if (cfg.energyCost) {
    next.energy = clampStat(pet.energy - cfg.energyCost);
  }
  return next;
}
