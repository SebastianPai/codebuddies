import { challengeAppSlug, challengeEndsInMinutes, challengeOf, weekKey } from './content/challenge';

const at = (iso: string) => new Date(iso).getTime();

describe('CodeStudio: reto de la semana', () => {
  it('la semana ISO se calcula bien (y con el corte de día del juego, UTC-5)', () => {
    expect(weekKey(at('2026-11-14T17:00:00Z'))).toBe('2026-W46'); // sábado
    expect(weekKey(at('2026-11-16T17:00:00Z'))).toBe('2026-W47'); // lunes
    // Lunes 02:00 UTC todavía es domingo en hora del juego.
    expect(weekKey(at('2026-11-16T02:00:00Z'))).toBe('2026-W46');
    expect(weekKey(at('2027-01-01T17:00:00Z'))).toBe('2026-W53');
  });

  it('el reto termina antes de una semana', () => {
    const minutes = challengeEndsInMinutes(at('2026-11-14T17:00:00Z'));
    expect(minutes).toBeGreaterThan(0);
    expect(minutes).toBeLessThanOrEqual(7 * 24 * 60);
  });

  it('el tipo de app rota de semana en semana y es el mismo para todos', () => {
    const slugs = ['delivery', 'ecommerce', 'saas'];
    const a = challengeAppSlug('2026-W46', slugs);
    expect(challengeAppSlug('2026-W46', [...slugs].reverse())).toBe(a);
    expect(challengeAppSlug('2026-W47', slugs)).not.toBe(a);
    expect(challengeAppSlug('2026-W46', [])).toBeNull();
  });

  it('detecta las empresas del reto', () => {
    expect(challengeOf({ challenge: '2026-W46' })).toBe('2026-W46');
    expect(challengeOf({ exit: {} })).toBeNull();
    expect(challengeOf(null)).toBeNull();
  });
});
