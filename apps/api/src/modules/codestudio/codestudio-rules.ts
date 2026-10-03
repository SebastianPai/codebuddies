// Reglas puras de CodeStudio v2 compartidas por el servicio y los tests de
// balance: cotización de campañas (CAC), avance de etapas y rondas de
// inversión. Sin Prisma a propósito.

import { CHANNEL_BY_SLUG } from './content/economy';
import { FUNDING_ROUNDS, MAX_STAGE, STAGES, StageMetrics, goalMet } from './content/progression';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function ratingFactor(rating: number) {
  return clamp((rating - 1.5) / 2.5, 0.1, 1.4);
}

// Costo por usuario (CAC) de una campaña: el canal tiene un CAC base; lo
// abaratan el fit con tu tipo de app, un buen rating y la analítica/
// marketing; lo encarecen presupuestos grandes (rendimientos decrecientes)
// y repetir el mismo canal seguido (fatiga de la audiencia).
export function campaignQuote(input: {
  channelSlug: string;
  multiplier: number;
  rating: number;
  fit: number;
  cacDiscount: number;
  recentRuns: number;
  // usuarios / tamaño del mercado: cuanto más saturado, más caro conseguir
  // al siguiente usuario.
  penetration: number;
}) {
  const channel = CHANNEL_BY_SLUG.get(input.channelSlug);
  if (!channel) return null;
  const cost = channel.baseCost * input.multiplier;
  const cac =
    (channel.baseCac / Math.max(0.2, input.fit) / ratingFactor(input.rating)) *
    (1 - clamp(input.cacDiscount, 0, 0.5)) *
    (1 + 0.15 * Math.log2(Math.max(1, input.multiplier))) *
    (1 + 0.35 * Math.max(0, input.recentRuns)) *
    (1 + 4 * clamp(input.penetration, 0, 1));
  return { cost, cac, users: Math.max(1, Math.round(cost / cac)) };
}

// Devuelve la etapa a la que llega la empresa: puede saltar varias si ya
// cumple varias metas a la vez. Nunca retrocede.
export function evaluateStage(current: number, metrics: StageMetrics) {
  let stage = current;
  while (stage < MAX_STAGE) {
    const definition = STAGES[stage];
    if (!definition.goals.every((goal) => goalMet(goal, metrics))) break;
    stage++;
  }
  return stage;
}

export function stageProgress(stage: number, metrics: StageMetrics) {
  const definition = STAGES[Math.min(stage, MAX_STAGE)];
  return definition.goals.map((goal) => ({
    key: goal.key,
    label: goal.label,
    current: goal.current(metrics),
    target: goal.target,
    kind: goal.kind ?? 'max',
    format: goal.format ?? 'users',
    met: goalMet(goal, metrics),
  }));
}

export function fundingOffer(roundIndex: number, valuation: number) {
  const round = FUNDING_ROUNDS[roundIndex];
  if (!round) return null;
  const raise = Math.max(round.minRaise, Math.round((valuation * round.equity) / 100));
  return { ...round, raise };
}
