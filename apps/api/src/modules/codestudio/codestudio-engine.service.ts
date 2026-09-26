import { Injectable } from '@nestjs/common';
import { FeatureEffects, LEGACY_FEATURE_EFFECTS } from './content/features';
import { ROLE_BY_SLUG } from './content/economy';

// Motor de simulación de CodeStudio v2. Es una función pura (sin Prisma):
// el servicio le pasa el estado leído de la base y persiste lo que devuelve.
// Eso permite testear el balance del juego completo sin base de datos (ver
// codestudio-engine.service.spec.ts, que simula partidas enteras).
//
// Escala de tiempo: 1 minuto real = 1 día de juego. Todo lo "por día"
// (sueldos/30, ingresos, usuarios nuevos, churn) se multiplica por
// `days = elapsedSeconds / 60`. El desarrollo de features en cambio corre en
// segundos reales (devSeconds de cada feature).

export type AppProfileInput = {
  growthMultiplier?: number;
  retentionBase?: number;
  infraCostMultiplier?: number;
  networkEffect?: number;
  bugTolerance?: number;
  tam?: number;
  featureFit?: Record<string, number>;
  channelEffectiveness?: Record<string, number>;
};

export type ResolvedProfile = {
  growthMultiplier: number;
  infraCostMultiplier: number;
  networkEffect: number;
  churnMultiplier: number;
  bugSeverityFactor: number;
  tam: number;
  featureFit: Record<string, number>;
  channelEffectiveness: Record<string, number>;
};

export type EngineFeature = { slug: string; effects?: FeatureEffects | null; legacy?: boolean };
export type EngineEmployee = { id: string; roleSlug: string; productivity: number; speed: number; salary: number; busy?: boolean };
export type EngineHosting = { level: number; capacity: number; latency: number; stability: number; monthly: number };
export type EngineTask = { id: string; featureSlug: string; requiredSeconds: number; spentSeconds: number; difficulty: number };

export type EngineCompany = {
  activeUsers: number;
  cash: number;
  satisfaction: number;
  rating: number;
  reputation: number;
  techDebt: number;
  stability: number;
  debtDays: number;
  gameDays: number;
  priceLevel: number;
};

export type EngineInput = {
  company: EngineCompany;
  profile: AppProfileInput;
  features: EngineFeature[];
  employees: EngineEmployee[];
  hosting: EngineHosting[];
  // En orden de llegada: las primeras `maxParallel` avanzan, el resto espera.
  tasks: EngineTask[];
  openBugWeight: number;
  elapsedSeconds: number;
};

export type EngineMetrics = {
  launched: boolean;
  dailyRevenue: number;
  dailyCosts: number;
  dailyProfit: number;
  dailySalaries: number;
  dailyInfra: number;
  dailyNewUsers: number;
  dailyLostUsers: number;
  churn: number;
  arpu: number;
  ltv: number;
  load: number;
  capacity: number;
  utilization: number;
  runwayDays: number | null;
  devPower: number;
  maxParallel: number;
  quality: number;
  security: number;
  cacDiscount: number;
  satisfactionTarget: number;
  // Agentes de soporte que faltan (0 = cubierto).
  supportGap: number;
};

export type EngineTaskUpdate = { id: string; featureSlug: string; spentSeconds: number; progress: number; completed: boolean; difficulty: number };

export type EngineResult = {
  deltas: { cash: number; activeUsers: number; newUsers: number; lostUsers: number; revenue: number; expenses: number };
  state: {
    satisfaction: number;
    rating: number;
    reputation: number;
    techDebt: number;
    stability: number;
    latency: number;
    debtDays: number;
    gameDays: number;
    valuation: number;
  };
  metrics: EngineMetrics;
  tasks: EngineTaskUpdate[];
};

export const FOUNDER_DEV_POWER = 0.6;
export const BASE_DAILY_OVERHEAD = 8;
export const MAX_SUBSTEP_DAYS = 0.25;
// El cliente consulta cada ~10s; si pasó más de esto, el jugador no estaba
// mirando y la empresa queda "en pausa" (no se simula el tiempo ausente, así
// nadie quiebra mientras duerme).
export const MAX_ELAPSED_SECONDS = 30;

// Campos de efecto que representan un BENEFICIO — son los que escala el
// "fit" del tipo de app. `load` es un costo, así que no se escala.
const BENEFIT_KEYS: Array<keyof FeatureEffects> = [
  'growth',
  'viral',
  'retention',
  'arpu',
  'conversion',
  'satisfaction',
  'capacity',
  'latency',
  'stability',
  'quality',
  'security',
  'cacDiscount',
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

export function resolveProfile(profile: AppProfileInput = {}): ResolvedProfile {
  const num = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
  return {
    growthMultiplier: clamp(num(profile.growthMultiplier, 1), 0.3, 2.5),
    infraCostMultiplier: clamp(num(profile.infraCostMultiplier, 1), 0.3, 3),
    networkEffect: clamp(num(profile.networkEffect, 0), 0, 1),
    // 0.5 = neutro (multiplicador 1).
    churnMultiplier: clamp(2 - 2 * num(profile.retentionBase, 0.5), 0.3, 1.6),
    bugSeverityFactor: clamp(2 - 2 * num(profile.bugTolerance, 0.5), 0.4, 1.6),
    tam: Math.max(10_000, num(profile.tam, 10_000_000)),
    featureFit: profile.featureFit ?? {},
    channelEffectiveness: profile.channelEffectiveness ?? {},
  };
}

// Efectos reales de una feature para ESTE tipo de app: los beneficios se
// multiplican por su fit (ads rinde 2.2x en una red social y 0.3x en un
// SaaS). Una feature legacy (del catálogo viejo) aporta un efecto chico fijo.
export function effectiveEffects(feature: EngineFeature, fit: Record<string, number>): FeatureEffects {
  const base = feature.legacy ? LEGACY_FEATURE_EFFECTS : (feature.effects ?? {});
  const multiplier = fit[feature.slug] ?? 1;
  const result: FeatureEffects = { ...base };
  for (const key of BENEFIT_KEYS) {
    const value = base[key];
    if (typeof value !== 'number') continue;
    const isBenefit = key === 'latency' ? value < 0 : value > 0;
    result[key] = isBenefit ? value * multiplier : value;
  }
  return result;
}

export function sumEffects(features: EngineFeature[], fit: Record<string, number>) {
  const total: Required<FeatureEffects> = {
    growth: 0,
    viral: 0,
    retention: 0,
    arpu: 0,
    conversion: 0,
    satisfaction: 0,
    load: 0,
    capacity: 0,
    latency: 0,
    stability: 0,
    quality: 0,
    security: 0,
    cacDiscount: 0,
  };
  for (const feature of features) {
    const effects = effectiveEffects(feature, fit);
    for (const key of Object.keys(total) as Array<keyof FeatureEffects>) {
      total[key] += Number(effects[key] ?? 0);
    }
  }
  return total;
}

export function countRoles(employees: EngineEmployee[]) {
  const counts: Record<string, number> = {};
  for (const employee of employees) counts[employee.roleSlug] = (counts[employee.roleSlug] ?? 0) + 1;
  return counts;
}

// Poder de desarrollo del equipo: fundador + devPower de cada rol ×
// productividad × velocidad (solo empleados libres: uno que está arreglando
// un bug no programa features), × bonus de Product Managers. Cada 2
// programadores de verdad (devPower ≥ 1) se puede trabajar una feature más
// en paralelo.
export function teamDevPower(employees: EngineEmployee[]) {
  const roles = countRoles(employees);
  const coders = employees.filter((employee) => !employee.busy);
  const raw =
    FOUNDER_DEV_POWER +
    coders.reduce((sum, employee) => sum + (ROLE_BY_SLUG.get(employee.roleSlug)?.devPower ?? 0.5) * employee.productivity * employee.speed, 0);
  const pmMultiplier = 1 + 0.12 * Math.min(2, roles['product-manager'] ?? 0);
  const builders = employees.filter((employee) => (ROLE_BY_SLUG.get(employee.roleSlug)?.devPower ?? 0) >= 1).length;
  return { devPower: raw * pmMultiplier, maxParallel: Math.min(4, 1 + Math.floor(builders / 2)) };
}

export function qualityScore(features: EngineFeature[], employees: EngineEmployee[], fit: Record<string, number> = {}) {
  const roles = countRoles(employees);
  const fx = sumEffects(features, fit);
  return clamp(fx.quality + (roles.qa ?? 0) * 0.12 + Math.min(2, roles['product-manager'] ?? 0) * 0.05, 0, 0.85);
}

// Probabilidad de que publicar una feature traiga un bug: más difícil =
// más riesgo; QA/tests/CI lo bajan; apps poco tolerantes lo sienten más.
export function releaseBugChance(difficulty: number, quality: number, bugSeverityFactor: number) {
  return clamp(difficulty * 0.09 * (1 - quality) * bugSeverityFactor, 0.02, 0.6);
}

// Redondeo sin sesgo: 0.3 usuarios nuevos en un poll de 10s es 1 usuario
// con 30% de probabilidad. Sin esto, las empresas chicas nunca crecerían
// (siempre redondearía a 0).
export function stochasticRound(value: number, rng: () => number) {
  const floor = Math.floor(value);
  return floor + (rng() < value - floor ? 1 : 0);
}

@Injectable()
export class CodeStudioEngineService {
  simulate(input: EngineInput, rng: () => number = Math.random): EngineResult {
    const profile = resolveProfile(input.profile);
    const elapsed = clamp(input.elapsedSeconds, 0, MAX_ELAPSED_SECONDS);
    const totalDays = elapsed / 60;
    const fx = sumEffects(input.features, profile.featureFit);
    const roles = countRoles(input.employees);
    const role = (slug: string) => roles[slug] ?? 0;
    const hasCore = input.features.some((feature) => feature.slug === 'core-feature' || feature.legacy);
    const price = clamp(input.company.priceLevel || 1, 0.5, 2);

    const capacityRaw = input.hosting.reduce((sum, item) => sum + item.capacity * Math.max(1, item.level), 0);
    const capacity = capacityRaw * (1 + fx.capacity + Math.min(0.5, role('backend') * 0.1));
    const launched = capacityRaw > 0 && input.features.length > 0;
    const weightedHosting = (pick: (item: EngineHosting) => number, fallback: number) =>
      capacityRaw > 0
        ? input.hosting.reduce((sum, item) => sum + pick(item) * item.capacity * Math.max(1, item.level), 0) / capacityRaw
        : fallback;
    const infraLatency = weightedHosting((item) => item.latency, 250);
    const infraStability = weightedHosting((item) => item.stability, 90);
    const monthlyInfra = input.hosting.reduce((sum, item) => sum + item.monthly * Math.max(1, item.level), 0);
    const devopsDiscount = Math.min(0.3, role('devops') * 0.08);
    const dailyInfra = (monthlyInfra * profile.infraCostMultiplier * (1 - devopsDiscount)) / 30;
    const dailySalaries = input.employees.reduce((sum, employee) => sum + employee.salary, 0) / 30;
    const fixedDailyCosts = dailySalaries + dailyInfra + BASE_DAILY_OVERHEAD;
    const hasSupportBot = input.features.some((feature) => feature.slug === 'support-bot');
    // Rendimientos decrecientes: las primeras features suben mucho la
    // satisfacción, la feature 30 casi nada.
    const featureSatisfaction = fx.satisfaction > 0 ? 40 * (1 - Math.exp(-fx.satisfaction / 30)) : fx.satisfaction;

    const quality = qualityScore(input.features, input.employees, profile.featureFit);
    const retention = Math.min(0.7, fx.retention + role('community-manager') * 0.05);
    const monetized = fx.arpu > 0;
    const conversion = fx.conversion + role('data-scientist') * 0.08;
    const cacDiscount = Math.min(0.5, fx.cacDiscount + role('marketing') * 0.1);

    let users = Math.max(0, input.company.activeUsers);
    let satisfaction = clamp(input.company.satisfaction, 0, 100);
    let rating = clamp(input.company.rating, 1, 5);
    let reputation = clamp(input.company.reputation, 0, 100);
    let techDebt = clamp(input.company.techDebt, 0, 100);
    let stability = clamp(input.company.stability, 0, 100);
    let cashFloat = input.company.cash;
    let revenueTotal = 0;
    let costsTotal = 0;
    let newTotal = 0;
    let lostTotal = 0;
    let latency = infraLatency;
    let last = { churn: 0, arpu: 0, dailyNew: 0, dailyLost: 0, load: 0, utilization: 0, satTarget: satisfaction, dailyRevenue: 0, dailyCosts: fixedDailyCosts, supportGap: 0 };

    const steps = Math.max(1, Math.ceil(totalDays / MAX_SUBSTEP_DAYS));
    const days = totalDays / steps;

    for (let step = 0; step < steps; step++) {
      const load = users * (1 + fx.load);
      const utilization = capacity > 0 ? load / capacity : users > 0 ? 2 : 0;
      const overload = Math.max(0, utilization - 1);
      latency = Math.max(20, infraLatency + fx.latency - role('devops') * 10 + 60 * Math.min(3, utilization) ** 2 + overload * 400);

      const stabilityTarget = clamp(
        infraStability + fx.stability + Math.min(3, role('devops')) * 1.5 - overload * 30 - techDebt * 0.08 - input.openBugWeight * 1.2,
        0,
        100,
      );
      stability += (stabilityTarget - stability) * Math.min(1, days);

      // Soporte: el fundador atiende a los primeros 2.500 usuarios; después
      // hace falta un agente de Soporte cada 2.500 (el Soporte con IA vale 3).
      // Sin gente, los tickets se acumulan y la satisfacción cae.
      const supportCapacity = 1 + role('support') + (hasSupportBot ? 3 : 0);
      const supportGap = Math.max(0, users / 2500 - supportCapacity);
      const supportEffective = Math.min(role('support'), 1 + users / 2500);
      const latencyPenalty = Math.max(0, (latency - 150) / 10);
      // Con más usuarios, más exigentes: 1.000 usuarios −3, 100.000 −9.
      const scalePenalty = users > 100 ? (Math.log10(users) - 2) * 3 : 0;
      const satTarget = clamp(
        55 +
          featureSatisfaction +
          Math.sqrt(role('ux')) * 4 +
          Math.min(6, role('frontend') * 2) +
          Math.min(4, supportEffective * 2) -
          Math.min(15, supportGap * 3) -
          scalePenalty -
          latencyPenalty -
          input.openBugWeight * (supportEffective > 0 ? 2 : 3) * profile.bugSeverityFactor -
          techDebt * 0.12 -
          overload * 40 -
          (hasCore ? 0 : 20) -
          (monetized ? Math.max(0, price - 1) * 15 : 0),
        0,
        100,
      );
      satisfaction += (satTarget - satisfaction) * Math.min(1, days * 0.8);
      const ratingTarget = 1 + 4 * (satisfaction / 100) ** 1.3;
      rating += (ratingTarget - rating) * Math.min(1, days * 0.3);

      const satChurnFactor = 1 + Math.max(0, (70 - satisfaction) / 30) - Math.max(0, (satisfaction - 85) / 100);
      const priceChurn = monetized ? 1 + Math.max(0, price - 1) * 0.8 - Math.max(0, 1 - price) * 0.3 : 1;
      const churn = clamp(
        0.04 * profile.churnMultiplier * (1 - retention) * satChurnFactor * priceChurn + overload * 0.05 + input.openBugWeight * 0.002,
        0.003,
        0.5,
      );

      const ratingFactor = clamp((rating - 1.5) / 2.5, 0.1, 1.4);
      const organic = 2 + fx.growth + role('marketing') * 6 + reputation * 0.1;
      const network = profile.networkEffect * clamp((users - 100) / 2000, -0.5, 1) * 0.01;
      // La viralidad se satura: los primeros usuarios invitan a sus amigos
      // con entusiasmo; con cientos de miles, casi todos ya te conocen.
      const viral = Math.max(0, fx.viral + role('community-manager') * 0.002 + network) / (1 + users / 150_000);
      const tamFactor = Math.max(0, 1 - users / profile.tam) ** 1.5;
      const priceGrowth = monetized ? clamp(1 - (price - 1) * 0.3, 0.7, 1.15) : 1;
      const dailyNew = launched ? (organic + users * viral) * profile.growthMultiplier * ratingFactor * tamFactor * priceGrowth : 0;
      const dailyLost = users * churn;

      const newUsers = stochasticRound(dailyNew * days, rng);
      const lostUsers = Math.min(users, stochasticRound(dailyLost * days, rng));
      users = users + newUsers - lostUsers;
      newTotal += newUsers;
      lostTotal += lostUsers;

      const arpu = monetized ? fx.arpu * price * (1 + conversion) * (0.5 + satisfaction / 200) : 0;
      const dailyRevenue = users * arpu;
      // Costos variables: servidores/almacenamiento por usuario y 3% de
      // comisión de la pasarela de pagos sobre lo que cobras.
      const dailyCosts = fixedDailyCosts + users * 0.002 + dailyRevenue * 0.03;
      revenueTotal += dailyRevenue * days;
      costsTotal += dailyCosts * days;
      cashFloat += (dailyRevenue - dailyCosts) * days;

      techDebt = clamp(techDebt - (1 + role('qa') * 1.5 + quality * 3) * days, 0, 100);
      reputation = clamp(
        reputation + ((satisfaction - 65) * 0.01 + supportEffective * 0.05 + fx.security * 0.03 - overload * 0.5) * days,
        0,
        100,
      );

      last = { churn, arpu, dailyNew, dailyLost, load, utilization, satTarget, dailyRevenue, dailyCosts, supportGap };
    }

    // Desarrollo: el poder del equipo se reparte entre las tareas activas
    // (máximo maxParallel a la vez; el resto espera en cola). Publicar suma
    // deuda técnica según dificultad y calidad del equipo.
    const { devPower, maxParallel } = teamDevPower(input.employees);
    const active = input.tasks.slice(0, maxParallel);
    const perTask = active.length > 0 ? devPower / active.length : 0;
    const tasks: EngineTaskUpdate[] = active.map((task) => {
      const spentSeconds = Math.min(task.requiredSeconds, task.spentSeconds + elapsed * perTask);
      const progress = clamp((spentSeconds / Math.max(1, task.requiredSeconds)) * 100, 0, 100);
      const completed = spentSeconds >= task.requiredSeconds;
      if (completed) techDebt = clamp(techDebt + task.difficulty * 1.5 * (1 - quality), 0, 100);
      return { id: task.id, featureSlug: task.featureSlug, spentSeconds, progress, completed, difficulty: task.difficulty };
    });

    const cashDelta = stochasticRound(cashFloat - input.company.cash, rng);
    const finalCash = input.company.cash + cashDelta;
    const debtDays = finalCash < 0 ? input.company.debtDays + totalDays : 0;
    const dailyProfit = last.dailyRevenue - last.dailyCosts;
    const ltv = last.churn > 0 ? last.arpu / last.churn : 0;
    // Valuación estilo startup: ingresos anuales × múltiplo (más crecimiento
    // y mejor rating = múltiplo más alto) + valor por usuario + caja.
    const dailyGrowthRate = users > 0 ? (last.dailyNew - last.dailyLost) / users : 0;
    const multiple = clamp(3 + dailyGrowthRate * 7 * 40, 2, 10) * (0.5 + rating / 8);
    const valuation = Math.max(
      0,
      Math.round(last.dailyRevenue * 365 * multiple + users * 2 * (rating / 4) + input.features.length * 300 + Math.max(0, finalCash)),
    );

    return {
      deltas: {
        cash: cashDelta,
        activeUsers: users - input.company.activeUsers,
        newUsers: newTotal,
        lostUsers: lostTotal,
        revenue: Math.round(revenueTotal),
        expenses: Math.round(costsTotal),
      },
      state: {
        satisfaction,
        rating,
        reputation,
        techDebt,
        stability,
        latency,
        debtDays,
        gameDays: input.company.gameDays + totalDays,
        valuation,
      },
      metrics: {
        launched,
        dailyRevenue: last.dailyRevenue,
        dailyCosts: last.dailyCosts,
        dailyProfit,
        dailySalaries,
        dailyInfra,
        dailyNewUsers: last.dailyNew,
        dailyLostUsers: last.dailyLost,
        churn: last.churn,
        arpu: last.arpu,
        ltv,
        load: last.load,
        capacity,
        utilization: last.utilization,
        runwayDays: dailyProfit < 0 ? Math.max(0, finalCash) / -dailyProfit : null,
        devPower,
        maxParallel,
        quality,
        security: fx.security,
        cacDiscount,
        satisfactionTarget: last.satTarget,
        supportGap: last.supportGap,
      },
      tasks,
    };
  }
}
