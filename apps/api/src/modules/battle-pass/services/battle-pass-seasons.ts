// Calendario de temporadas mensuales del pase. El "día" del pase se corta a
// medianoche de Colombia (UTC-5, sin horario de verano) — mismo criterio que
// todayKey() en battle-pass.service.ts.
const COLOMBIA_OFFSET_HOURS = 5;

const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

// Días del mes (28, 29, 30 o 31): una temporada mensual tiene exactamente
// un día de premios por cada día del mes, así febrero no queda con días
// imposibles de alcanzar y los meses de 31 días tienen su día 31.
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Del día 1 a las 00:00 al último día a las 23:59:59.999, hora de Colombia.
export function monthBounds(year: number, month: number) {
  const startsAt = new Date(Date.UTC(year, month - 1, 1, COLOMBIA_OFFSET_HOURS));
  const nextMonthStart = new Date(Date.UTC(year, month, 1, COLOMBIA_OFFSET_HOURS));
  return {
    startsAt,
    endsAt: new Date(nextMonthStart.getTime() - 1),
    days: daysInMonth(year, month),
  };
}

// Año y mes calendario actuales en Colombia.
export function currentColombiaMonth(now = Date.now()) {
  const local = new Date(now - COLOMBIA_OFFSET_HOURS * 60 * 60 * 1000);
  return { year: local.getUTCFullYear(), month: local.getUTCMonth() + 1 };
}

export function monthlySeasonName(year: number, month: number) {
  return `${MONTH_NAMES_ES[month - 1]} ${year}`;
}
