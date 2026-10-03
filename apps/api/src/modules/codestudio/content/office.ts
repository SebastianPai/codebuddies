// La oficina de una empresa de CodeStudio: una sala del juego donde
// trabajan sus empleados.
//
// - Cada puesto de trabajo = escritorio + silla + PC (muebles marcados con
//   los tags de abajo desde /admin/items). Quien no tiene puesto rinde 15%
//   menos y se queja.
// - Comodidades (snacks, agua, café): cada tipo distinto suma 5% de
//   motivación al equipo, hasta 15%.
// - Sin oficina el equipo trabaja desde casa: ni castigo ni bonus. Así la
//   oficina suma, pero nunca bloquea el avance.

import { L, Localized } from './i18n/localized';

export const OFFICE_TAGS = {
  desk: 'office:desk',
  chair: 'office:chair',
  pc: 'office:pc',
  snacks: 'office:snacks',
  water: 'office:water',
  coffee: 'office:coffee',
  /** Muebles del kit básico gratis (además del tag de su función). */
  basic: 'office:basic',
} as const;

export const UNSEATED_FACTOR = 0.85;
export const AMENITY_BONUS = 0.05;
export const AMENITY_KINDS = ['snacks', 'water', 'coffee'] as const;

export type OfficeCounts = { desk: number; chair: number; pc: number; snacks: number; water: number; coffee: number };

export function countOffice(tagsPerItem: string[][]): OfficeCounts {
  const counts: OfficeCounts = { desk: 0, chair: 0, pc: 0, snacks: 0, water: 0, coffee: 0 };
  for (const tags of tagsPerItem) {
    for (const key of Object.keys(counts) as Array<keyof OfficeCounts>) {
      if (tags.includes(OFFICE_TAGS[key])) counts[key]++;
    }
  }
  return counts;
}

export function officeSummary(counts: OfficeCounts | null, employees: number) {
  if (!counts) {
    return { hasOffice: false, stations: 0, seated: employees, unseated: 0, amenities: [] as string[], bonus: 0 };
  }
  const stations = Math.min(counts.desk, counts.chair, counts.pc);
  const amenities = AMENITY_KINDS.filter((kind) => counts[kind] > 0);
  return {
    hasOffice: true,
    stations,
    seated: Math.min(stations, employees),
    unseated: Math.max(0, employees - stations),
    amenities: amenities as string[],
    bonus: Math.min(0.15, amenities.length * AMENITY_BONUS),
  };
}

/**
 * Multiplicador de productividad de cada empleado en la oficina: los
 * primeros `seated` (los de mejor rendimiento) tienen puesto.
 */
export function officeFactors(summary: ReturnType<typeof officeSummary>, employeeIdsByPerformance: string[]) {
  const factors = new Map<string, number>();
  if (!summary.hasOffice) return factors;
  employeeIdsByPerformance.forEach((id, index) => {
    const seated = index < summary.stations;
    factors.set(id, (seated ? 1 : UNSEATED_FACTOR) * (1 + summary.bonus));
  });
  return factors;
}

// ─── Precio de las oficinas por tamaño de mapa ──────────────────────────

/** La más chica es gratis; las grandes cuestan monedas del juego (no el dinero de la empresa). */
export function officePrice(area: number, smallestArea: number) {
  const ratio = area / Math.max(1, smallestArea);
  if (ratio <= 1.2) return 0;
  if (ratio <= 2.5) return 400;
  if (ratio <= 5) return 1000;
  return 2000;
}

// ─── Lo que dicen los empleados ──────────────────────────────────────────

export type OfficeContext = {
  activeUsers: number;
  openBugs: number;
  queued: number;
  maxParallel: number;
  utilization: number;
  campaigns: number;
  cash: number;
  dailyCosts: number;
  stageName: string | null;
  fundingRaised: boolean;
  unseated: number;
};

/** Frases según cómo va la empresa: celebraciones y consejos. */
export function officeLines(ctx: OfficeContext): Localized[] {
  const lines: Localized[] = [];
  if (ctx.activeUsers >= 1000) lines.push(L('¡Ya pasamos los 1.000 usuarios!', "We passed 1,000 users!", 'Wir haben 1.000 Nutzer geknackt!'));
  else if (ctx.activeUsers >= 100) lines.push(L('¡Ya tenemos más de 100 usuarios!', 'We already have over 100 users!', 'Wir haben schon über 100 Nutzer!'));
  if (ctx.stageName) lines.push(L(`¡Por fin llegamos a ${ctx.stageName}!`, `We finally made it to ${ctx.stageName}!`, `Endlich sind wir bei ${ctx.stageName}!`));
  if (ctx.fundingRaised) lines.push(L('¡Por fin invirtieron en nosotros!', 'They finally invested in us!', 'Endlich hat jemand in uns investiert!'));
  if (ctx.openBugs >= 3) lines.push(L('Hay muchos bugs abiertos... alguien debería revisarlos.', "There are lots of open bugs... someone should look at them.", 'Es gibt viele offene Bugs... jemand sollte sie anschauen.'));
  if (ctx.queued > 0) lines.push(L('Si contrataran a otro no tendríamos tanto trabajo.', "If they hired someone else we wouldn't have so much work.", 'Wenn sie noch jemanden einstellen würden, hätten wir nicht so viel Arbeit.'));
  if (ctx.utilization > 0.9) lines.push(L('El servidor ya no da más, necesitamos mejor infraestructura.', "The server can't take it anymore, we need better infrastructure.", 'Der Server packt das nicht mehr, wir brauchen bessere Infrastruktur.'));
  if (ctx.campaigns === 0 && ctx.activeUsers < 200) lines.push(L('Deberíamos probar una campaña en TikTok o con un influencer.', 'We should try a TikTok campaign or an influencer.', 'Wir sollten eine TikTok-Kampagne oder einen Influencer probieren.'));
  if (ctx.cash < ctx.dailyCosts * 5) lines.push(L('¿Nos van a pagar este mes?', 'Are we getting paid this month?', 'Werden wir diesen Monat bezahlt?'));
  if (ctx.unseated > 0) lines.push(L('No tengo escritorio... así no se puede trabajar.', "I don't have a desk... I can't work like this.", 'Ich habe keinen Schreibtisch... so kann ich nicht arbeiten.'));
  if (lines.length === 0) lines.push(L('Hoy el código compila a la primera.', 'The code compiled on the first try today.', 'Heute kompiliert der Code beim ersten Versuch.'));
  return lines;
}
