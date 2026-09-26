import { BUG_SCENARIOS } from './content/bugs';
import { APP_TYPES, CHANNELS, HOSTING, ROLES } from './content/economy';
import { DECISION_EVENTS, EventContext, PASSIVE_EVENTS, PRICE_LEVELS } from './content/events';
import { FEATURES, FEATURE_BRANCHES } from './content/features';
import { MILESTONES, STAGES } from './content/progression';
import { DAILY_MISSIONS, missionsFor } from './content/daily';
import { DE } from './content/i18n/de';
import { EN } from './content/i18n/en';
import { MSG } from './content/i18n/messages';
import { Localized, langFromHeader, localizeScenario } from './content/i18n';

// Si alguien agrega contenido en español y se olvida de traducirlo, este
// test falla con la clave exacta que falta.
const expectFilled = (text: Localized, where: string) => {
  for (const lang of ['es', 'en', 'de'] as const) {
    expect({ where, lang, ok: typeof text[lang] === 'string' && text[lang].trim().length > 0 }).toEqual({ where, lang, ok: true });
  }
};

describe.each([
  ['en', EN],
  ['de', DE],
])('Traducción %s del contenido de CodeStudio', (_lang, t) => {
  it('tiene todas las features, ramas, roles, servidores, tipos de app y canales', () => {
    expect(Object.keys(t.features).sort()).toEqual(FEATURES.map((feature) => feature.slug).sort());
    expect(Object.keys(t.branches).sort()).toEqual(FEATURE_BRANCHES.map((branch) => branch.key).sort());
    expect(Object.keys(t.roles).sort()).toEqual(ROLES.map((role) => role.slug).sort());
    expect(Object.keys(t.hosting).sort()).toEqual(HOSTING.map((item) => item.slug).sort());
    expect(Object.keys(t.appTypes).sort()).toEqual(APP_TYPES.map((type) => type.slug).sort());
    expect(Object.keys(t.channels).sort()).toEqual(CHANNELS.map((channel) => channel.slug).sort());
  });

  it('tiene todas las etapas (con la misma cantidad de metas) y logros', () => {
    for (const stage of STAGES) {
      expect(t.stages[stage.index]).toBeDefined();
      expect(t.stages[stage.index].goals).toHaveLength(stage.goals.length);
    }
    expect(Object.keys(t.milestones).sort()).toEqual(MILESTONES.map((milestone) => milestone.key).sort());
  });

  it('tiene todos los bugs con exactamente las mismas opciones', () => {
    expect(Object.keys(t.bugs).sort()).toEqual(BUG_SCENARIOS.map((scenario) => scenario.key).sort());
    for (const scenario of BUG_SCENARIOS) {
      const bug = t.bugs[scenario.key];
      expect({ key: scenario.key, options: Object.keys(bug.options).sort() }).toEqual({
        key: scenario.key,
        options: scenario.options.map((option) => option.key).sort(),
      });
      if (bug.evidence) expect({ key: scenario.key, lines: bug.evidence.length }).toEqual({ key: scenario.key, lines: scenario.evidence.length });
      if (scenario.preventHint) expect({ key: scenario.key, hint: Boolean(bug.preventHint) }).toEqual({ key: scenario.key, hint: true });
    }
  });
});

describe('Textos dinámicos de CodeStudio', () => {
  const ctx: EventContext = {
    stage: 5,
    activeUsers: 5000,
    dailyRevenue: 800,
    valuation: 1_000_000,
    rating: 4.2,
    cash: 50_000,
    installed: new Set(['auth', 'payments', 'seo', 'cdn', 'backups', 'rate-limiting', 'compliance']),
    hostingSlugs: new Set(['server', 'load-balancer']),
    hasMonetization: true,
    activeTaskCount: 2,
    employees: [
      { id: 'a', name: 'Ana', salary: 1000, roleName: 'Backend' },
      { id: 'b', name: 'Leo', salary: 900, roleName: 'QA' },
    ],
    channelFit: () => 1,
  };
  const rng = () => 0.1;

  it('todos los eventos y decisiones tienen textos en los 3 idiomas', () => {
    for (const event of PASSIVE_EVENTS) {
      expectFilled(event.name, event.key);
      expectFilled(event.resolve(ctx, rng).message, `${event.key}:resolve`);
      expectFilled(event.resolve({ ...ctx, installed: new Set(), hasMonetization: false, rating: 2 }, () => 0.9).message, `${event.key}:resolve-bad`);
    }
    for (const decision of DECISION_EVENTS) {
      expectFilled(decision.name, decision.key);
      const built = decision.build(ctx, rng);
      expectFilled(built.description, `${decision.key}:description`);
      for (const choice of built.choices) {
        expectFilled(choice.label, `${decision.key}:${choice.key}:label`);
        expectFilled(choice.hint, `${decision.key}:${choice.key}:hint`);
        expectFilled(decision.resolve(ctx, built.params, choice.key, rng).message, `${decision.key}:${choice.key}:outcome`);
      }
    }
    for (const level of PRICE_LEVELS) expectFilled(level.label, `price:${level.value}`);
  });

  it('todos los mensajes del servidor tienen los 3 idiomas', () => {
    for (const [key, build] of Object.entries(MSG)) {
      const args = Array.from({ length: build.length }, (_, index) => (index % 2 === 0 ? 'x' : 1));
      expectFilled((build as (...values: unknown[]) => Localized)(...args), key);
    }
  });

  it('todas las misiones diarias tienen etiqueta en los 3 idiomas y son deterministas', () => {
    for (const pool of Object.values(DAILY_MISSIONS)) {
      for (const mission of pool) expectFilled(mission.label(mission.target), mission.key);
    }
    expect(missionsFor('user-1', '2026-09-28')).toEqual(missionsFor('user-1', '2026-09-28'));
    expect(missionsFor('user-1', '2026-09-28')).toHaveLength(3);
  });

  it('elige el idioma del query y traduce los escenarios', () => {
    expect(langFromHeader('en-us')).toBe('en');
    expect(langFromHeader('de')).toBe('de');
    expect(langFromHeader(undefined)).toBe('es');
    expect(langFromHeader('fr')).toBe('es');
    const scenario = BUG_SCENARIOS.find((entry) => entry.key === 'n-plus-one')!;
    const english = localizeScenario(scenario, 'en');
    expect(english.title).toBe('The main screen takes 6 seconds');
    expect(english.options.find((option) => option.key === 'join')?.correct).toBe(true);
    expect(localizeScenario(scenario, 'es')).toBe(scenario);
  });
});
