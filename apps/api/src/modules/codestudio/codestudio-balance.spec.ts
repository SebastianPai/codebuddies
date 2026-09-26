import { CodeStudioEngineService, EngineEmployee, EngineTask, releaseBugChance, resolveProfile } from './codestudio-engine.service';
import { campaignQuote, evaluateStage, fundingOffer } from './codestudio-rules';
import { APP_TYPE_BY_SLUG, CHANNELS, HOSTING, ROLE_BY_SLUG } from './content/economy';
import { FEATURES, FEATURE_BY_SLUG } from './content/features';
import { FUNDING_MIN_RATING, STAGES } from './content/progression';
import { consultantFixCost, DIAGNOSE_COST_FACTOR } from './content/bugs';

// Test de balance: un "bot" juega partidas completas contra el motor real
// (sin base de datos) con una estrategia razonable, y verifica que el ritmo
// del juego tenga sentido: el MVP llega en minutos, las etapas altas
// requieren horas, y jugar mal lleva a la quiebra.

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Strategy = 'good' | 'reckless-hiring' | 'idle';

const PRIORITY = [
  'landing', 'auth', 'core-feature', 'password-hashing', 'payments', 'seo', 'db-indexes', 'automated-tests', 'backups',
  'email-notifications', 'error-tracking', 'subscriptions', 'onboarding', 'analytics', 'social-sharing', 'referrals',
  'rate-limiting', 'connection-pool', 'cdn', 'cache', 'ci-cd', 'free-trial', 'profiles', 'annual-plans', 'search',
  'community', 'observability', 'job-queue', 'two-factor', 'mobile-app', 'ab-testing', 'push', 'support-bot',
  'feature-flags', 'personalization', 'db-replicas', 'compliance', 'teams-plan', 'autoscaling', 'ai-recommendations', 'ads',
];

const HIRE_ORDER = ['frontend', 'backend', 'qa', 'ux', 'marketing', 'fullstack', 'support', 'devops', 'ux', 'product-manager', 'community-manager', 'data-scientist', 'support', 'support', 'support', 'support', 'support', 'support', 'support', 'support', 'support', 'support', 'support', 'support'];

function play(appSlug: string, strategy: Strategy, minutes: number, seed = 1) {
  const rng = mulberry32(seed);
  const engine = new CodeStudioEngineService();
  const appType = APP_TYPE_BY_SLUG.get(appSlug)!;
  const profile = appType.profile;
  const resolved = resolveProfile(profile);
  const company = {
    activeUsers: 0,
    cash: profile.startingCash,
    satisfaction: 70,
    rating: 4,
    reputation: 5,
    techDebt: 0,
    stability: 95,
    debtDays: 0,
    gameDays: 0,
    priceLevel: 1,
  };
  const installed = new Set<string>();
  const employees: EngineEmployee[] = [];
  const hosting = new Map<string, number>();
  let tasks: Array<EngineTask & { createdAt: number }> = [];
  let stage = 0;
  let fundingRound = 0;
  let openBugWeight = 0;
  const bugTimers: Array<{ weight: number; fixAt: number; cost: number }> = [];
  const stageTimes: Record<number, number> = {};
  let bankruptAt: number | null = null;
  let minCash = company.cash;
  let lastMetrics: ReturnType<CodeStudioEngineService['simulate']>['metrics'] | null = null;
  const recentChannels: number[] = [];

  const spend = (amount: number) => {
    if (company.cash < amount) return false;
    company.cash -= amount;
    return true;
  };

  for (let second = 0; second < minutes * 60; second += 10) {
    const hostingList = [...hosting.entries()].map(([slug, level]) => {
      const def = HOSTING.find((item) => item.slug === slug)!;
      return { level, capacity: def.capacity, latency: def.latency, stability: def.stability, monthly: def.monthly };
    });
    const result = engine.simulate(
      {
        company,
        profile,
        features: [...installed].map((slug) => ({ slug, effects: FEATURE_BY_SLUG.get(slug)!.effects })),
        employees,
        hosting: hostingList,
        tasks,
        openBugWeight,
        elapsedSeconds: 10,
      },
      rng,
    );
    lastMetrics = result.metrics;
    company.cash += result.deltas.cash;
    company.activeUsers += result.deltas.activeUsers;
    Object.assign(company, {
      satisfaction: result.state.satisfaction,
      rating: result.state.rating,
      reputation: result.state.reputation,
      techDebt: result.state.techDebt,
      stability: result.state.stability,
      debtDays: result.state.debtDays,
      gameDays: result.state.gameDays,
    });
    minCash = Math.min(minCash, company.cash);
    for (const update of result.tasks) {
      const task = tasks.find((item) => item.id === update.id)!;
      task.spentSeconds = update.spentSeconds;
      if (update.completed) {
        installed.add(update.featureSlug);
        if (rng() < releaseBugChance(update.difficulty, result.metrics.quality, resolved.bugSeverityFactor)) {
          bugTimers.push({ weight: 2, fixAt: second + 30, cost: Math.round(consultantFixCost('MEDIUM', stage) * DIAGNOSE_COST_FACTOR) });
          openBugWeight += 2;
        }
      }
    }
    tasks = tasks.filter((task) => task.spentSeconds < task.requiredSeconds);
    // El bot diagnostica sus bugs a los 30s (a veces falla y paga de más).
    for (const bug of bugTimers.filter((item) => item.fixAt <= second)) {
      spend(bug.cost);
      openBugWeight -= bug.weight;
    }
    bugTimers.splice(0, bugTimers.length, ...bugTimers.filter((item) => item.fixAt > second));

    if (process.env.CS_DEBUG && second % 300 === 0) {
      // eslint-disable-next-line no-console
      console.log(`[${appSlug}] min ${second / 60} stage ${stage} cash ${Math.round(company.cash)} users ${company.activeUsers} rating ${company.rating.toFixed(2)} sat ${company.satisfaction.toFixed(0)} churn ${(result.metrics.churn * 100).toFixed(2)}% rev ${result.metrics.dailyRevenue.toFixed(0)} cost ${result.metrics.dailyCosts.toFixed(0)} util ${result.metrics.utilization.toFixed(2)} emp ${employees.length} feat ${installed.size} bugs ${openBugWeight} debt ${company.techDebt.toFixed(0)} val ${result.state.valuation}`);
    }
    if (company.debtDays >= 7) {
      bankruptAt = second / 60;
      break;
    }

    const newStage = evaluateStage(stage, {
      activeUsers: company.activeUsers,
      dailyRevenue: result.metrics.dailyRevenue,
      dailyProfit: result.metrics.dailyProfit,
      rating: company.rating,
      churn: result.metrics.churn,
      stability: company.stability,
      valuation: result.state.valuation,
      installedSlugs: installed,
      hasInfrastructure: hosting.size > 0,
    });
    for (let reached = stage + 1; reached <= newStage; reached++) {
      stageTimes[reached] = Math.round(second / 60);
      company.cash += STAGES[reached].reward.cash;
    }
    stage = newStage;

    if (strategy === 'idle') continue;

    // Infraestructura: servidor apenas hay MVP, escalar al 75% de uso.
    if (!hosting.has('server') && installed.has('core-feature')) {
      if (spend(250)) hosting.set('server', 1);
    } else if (hosting.size > 0 && result.metrics.utilization > 0.75) {
      const candidates = HOSTING.filter((item) => item.active && item.minStage <= stage)
        .map((item) => ({ item, level: (hosting.get(item.slug) ?? 0) + 1 }))
        .filter(({ item, level }) => level <= item.maxLevel)
        .sort((a, b) => a.item.install * a.level / a.item.capacity - (b.item.install * b.level) / b.item.capacity);
      const pick = candidates[0];
      if (pick && company.cash > pick.item.install * pick.level + 500) {
        spend(pick.item.install * pick.level);
        hosting.set(pick.item.slug, pick.level);
      }
    }

    // Equipo.
    const targetTeam = strategy === 'reckless-hiring' ? 12 : [1, 2, 3, 5, 8, 12, 16, 20, 24][stage];
    const burnFloor = strategy === 'reckless-hiring' ? 0 : result.metrics.dailyCosts * 25 + 500;
    if (employees.length < targetTeam) {
      const slug = HIRE_ORDER[employees.length % HIRE_ORDER.length];
      const role = ROLE_BY_SLUG.get(slug)!;
      if (company.cash - role.salary * 0.5 > burnFloor && spend(Math.round(role.salary * 0.5))) {
        employees.push({ id: `e${employees.length}`, roleSlug: slug, productivity: role.baseStats.productivity, speed: role.baseStats.speed, salary: role.salary });
      }
    }

    // Features: siguiente de la lista de prioridad que esté desbloqueada.
    if (tasks.length < result.metrics.maxParallel + 1) {
      const next = PRIORITY.map((slug) => FEATURE_BY_SLUG.get(slug)!).find(
        (feature) =>
          !installed.has(feature.slug) &&
          !tasks.some((task) => task.featureSlug === feature.slug) &&
          feature.minStage <= stage &&
          feature.requires.every((slug) => installed.has(slug)),
      );
      if (next && company.cash - next.cost > (strategy === 'reckless-hiring' ? 0 : result.metrics.dailyCosts * 10) && spend(next.cost)) {
        tasks.push({ id: next.slug, featureSlug: next.slug, requiredSeconds: next.devSeconds, spentSeconds: 0, difficulty: next.difficulty, createdAt: second });
      }
    }

    // Marketing: si el usuario vale más de lo que cuesta (LTV > CAC) o
    // para empujar una meta de usuarios, con caja de sobra.
    if (stage >= 1 && result.metrics.launched && company.cash > 3000) {
      const recent = recentChannels.filter((at) => second - at < 15 * 60).length;
      const quotes = CHANNELS.filter((channel) => channel.minStage <= stage)
        .map((channel) => ({ channel, quote: campaignQuote({ channelSlug: channel.slug, multiplier: 1, rating: company.rating, fit: profile.channelEffectiveness[channel.slug] ?? 1, cacDiscount: result.metrics.cacDiscount, recentRuns: recent, penetration: company.activeUsers / profile.tam }) }))
        .filter(({ quote }) => quote && quote.cost < company.cash * 0.15)
        .sort((a, b) => a.quote!.cac - b.quote!.cac);
      const best = quotes[0];
      if (best && (result.metrics.ltv > best.quote!.cac * 0.7 || rng() < 0.05) && spend(best.quote!.cost)) {
        company.activeUsers += best.quote!.users;
        recentChannels.push(second);
      }
    }

    // Inversión cuando se puede.
    const offer = fundingOffer(fundingRound, result.state.valuation);
    if (offer && stage >= offer.minStage && company.rating >= FUNDING_MIN_RATING) {
      company.cash += offer.raise;
      fundingRound++;
    }
  }

  return { stageTimes, stage, bankruptAt, minCash, cash: company.cash, users: company.activeUsers, rating: company.rating, employees: employees.length, features: installed.size, metrics: lastMetrics };
}

describe('CodeStudio balance (bot jugando partidas completas)', () => {
  it.each(['delivery', 'ecommerce', 'social-network', 'saas'])('%s: un jugador razonable llega al MVP rápido y avanza por horas', (slug) => {
    const result = play(slug, 'good', 360, 7);
    // eslint-disable-next-line no-console
    console.log(slug, JSON.stringify({ ...result, metrics: undefined, dailyProfit: Math.round(result.metrics?.dailyProfit ?? 0), churn: result.metrics?.churn }));
    expect(result.bankruptAt).toBeNull();
    expect(result.stageTimes[1]).toBeLessThanOrEqual(8);
    expect(result.stageTimes[2]).toBeLessThanOrEqual(25);
    expect(result.stage).toBeGreaterThanOrEqual(4);
    // La etapa final no se regala: 6 horas no alcanzan para ser unicornio.
    expect(result.stage).toBeLessThan(8);
  });

  it('contratar sin freno lleva a la quiebra', () => {
    const result = play('delivery', 'reckless-hiring', 120, 3);
    expect(result.bankruptAt).not.toBeNull();
  });

  it('sin hacer nada no se gana dinero ni se avanza', () => {
    const result = play('delivery', 'idle', 30, 1);
    expect(result.stage).toBe(0);
    expect(result.users).toBe(0);
    expect(result.cash).toBeLessThan(APP_TYPE_BY_SLUG.get('delivery')!.profile.startingCash);
  });

  it('todas las features del árbol son alcanzables', () => {
    for (const feature of FEATURES) {
      for (const required of feature.requires) {
        const parent = FEATURE_BY_SLUG.get(required);
        expect(parent).toBeDefined();
        expect(parent!.minStage).toBeLessThanOrEqual(feature.minStage);
      }
    }
  });
});
