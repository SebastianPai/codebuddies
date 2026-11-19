import { streakFrom } from './codestudio-rewards.service';
import { dailyKey } from './content/daily';

const DAY = 24 * 60 * 60 * 1000;
// Mediodía (hora del juego, UTC-5) de un día fijo: lejos del cambio de día.
const NOW = Date.UTC(2026, 10, 14, 17, 0, 0);
const daysAgo = (...offsets: number[]) => new Set(offsets.map((back) => dailyKey(NOW - back * DAY)));

describe('streakFrom (racha de CodeStudio)', () => {
  it('sin actividad: racha 0', () => {
    expect(streakFrom(new Set(), NOW)).toEqual({ days: 0, activeToday: false });
  });

  it('cuenta días seguidos hasta hoy', () => {
    expect(streakFrom(daysAgo(0, 1, 2), NOW)).toEqual({ days: 3, activeToday: true });
  });

  it('si hoy todavía no jugaste, la racha de ayer sigue viva', () => {
    expect(streakFrom(daysAgo(1, 2, 3), NOW)).toEqual({ days: 3, activeToday: false });
  });

  it('un día de descanso no corta la racha', () => {
    expect(streakFrom(daysAgo(0, 2, 3), NOW).days).toBe(3);
  });

  it('dos días seguidos sin jugar sí la cortan', () => {
    expect(streakFrom(daysAgo(0, 3, 4), NOW).days).toBe(1);
  });

  it('cuenta solo días jugados (los de descanso no suman)', () => {
    expect(streakFrom(daysAgo(0, 1, 3, 5, 6), NOW).days).toBe(5);
  });
});
