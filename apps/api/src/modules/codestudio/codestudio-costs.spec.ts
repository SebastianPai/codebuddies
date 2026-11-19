import { CodeStudioEngineService, EngineInput } from './codestudio-engine.service';
import { APP_TYPE_BY_SLUG } from './content/economy';
import { FEATURES, FEATURE_BY_SLUG, FEATURE_TOOLS } from './content/features';

// Costos de la Fase 2: la IA por API paga tokens por usuario (userCost) y los
// microservicios cuestan operarlos (fixedCost). Se mide con el motor real.

const BASE = ['landing', 'auth', 'core-feature'];

function costsWith(extra: string[], users = 10_000) {
  const engine = new CodeStudioEngineService();
  const appType = APP_TYPE_BY_SLUG.values().next().value!;
  const input: EngineInput = {
    company: {
      activeUsers: users,
      cash: 1_000_000,
      satisfaction: 70,
      rating: 4,
      reputation: 50,
      techDebt: 0,
      stability: 95,
      debtDays: 0,
      gameDays: 10,
      priceLevel: 1,
    },
    profile: appType.profile,
    features: [...BASE, ...extra].map((slug) => ({ slug, effects: FEATURE_BY_SLUG.get(slug)!.effects })),
    employees: [],
    hosting: [{ level: 1, capacity: 1_000_000, latency: 80, stability: 99, monthly: 300 }],
    tasks: [],
    openBugWeight: 0,
    elapsedSeconds: 1,
  };
  // Sin azar: el costo diario no depende del rng.
  return engine.simulate(input, () => 0.5).metrics;
}

describe('CodeStudio: costos de IA y arquitectura', () => {
  it('el asistente con IA cobra tokens por cada usuario', () => {
    const without = costsWith(['rest-api']);
    const withAi = costsWith(['rest-api', 'llm-assistant']);
    const userCost = FEATURE_BY_SLUG.get('llm-assistant')!.effects.userCost!;
    expect(userCost).toBeGreaterThan(0);
    // Más usuarios = más factura de IA (al menos el costo por usuario).
    expect(withAi.dailyCosts - without.dailyCosts).toBeGreaterThanOrEqual(10_000 * userCost * 0.99);
  });

  it('la factura de IA crece con los usuarios', () => {
    const small = costsWith(['rest-api', 'llm-assistant'], 1_000).dailyCosts - costsWith(['rest-api'], 1_000).dailyCosts;
    const big = costsWith(['rest-api', 'llm-assistant'], 100_000).dailyCosts - costsWith(['rest-api'], 100_000).dailyCosts;
    expect(big).toBeGreaterThan(small * 50);
  });

  it('cada microservicio suma un costo fijo diario', () => {
    const deps = ['rest-api', 'external-apis', 'webhooks', 'job-queue'];
    const monolith = costsWith(deps).dailyCosts;
    const oneService = costsWith([...deps, 'first-microservice']).dailyCosts;
    expect(oneService - monolith).toBeGreaterThanOrEqual(FEATURE_BY_SLUG.get('first-microservice')!.effects.fixedCost! * 0.99);
  });

  it('cada función tiene sus herramientas de la vida real y sus requisitos existen', () => {
    for (const feature of FEATURES) {
      expect(FEATURE_TOOLS[feature.slug]?.length ?? 0).toBeGreaterThan(0);
      for (const slug of feature.requires) expect(FEATURE_BY_SLUG.has(slug)).toBe(true);
    }
  });
});
