import { CODE_REVIEW_QUALITY, EngineEmployee, hasCodeReview, qualityScore } from './codestudio-engine.service';
import { EventContext, PASSIVE_EVENTS } from './content/events';

// Fase 3: revisión de código con efecto real y crisis a gran escala que
// solo se superan si te preparaste (no pagando en el momento).

const dev = (id: string, roleSlug: string): EngineEmployee => ({ id, roleSlug, productivity: 1, speed: 1, salary: 3000 });

describe('CodeStudio: revisión de código', () => {
  it('con un solo dev no hay revisión; con dos sí', () => {
    expect(hasCodeReview([dev('a', 'backend')])).toBe(false);
    expect(hasCodeReview([dev('a', 'backend'), dev('b', 'frontend')])).toBe(true);
    // Soporte o marketing no revisan código.
    expect(hasCodeReview([dev('a', 'backend'), dev('b', 'support')])).toBe(false);
  });

  it('la revisión sube la calidad (menos bugs al publicar)', () => {
    const solo = qualityScore([], [dev('a', 'backend')]);
    const pair = qualityScore([], [dev('a', 'backend'), dev('b', 'fullstack')]);
    expect(pair - solo).toBeCloseTo(CODE_REVIEW_QUALITY, 5);
  });
});

function ctx(overrides: Partial<EventContext> & { installed?: string[] }): EventContext {
  return {
    stage: 7,
    activeUsers: 100_000,
    dailyRevenue: 20_000,
    valuation: 500_000_000,
    rating: 4,
    cash: 1_000_000,
    hostingSlugs: new Set(),
    hasMonetization: true,
    activeTaskCount: 0,
    employees: [],
    channelFit: () => 1,
    ...overrides,
    installed: new Set(overrides.installed ?? []),
  } as EventContext;
}

const event = (key: string) => PASSIVE_EVENTS.find((entry) => entry.key === key)!;
const rng = () => 0.5;

describe('CodeStudio: crisis a gran escala', () => {
  it.each([
    ['region-outage', ['db-replicas', 'autoscaling']],
    ['ai-bill-spike', ['llm-assistant', 'rate-limiting', 'observability']],
    ['microservice-cascade', ['first-microservice', 'observability']],
    ['duplicate-webhooks', ['payments', 'external-apis', 'webhooks']],
  ])('%s: preparado sale bien, sin preparar sale mal', (key, prepared) => {
    const found = event(key);
    expect(found).toBeDefined();
    const ready = found.resolve(ctx({ installed: prepared }), rng);
    expect(ready.tone).toBe('good');
    // Sin la protección (se queda solo lo que habilita el evento).
    const trigger = prepared.filter((slug) => ['llm-assistant', 'first-microservice', 'payments', 'external-apis'].includes(slug));
    const unready = found.resolve(ctx({ installed: trigger }), rng);
    expect(unready.tone).toBe('bad');
  });

  it('un competidor copiando te afecta menos si tu rating es alto', () => {
    expect(event('competitor-copy').resolve(ctx({ rating: 4.6 }), rng).tone).toBe('good');
    expect(event('competitor-copy').resolve(ctx({ rating: 3.5 }), rng).tone).toBe('bad');
  });

  it('las crisis grandes no aparecen en etapas tempranas', () => {
    const early = ctx({ stage: 1, activeUsers: 300, installed: ['first-microservice', 'llm-assistant'] });
    expect(event('region-outage').eligible(early)).toBe(false);
    expect(event('competitor-copy').eligible(early)).toBe(false);
    expect(event('ai-bill-spike').eligible(early)).toBe(false);
  });
});
