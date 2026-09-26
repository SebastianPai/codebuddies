// Misiones diarias de CodeStudio: 3 por día y por usuario (fácil, media,
// difícil), elegidas de forma determinista a partir del usuario y la fecha
// para que no cambien al recargar. Se reinician a medianoche de Colombia.
// Pagan poco a propósito (la economía de coins de la plataforma sigue
// dominada por las lecciones): son un motivo para volver cada día.

import { L, Localized } from './i18n/localized';

export type DailyCounter = 'features' | 'bugs' | 'hires' | 'campaigns' | 'decisions' | 'newUsers' | 'revenue' | 'days' | 'stages';

export type DailyMission = {
  key: string;
  counter: DailyCounter;
  target: number;
  xp: number;
  coins: number;
  label: (target: number) => Localized;
};

const n = (value: number) => value.toLocaleString('es-CO');

export const DAILY_MISSIONS: Record<'easy' | 'medium' | 'hard', DailyMission[]> = {
  easy: [
    { key: 'ship-2', counter: 'features', target: 2, xp: 25, coins: 2, label: (t) => L(`Publica ${t} features`, `Ship ${t} features`, `Veröffentliche ${t} Features`) },
    { key: 'hire-1', counter: 'hires', target: 1, xp: 15, coins: 1, label: () => L('Contrata a alguien', 'Hire someone', 'Stell jemanden ein') },
    { key: 'campaign-2', counter: 'campaigns', target: 2, xp: 20, coins: 2, label: (t) => L(`Lanza ${t} campañas`, `Launch ${t} campaigns`, `Starte ${t} Kampagnen`) },
    { key: 'decide-1', counter: 'decisions', target: 1, xp: 20, coins: 2, label: () => L('Toma una decisión de mercado', 'Make a market decision', 'Triff eine Marktentscheidung') },
    { key: 'play-15', counter: 'days', target: 15, xp: 25, coins: 2, label: (t) => L(`Mantén tu startup ${t} días`, `Run your startup for ${t} days`, `Führe dein Startup ${t} Tage lang`) },
  ],
  medium: [
    { key: 'diagnose-1', counter: 'bugs', target: 1, xp: 35, coins: 3, label: () => L('Diagnostica un bug tú mismo', 'Diagnose a bug yourself', 'Diagnostiziere selbst einen Bug') },
    { key: 'users-200', counter: 'newUsers', target: 200, xp: 40, coins: 3, label: (t) => L(`Consigue ${n(t)} usuarios nuevos`, `Get ${n(t)} new users`, `Gewinne ${n(t)} neue Nutzer`) },
    { key: 'revenue-500', counter: 'revenue', target: 500, xp: 40, coins: 3, label: (t) => L(`Factura $${n(t)}`, `Earn $${n(t)} in revenue`, `Erziele $${n(t)} Umsatz`) },
    { key: 'ship-4', counter: 'features', target: 4, xp: 50, coins: 4, label: (t) => L(`Publica ${t} features`, `Ship ${t} features`, `Veröffentliche ${t} Features`) },
    { key: 'play-40', counter: 'days', target: 40, xp: 50, coins: 4, label: (t) => L(`Mantén tu startup ${t} días`, `Run your startup for ${t} days`, `Führe dein Startup ${t} Tage lang`) },
  ],
  hard: [
    { key: 'diagnose-3', counter: 'bugs', target: 3, xp: 80, coins: 6, label: (t) => L(`Diagnostica ${t} bugs tú mismo`, `Diagnose ${t} bugs yourself`, `Diagnostiziere selbst ${t} Bugs`) },
    { key: 'stage-1', counter: 'stages', target: 1, xp: 80, coins: 6, label: () => L('Sube una etapa', 'Reach a new stage', 'Erreiche eine neue Stufe') },
    { key: 'users-1000', counter: 'newUsers', target: 1000, xp: 80, coins: 6, label: (t) => L(`Consigue ${n(t)} usuarios nuevos`, `Get ${n(t)} new users`, `Gewinne ${n(t)} neue Nutzer`) },
    { key: 'revenue-3000', counter: 'revenue', target: 3000, xp: 80, coins: 6, label: (t) => L(`Factura $${n(t)}`, `Earn $${n(t)} in revenue`, `Erziele $${n(t)} Umsatz`) },
  ],
};

export const DAILY_BONUS = { xp: 50, coins: 5 };

// Fecha "de hoy" en Colombia (UTC-5, sin horario de verano).
export function dailyKey(now = Date.now()) {
  return new Date(now - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function minutesUntilReset(now = Date.now()) {
  const local = new Date(now - 5 * 60 * 60 * 1000);
  const next = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1) + 5 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((next - now) / 60000));
}

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Solo depende del usuario y la fecha: las misiones no cambian en mitad del
// día aunque subas de nivel.
export function missionsFor(userId: string, day: string): DailyMission[] {
  const pools = [DAILY_MISSIONS.easy, DAILY_MISSIONS.medium, DAILY_MISSIONS.hard];
  return pools.map((pool, tier) => pool[hash(`${userId}:${day}:${tier}`) % pool.length]);
}

export const dailyMilestoneKey = (day: string, missionKey: string) => `daily:${day}:${missionKey}`;
