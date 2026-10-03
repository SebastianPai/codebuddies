// Rasgos y rendimiento de los empleados de CodeStudio.
//
// Cada persona tiene un rasgo que cambia cuánto construye y cuántos bugs
// mete al publicar, y lleva sus propias estadísticas (features publicadas,
// bugs arreglados, bugs causados). Con eso las decisiones del equipo tienen
// motivo: a la "Estrella" le subes el sueldo; al "Descuidado" que causa
// bugs, mejor dejarlo ir cuando otra empresa lo quiere.

import { L, Localized } from './i18n/localized';

export type TraitKey = 'star' | 'mentor' | 'steady' | 'sloppy' | 'slow' | 'unmotivated';

export type Trait = {
  key: TraitKey;
  /** Probabilidad relativa al contratar. */
  weight: number;
  /** Multiplica lo que la persona construye. */
  power: number;
  /** Multiplica el riesgo de bug cuando el equipo publica. */
  bugRisk: number;
  /** Puntos de rendimiento base (0-100 al sumarle estadísticas). */
  score: number;
  tone: 'good' | 'neutral' | 'bad';
  name: Localized;
  description: Localized;
};

export const TRAITS: Record<TraitKey, Trait> = {
  star: {
    key: 'star', weight: 12, power: 1.3, bugRisk: 0.7, score: 25, tone: 'good',
    name: L('Estrella', 'Star', 'Star'),
    description: L('Construye 30% más rápido y con menos bugs.', 'Builds 30% faster and with fewer bugs.', 'Baut 30% schneller und mit weniger Bugs.'),
  },
  mentor: {
    key: 'mentor', weight: 10, power: 1.05, bugRisk: 0.9, score: 15, tone: 'good',
    name: L('Mentor', 'Mentor', 'Mentor'),
    description: L('Enseña al resto: todo el equipo construye 5% más rápido.', 'Teaches the rest: the whole team builds 5% faster.', 'Bringt den anderen etwas bei: Das ganze Team baut 5% schneller.'),
  },
  steady: {
    key: 'steady', weight: 46, power: 1, bugRisk: 1, score: 0, tone: 'neutral',
    name: L('Constante', 'Steady', 'Beständig'),
    description: L('Rinde lo esperado para su rol, sin sorpresas.', 'Performs as expected for the role, no surprises.', 'Leistet, was die Rolle verlangt, ohne Überraschungen.'),
  },
  sloppy: {
    key: 'sloppy', weight: 12, power: 1.05, bugRisk: 1.8, score: -15, tone: 'bad',
    name: L('Descuidado', 'Sloppy', 'Schlampig'),
    description: L('Va rápido pero sin probar: lo que publica trae casi el doble de bugs.', 'Goes fast but skips testing: what they ship brings almost twice the bugs.', 'Schnell, aber ohne Tests: Was die Person veröffentlicht, bringt fast doppelt so viele Bugs.'),
  },
  slow: {
    key: 'slow', weight: 10, power: 0.7, bugRisk: 1, score: -20, tone: 'bad',
    name: L('Lento', 'Slow', 'Langsam'),
    description: L('Construye 30% menos que alguien normal en su rol.', 'Builds 30% less than a typical person in the role.', 'Baut 30% weniger als üblich für die Rolle.'),
  },
  unmotivated: {
    key: 'unmotivated', weight: 10, power: 0.8, bugRisk: 1.2, score: -15, tone: 'bad',
    name: L('Desmotivado', 'Unmotivated', 'Unmotiviert'),
    description: L('Hace lo mínimo: rinde 20% menos y se le escapan más bugs.', 'Does the bare minimum: 20% less output and more bugs slip through.', 'Macht das Nötigste: 20% weniger Leistung und mehr Bugs rutschen durch.'),
  },
};

const TRAIT_LIST = Object.values(TRAITS);

/** Rasgo aleatorio al contratar. */
export function rollTrait(rng: () => number = Math.random): TraitKey {
  const total = TRAIT_LIST.reduce((sum, trait) => sum + trait.weight, 0);
  let roll = rng() * total;
  for (const trait of TRAIT_LIST) {
    roll -= trait.weight;
    if (roll <= 0) return trait.key;
  }
  return 'steady';
}

// Empleados contratados antes de que existieran los rasgos: se les asigna
// uno fijo a partir de su id (siempre el mismo, sin migrar datos).
function hashToUnit(id: string) {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

export type EmployeeStats = { featuresShipped: number; bugsFixed: number; bugsCaused: number };
export type EmployeeMeta = { trait?: TraitKey; stats?: Partial<EmployeeStats> } & Record<string, unknown>;

export function readMeta(metadata: unknown): EmployeeMeta {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? (metadata as EmployeeMeta) : {};
}

export function traitOf(employee: { id: string; metadata: unknown }): Trait {
  const key = readMeta(employee.metadata).trait;
  if (key && TRAITS[key]) return TRAITS[key];
  return TRAITS[rollTrait(() => hashToUnit(employee.id))];
}

export function statsOf(employee: { metadata: unknown }): EmployeeStats {
  const stats = readMeta(employee.metadata).stats ?? {};
  return { featuresShipped: stats.featuresShipped ?? 0, bugsFixed: stats.bugsFixed ?? 0, bugsCaused: stats.bugsCaused ?? 0 };
}

/**
 * Rendimiento 0-100: el rasgo pesa, y lo que la persona hizo de verdad
 * (features y bugs arreglados suman, bugs causados restan) lo ajusta.
 */
export function performanceOf(employee: { id: string; metadata: unknown; quality: number }) {
  const trait = traitOf(employee);
  const stats = statsOf(employee);
  const score =
    55 +
    trait.score +
    Math.min(15, stats.featuresShipped * 1.5) +
    Math.min(15, stats.bugsFixed * 3) -
    Math.min(30, stats.bugsCaused * 6) +
    (employee.quality - 1) * 30;
  return Math.round(Math.max(5, Math.min(99, score)));
}

/** Metadata nuevo con las estadísticas sumadas (sin perder el resto). */
export function bumpStats(metadata: unknown, delta: Partial<EmployeeStats>, trait?: TraitKey): EmployeeMeta {
  const meta = readMeta(metadata);
  const stats = statsOf({ metadata });
  return {
    ...meta,
    ...(trait && !meta.trait ? { trait } : {}),
    stats: {
      featuresShipped: stats.featuresShipped + (delta.featuresShipped ?? 0),
      bugsFixed: stats.bugsFixed + (delta.bugsFixed ?? 0),
      bugsCaused: stats.bugsCaused + (delta.bugsCaused ?? 0),
    },
  };
}
