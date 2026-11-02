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

/**
 * Qué mueble falta para armar más puestos (el que menos hay entre escritorio,
 * silla y PC), solo si hay gente sin puesto. Así se quejan de lo que de
 * verdad falta: "hay computadores pero no sillas".
 */
export type MissingPiece = 'desk' | 'chair' | 'pc';
export function missingPiece(counts: OfficeCounts | null, employees: number): MissingPiece | null {
  if (!counts) return null;
  const stations = Math.min(counts.desk, counts.chair, counts.pc);
  if (stations >= employees) return null;
  const order: MissingPiece[] = ['chair', 'desk', 'pc'];
  return order.reduce((least, piece) => (counts[piece] < counts[least] ? piece : least), order[0]);
}

/** 1000 → "1.000" (es/de) o "1,000" (en), sin depender del ICU de Node. */
export function thousands(value: number, separator: string) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/** Récords de usuarios que se festejan (solo un rato después de pasarlos). */
export const USER_MILESTONES = [100, 1000, 10_000, 100_000, 1_000_000];
export function crossedMilestone(before: number, after: number): number | null {
  const crossed = USER_MILESTONES.filter((value) => before < value && after >= value);
  return crossed.length ? crossed[crossed.length - 1] : null;
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
  if (ratio <= 2.5) return 40;
  if (ratio <= 5) return 100;
  return 200;
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
  /** Mueble que falta para que todos tengan puesto (null = no falta nada). */
  missing?: MissingPiece | null;
  /** Récord de usuarios pasado hace poco (null = nada que festejar). */
  recentMilestone?: number | null;
  /** Comodidades que tiene la oficina (snacks, water, coffee). */
  amenities?: string[];
  hasOffice?: boolean;
};

const MISSING_LINES: Record<MissingPiece, Localized> = {
  chair: L('Hay computadores pero no sillas... ¿trabajamos de pie?', 'There are computers but no chairs... do we work standing up?', 'Es gibt Computer, aber keine Stühle... arbeiten wir im Stehen?'),
  desk: L('Tengo silla y computador, pero ningún escritorio donde ponerlo.', "I've got a chair and a computer, but no desk to put it on.", 'Ich habe Stuhl und Computer, aber keinen Schreibtisch dafür.'),
  pc: L('Tengo escritorio y silla... pero sin computador no puedo programar.', "I've got a desk and a chair... but I can't code without a computer.", 'Ich habe Schreibtisch und Stuhl... aber ohne Computer kann ich nicht programmieren.'),
};

/** Queja de quien no tiene puesto, diciendo qué falta. */
export function unseatedLine(missing: MissingPiece | null | undefined): Localized {
  return missing ? MISSING_LINES[missing] : L('No tengo escritorio... así no se puede trabajar.', "I don't have a desk... I can't work like this.", 'Ich habe keinen Schreibtisch... so kann ich nicht arbeiten.');
}

/** Frases según cómo va la empresa: celebraciones y consejos. */
export function officeLines(ctx: OfficeContext): Localized[] {
  const lines: Localized[] = [];
  // Los récords se festejan solo cuando se acaban de pasar (antes decían
  // "¡pasamos los 1.000!" para siempre).
  if (ctx.recentMilestone) {
    const dots = thousands(ctx.recentMilestone, '.');
    lines.push(L(`¡Acabamos de pasar los ${dots} usuarios!`, `We just passed ${thousands(ctx.recentMilestone, ',')} users!`, `Wir haben gerade ${dots} Nutzer geknackt!`));
  }
  if (ctx.stageName) lines.push(L(`¡Por fin llegamos a ${ctx.stageName}!`, `We finally made it to ${ctx.stageName}!`, `Endlich sind wir bei ${ctx.stageName}!`));
  if (ctx.fundingRaised) lines.push(L('¡Por fin invirtieron en nosotros!', 'They finally invested in us!', 'Endlich hat jemand in uns investiert!'));
  if (ctx.openBugs >= 3) lines.push(L('Hay muchos bugs abiertos... alguien debería revisarlos.', "There are lots of open bugs... someone should look at them.", 'Es gibt viele offene Bugs... jemand sollte sie anschauen.'));
  if (ctx.queued > 0) lines.push(L('Si contrataran a otro no tendríamos tanto trabajo.', "If they hired someone else we wouldn't have so much work.", 'Wenn sie noch jemanden einstellen würden, hätten wir nicht so viel Arbeit.'));
  if (ctx.utilization > 0.9) lines.push(L('El servidor ya no da más, necesitamos mejor infraestructura.', "The server can't take it anymore, we need better infrastructure.", 'Der Server packt das nicht mehr, wir brauchen bessere Infrastruktur.'));
  if (ctx.campaigns === 0 && ctx.activeUsers < 200) lines.push(L('Deberíamos probar una campaña en TikTok o con un influencer.', 'We should try a TikTok campaign or an influencer.', 'Wir sollten eine TikTok-Kampagne oder einen Influencer probieren.'));
  if (ctx.cash < ctx.dailyCosts * 5) lines.push(L('¿Nos van a pagar este mes?', 'Are we getting paid this month?', 'Werden wir diesen Monat bezahlt?'));
  if (ctx.unseated > 0) lines.push(unseatedLine(ctx.missing));
  // Recomendaciones de la oficina: lo que de verdad ayudaría.
  if (ctx.hasOffice && ctx.amenities) {
    if (!ctx.amenities.includes('coffee')) lines.push(L('Una cafetera nos subiría el ánimo a todos.', 'A coffee machine would cheer everyone up.', 'Eine Kaffeemaschine würde uns alle aufmuntern.'));
    else if (!ctx.amenities.includes('water')) lines.push(L('Con un dispensador de agua trabajaríamos mejor.', "A water cooler would help us work better.", 'Mit einem Wasserspender würden wir besser arbeiten.'));
    else if (!ctx.amenities.includes('snacks')) lines.push(L('¿Y si ponemos unos snacks para la tarde?', 'What about some snacks for the afternoon?', 'Wie wäre es mit Snacks für den Nachmittag?'));
  }
  if (lines.length === 0) lines.push(L('Hoy el código compila a la primera.', 'The code compiled on the first try today.', 'Heute kompiliert der Code beim ersten Versuch.'));
  return lines;
}
