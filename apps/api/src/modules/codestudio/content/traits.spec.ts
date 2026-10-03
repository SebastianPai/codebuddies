import { DECISION_EVENTS, EventContext } from './events';
import { TRAITS, bumpStats, performanceOf, rollTrait, statsOf, traitOf } from './traits';

describe('rasgos de empleados', () => {
  it('rollTrait respeta los pesos y siempre devuelve un rasgo válido', () => {
    expect(rollTrait(() => 0)).toBe('star');
    expect(rollTrait(() => 0.999)).toBe('unmotivated');
    for (let i = 0; i < 50; i++) expect(TRAITS[rollTrait()]).toBeDefined();
  });

  it('un empleado de antes recibe siempre el mismo rasgo (por id)', () => {
    const old = { id: 'emp-123', metadata: null };
    expect(traitOf(old).key).toBe(traitOf(old).key);
    expect(traitOf({ id: 'x', metadata: { trait: 'slow' } }).key).toBe('slow');
  });

  it('las estadísticas se suman sin perder el resto del metadata', () => {
    const meta = bumpStats({ trait: 'star', other: 1 }, { bugsFixed: 2 });
    expect(meta).toMatchObject({ trait: 'star', other: 1 });
    expect(statsOf({ metadata: bumpStats(meta, { bugsCaused: 1 }) })).toEqual({ featuresShipped: 0, bugsFixed: 2, bugsCaused: 1 });
  });

  it('el rendimiento premia features y bugs arreglados y castiga bugs causados', () => {
    const star = performanceOf({ id: 'a', quality: 1, metadata: { trait: 'star', stats: { featuresShipped: 6, bugsFixed: 3 } } });
    const sloppy = performanceOf({ id: 'b', quality: 1, metadata: { trait: 'sloppy', stats: { featuresShipped: 2, bugsCaused: 4 } } });
    expect(star).toBeGreaterThanOrEqual(70);
    expect(sloppy).toBeLessThan(50);
  });
});

describe('decisión: quieren llevarse a alguien', () => {
  const poach = DECISION_EVENTS.find((event) => event.key === 'poach')!;
  const ctx = (performance: number, trait = TRAITS.steady): EventContext => ({
    stage: 2, activeUsers: 500, dailyRevenue: 100, valuation: 1000, rating: 4, cash: 1000,
    installed: new Set(), hostingSlugs: new Set(), hasMonetization: true, activeTaskCount: 0,
    employees: [{ id: 'e1', name: 'Ana', salary: 1000, roleName: 'Backend', trait, stats: { featuresShipped: 1, bugsFixed: 0, bugsCaused: 4 }, performance }],
    channelFit: () => 1,
  });

  it('si rinde poco, recomienda dejarlo ir y la otra empresa paga un traspaso alto', () => {
    const built = poach.build(ctx(30, TRAITS.sloppy), () => 0);
    expect(built.choices.find((c) => c.key === 'let-go')!.hint.es).toMatch(/^Recomendado/);
    expect(built.description.es).toContain('Descuidado');
    const outcome = poach.resolve(ctx(30, TRAITS.sloppy), built.params, 'let-go', () => 0);
    expect(outcome.cash).toBe(3000);
    expect(outcome.removeEmployeeId).toBe('e1');
    expect(outcome.tone).toBe('good');
  });

  it('si es de los mejores, recomienda subirle el sueldo', () => {
    const built = poach.build(ctx(85, TRAITS.star), () => 0);
    expect(built.choices.find((c) => c.key === 'raise')!.hint.es).toMatch(/^Recomendado/);
    expect(built.choices.find((c) => c.key === 'let-go')!.hint.es).not.toMatch(/^Recomendado/);
  });
});
