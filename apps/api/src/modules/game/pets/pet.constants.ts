// Fuente única de verdad de los números de la mascota. Todo lo que decide
// el balance vive acá para poder tunearlo sin tocar la lógica ni la BD.
// Los stats van de 0 a 100 y decaen con el TIEMPO REAL (no por ticks de
// juego): el decaimiento se calcula de forma perezosa en cada lectura.

export const PET_STAT_MIN = 0;
export const PET_STAT_MAX = 100;

// Decaimiento por hora de tiempo real.
export const PET_DECAY_PER_HOUR = {
  hunger: 8,
  thirst: 10,
  happiness: 4,
  energy: 6,
} as const;

// Por debajo de este nivel de energía la mascota "duerme" y en vez de
// gastar energía la RECUPERA.
export const PET_SLEEP_ENERGY_THRESHOLD = 25;
export const PET_ENERGY_RECOVERY_PER_HOUR = 12;

// Hambre o sed por debajo de esto = "descuidada": pega extra a felicidad y
// hace bajar la salud.
export const PET_NEGLECT_THRESHOLD = 25;
export const PET_NEGLECT_HAPPINESS_PENALTY_PER_HOUR = 6;

// Salud: baja si está descuidada, se recupera si está bien cuidada.
export const PET_HEALTH_DROP_PER_HOUR = 10;
export const PET_HEALTH_RECOVERY_PER_HOUR = 4;
export const PET_WELL_FED_THRESHOLD = 50; // hambre y sed por encima => recupera salud
export const PET_SICK_HEALTH_THRESHOLD = 30; // salud por debajo => se enferma
export const PET_HEALED_HEALTH_THRESHOLD = 55; // salud por encima => se cura sola

// Tope de tiempo que se procesa de una sola vez. Si alguien vuelve después
// de una semana, la mascota no aparece "muerta de hambre" de golpe: como
// mucho se le procesan 3 días.
export const PET_MAX_DECAY_HOURS = 72;

// Acciones de cuidado: qué stat suben, cuánto, y cada cuánto se pueden
// repetir (anti-spam, no una penalización real).
export const PET_ACTIONS = {
  feed: { stat: 'hunger', amount: 40, cooldownMs: 60_000, energyCost: 0 },
  water: { stat: 'thirst', amount: 45, cooldownMs: 60_000, energyCost: 0 },
  play: { stat: 'happiness', amount: 30, cooldownMs: 60_000, energyCost: 12 },
} as const;

export type PetAction = keyof typeof PET_ACTIONS;

// Curar: sin cooldown, pero solo si está enferma. En el MVP es gratis;
// más adelante puede costar un item "medicina" o coins.
export const PET_CURE_HEALTH = PET_HEALED_HEALTH_THRESHOLD + 10;

// Especies válidas -> clave de spritesheet que resuelve el cliente.
export const PET_SPECIES = ['cat', 'dog', 'bird', 'rabbit', 'slime'] as const;
export type PetSpecies = (typeof PET_SPECIES)[number];
export const DEFAULT_PET_SPECIES: PetSpecies = 'cat';

export function normalizePetSpecies(value: unknown): PetSpecies {
  return (PET_SPECIES as readonly string[]).includes(String(value))
    ? (value as PetSpecies)
    : DEFAULT_PET_SPECIES;
}
