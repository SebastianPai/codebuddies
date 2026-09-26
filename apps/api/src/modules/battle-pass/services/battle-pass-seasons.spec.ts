import {
  currentColombiaMonth,
  daysInMonth,
  monthBounds,
  monthlySeasonName,
} from './battle-pass-seasons';

describe('temporadas mensuales del pase', () => {
  it('cada mes tiene sus días reales', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29); // bisiesto
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 10)).toBe(31);
  });

  it('va del día 1 00:00 al último día 23:59:59.999 hora de Colombia', () => {
    const { startsAt, endsAt, days } = monthBounds(2026, 10);
    expect(days).toBe(31);
    expect(startsAt.toISOString()).toBe('2026-10-01T05:00:00.000Z');
    expect(endsAt.toISOString()).toBe('2026-11-01T04:59:59.999Z');
  });

  it('diciembre termina el 31 y cruza de año bien', () => {
    const { endsAt } = monthBounds(2026, 12);
    expect(endsAt.toISOString()).toBe('2027-01-01T04:59:59.999Z');
  });

  it('el mes actual se calcula en hora de Colombia', () => {
    // 1 de octubre 02:00 UTC = 30 de septiembre 21:00 en Colombia.
    expect(currentColombiaMonth(Date.UTC(2026, 9, 1, 2))).toEqual({ year: 2026, month: 9 });
    expect(currentColombiaMonth(Date.UTC(2026, 9, 1, 6))).toEqual({ year: 2026, month: 10 });
  });

  it('nombra la temporada con el mes', () => {
    expect(monthlySeasonName(2026, 10)).toBe('Octubre 2026');
  });
});
