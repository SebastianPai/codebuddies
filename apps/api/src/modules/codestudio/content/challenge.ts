// Reto de la semana (Fase 3): todos empiezan IGUAL (mismo tipo de app y la
// misma caja, sin bonos de nivel, ventas ni invitaciones) y gana quien decide
// mejor. La empresa del reto se marca en metadata.challenge = "<año>-W<semana>"
// (sin migración) y no ocupa lugar entre las empresas normales.

import { dailyKey } from './daily';

export const CHALLENGE_STARTING_CASH = 6000;

// Semana ISO (lunes a domingo) del día de juego (mismo corte que las diarias).
export function weekKey(now = Date.now()) {
  const day = new Date(`${dailyKey(now)}T00:00:00Z`);
  const weekday = (day.getUTCDay() + 6) % 7; // 0 = lunes
  const thursday = new Date(day);
  thursday.setUTCDate(day.getUTCDate() - weekday + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((thursday.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Minutos hasta el próximo lunes (corte del reto).
export function challengeEndsInMinutes(now = Date.now()) {
  const day = new Date(`${dailyKey(now)}T00:00:00Z`);
  const weekday = (day.getUTCDay() + 6) % 7;
  const nextMonday = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + (7 - weekday)) + 5 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((nextMonday - now) / 60000));
}

// Tipo de app de la semana: rota entre los que se pueden fundar desde nivel 1.
export function challengeAppSlug(week: string, slugs: string[]) {
  if (slugs.length === 0) return null;
  const number = Number(week.split('-W')[1] ?? 0) + Number(week.slice(0, 4)) * 53;
  return [...slugs].sort()[number % slugs.length];
}

export const challengeOf = (metadata: unknown) => {
  const value = (metadata as { challenge?: unknown } | null)?.challenge;
  return typeof value === 'string' ? value : null;
};
