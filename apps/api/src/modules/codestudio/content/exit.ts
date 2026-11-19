// La salida (Fase 3): qué hacer al llegar a Unicornio. Sin migraciones: la
// salida se guarda en CodeStudioCompany.metadata.exit y los premios únicos en
// CodeStudioMilestone (el @@unique impide cobrarlos dos veces).
//
// - Vender: la empresa queda congelada como trofeo (se ve, no simula ni
//   acepta acciones) y la próxima startup arranca con más caja.
// - Salir a bolsa (IPO): se sigue jugando; cada trimestre (90 días de juego)
//   hay que crecer un 10% o baja la reputación.
//
// Las coins solo se pagan la PRIMERA salida de cada tipo; las siguientes dan
// solo XP (así no se "farmea" creando empresas).

import { L } from './i18n/localized';

export type ExitType = 'sale' | 'ipo';

export type CompanyExit = {
  type: ExitType;
  at: string;
  /** Valuación al momento de salir. */
  valuation: number;
  /** IPO: valuación que hay que superar este trimestre y día en que empezó. */
  quarterBase?: number;
  quarterStartDay?: number;
  quartersWon?: number;
  quartersLost?: number;
};

export const EXIT_REWARDS: Record<ExitType, { xp: number; coins: number; repeatXp: number }> = {
  sale: { xp: 3000, coins: 40, repeatXp: 1200 },
  ipo: { xp: 2000, coins: 25, repeatXp: 800 },
};

// Fundador en serie: caja extra por cada empresa vendida (con tope).
export const SERIAL_FOUNDER_CASH = 3000;
export const SERIAL_FOUNDER_MAX_SALES = 5;

export const IPO_QUARTER_DAYS = 90;
export const IPO_QUARTER_GROWTH = 1.1;
export const IPO_QUARTER_XP = 300;
export const IPO_QUARTER_MISS_REPUTATION = 5;

export function exitOf(metadata: unknown): CompanyExit | null {
  const exit = (metadata as { exit?: CompanyExit } | null)?.exit;
  return exit && (exit.type === 'sale' || exit.type === 'ipo') ? exit : null;
}

export const isSold = (metadata: unknown) => exitOf(metadata)?.type === 'sale';

export function serialFounderBonus(sales: number) {
  return Math.min(SERIAL_FOUNDER_MAX_SALES, Math.max(0, sales)) * SERIAL_FOUNDER_CASH;
}

export const EXIT_MSG = {
  notReady: () => L('Solo una startup Unicornio puede venderse o salir a bolsa.', 'Only a Unicorn startup can be sold or go public.', 'Nur ein Einhorn-Startup kann verkauft werden oder an die Börse gehen.'),
  already: () => L('Esta startup ya tuvo su salida.', 'This startup already had its exit.', 'Dieses Startup hatte schon seinen Exit.'),
  sold: () => L('Vendiste esta startup: queda como trofeo y ya no se puede gestionar.', 'You sold this startup: it stays as a trophy and can no longer be managed.', 'Du hast dieses Startup verkauft: Es bleibt als Trophäe und lässt sich nicht mehr verwalten.'),
  saleTitle: (name: string) => L(`Vendiste ${name}`, `You sold ${name}`, `Du hast ${name} verkauft`),
  saleText: (bonus: number) =>
    L(
      `Una empresa grande compró tu startup. Tu próxima startup arranca con $${bonus.toLocaleString('es-CO')} extra por ser fundador en serie.`,
      `A big company bought your startup. Your next startup starts with $${bonus.toLocaleString('en-US')} extra as a serial founder.`,
      `Eine große Firma hat dein Startup gekauft. Dein nächstes Startup startet als Serien-Gründer mit $${bonus.toLocaleString('de-DE')} extra.`,
    ),
  ipoTitle: (name: string) => L(`${name} sale a bolsa`, `${name} goes public`, `${name} geht an die Börse`),
  ipoText: () =>
    L(
      'Tus acciones ya cotizan. Ahora cada trimestre los inversores esperan que crezcas al menos un 10%.',
      'Your shares are now trading. Every quarter investors expect you to grow at least 10%.',
      'Deine Aktien werden jetzt gehandelt. Jedes Quartal erwarten Investoren mindestens 10% Wachstum.',
    ),
  quarterWonTitle: () => L('Trimestre superado', 'Quarter beaten', 'Quartal geschafft'),
  quarterWonText: (growth: number) =>
    L(
      `Creciste un ${growth}% este trimestre y la acción subió. Los inversores están contentos.`,
      `You grew ${growth}% this quarter and the stock went up. Investors are happy.`,
      `Du bist dieses Quartal um ${growth}% gewachsen und die Aktie ist gestiegen. Die Investoren sind zufrieden.`,
    ),
  quarterLostTitle: () => L('Trimestre por debajo de lo esperado', 'Quarter below expectations', 'Quartal unter den Erwartungen'),
  quarterLostText: (growth: number) =>
    L(
      `Creciste un ${growth}% y esperaban 10%: la acción cayó y tu reputación bajó. Lanza funciones, mejora la satisfacción o crece en usuarios.`,
      `You grew ${growth}% and they expected 10%: the stock fell and your reputation dropped. Ship features, raise satisfaction or grow users.`,
      `Du bist um ${growth}% gewachsen, erwartet waren 10%: Die Aktie ist gefallen und dein Ruf gesunken. Bring Funktionen, steigere die Zufriedenheit oder gewinne Nutzer.`,
    ),
};
