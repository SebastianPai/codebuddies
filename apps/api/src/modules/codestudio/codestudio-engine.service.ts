import { Injectable } from '@nestjs/common';
import { CodeStudioCompany, CodeStudioDevelopmentStatus } from '@prisma/client';

type SimulatedCompany = CodeStudioCompany & {
  modules?: Array<{ module: { effects?: any } }>;
  employees?: Array<{
    id: string;
    productivity: number;
    speed: number;
    quality: number;
    stress: number;
    salary: number;
  }>;
  infrastructure?: Array<{
    level: number;
    capacity: number;
    latency: number;
    stability: number;
    cost: number;
  }>;
  development?: Array<{
    id: string;
    progress: number;
    spentSeconds: number;
    requiredSeconds: number;
    status: CodeStudioDevelopmentStatus;
    assignedEmployees?: unknown;
    module: { id: string; name?: string; cost: number; developmentSeconds: number; effects?: any };
  }>;
};

// Espejo de CodeStudioAppType.simulationProfile (JSON, sembrado por tipo de
// app en seed-codestudio.ts). "0.5" es el valor NEUTRO para
// retentionBase/bugTolerance (igual al comportamiento de antes de esta
// fase, para que una empresa sin perfil — dato viejo o tipo sin sembrar —
// no cambie de comportamiento).
export type AppSimulationProfile = {
  growthMultiplier?: number;
  retentionBase?: number;
  infraCostMultiplier?: number;
  networkEffect?: number;
  bugTolerance?: number;
  channelEffectiveness?: Record<string, number>;
};

@Injectable()
export class CodeStudioEngineService {
  // openBugPenalty = suma de pesos por severidad de los CodeStudioBug OPEN de
  // la empresa (ver bugSeverityWeight en codestudio.service.ts) — mientras un
  // bug siga sin resolverse, castiga rating/estabilidad en cada tick,
  // escalado por las horas transcurridas igual que el resto de la
  // simulacion. Asi ignorar un bug tiene un costo real y creciente, no solo
  // cosmetico.
  // techBonus = suma de los effects.stability/latency de las tecnologias que
  // la empresa ya desbloqueo (arbol de tecnologia, CodeStudioCompanyTechnology)
  // — a diferencia del bono de infraestructura por instalacion, esto es un
  // BUFF PERMANENTE que hay que reaplicar en cada tick porque stability/
  // latency se recalculan desde cero a partir del promedio de infraestructura,
  // no son acumulativos.
  // appProfile = CodeStudioAppType.simulationProfile de la empresa — hace que
  // el TIPO de app cambie de verdad la simulacion (antes solo era
  // nombre/icono/color decorativos). Se normaliza con resolveAppProfile()
  // para que faltar un campo (o el perfil entero) sea un no-op, no un bug.
  // reputationSignals = "la reputacion depende de reseñas, bugs, soporte,
  // seguridad" — supportCount (empleados support/community-manager),
  // securityTechCount (nodos desbloqueados de la rama Plataforma del arbol
  // de tecnologia, que incluye "Seguridad") y fixedBugsCount (historial de
  // bugs resueltos) empujan la reputacion hacia arriba con el tiempo.
  simulate(
    company: SimulatedCompany,
    elapsedSeconds: number,
    openBugPenalty = 0,
    techBonus: { stability: number; latency: number } = { stability: 0, latency: 0 },
    appProfile: AppSimulationProfile = {},
    reputationSignals: { supportCount: number; securityTechCount: number; fixedBugsCount: number } = {
      supportCount: 0,
      securityTechCount: 0,
      fixedBugsCount: 0,
    },
  ) {
    const profile = this.resolveAppProfile(appProfile);
    const safeSeconds = Math.max(0, Math.min(elapsedSeconds, 60 * 60 * 24 * 3));
    const hours = safeSeconds / 3600;
    const employees = company.employees ?? [];
    const infrastructure = company.infrastructure ?? [];
    const modules = company.modules ?? [];

    const productivity =
      employees.length > 0
        ? employees.reduce((sum, employee) => sum + employee.productivity * employee.speed, 0)
        : 0.35;
    const quality =
      employees.length > 0
        ? employees.reduce((sum, employee) => sum + employee.quality, 0) / employees.length
        : 0.75;
    const monthlySalary = employees.reduce((sum, employee) => sum + employee.salary, 0);
    const infraCapacity =
      infrastructure.reduce((sum, item) => sum + item.capacity * Math.max(1, item.level ?? 1), 0) || 1000;
    const infraCost = infrastructure.reduce((sum, item) => sum + item.cost * Math.max(1, item.level ?? 1), 0);
    const infraLatency =
      infrastructure.length > 0
        ? infrastructure.reduce((sum, item) => sum + item.latency, 0) / infrastructure.length
        : 180;
    const infraStability =
      infrastructure.length > 0
        ? infrastructure.reduce((sum, item) => sum + item.stability, 0) / infrastructure.length
        : 94;

    const moduleGrowth = modules.reduce((sum, entry) => sum + Number(entry.module.effects?.growth ?? 0.02), 0);
    const moduleRevenue = modules.reduce((sum, entry) => sum + Number(entry.module.effects?.revenue ?? 0.01), 0);
    const moduleSatisfaction = modules.reduce((sum, entry) => sum + Number(entry.module.effects?.satisfaction ?? 0.1), 0);
    const overload = company.activeUsers > infraCapacity ? (company.activeUsers - infraCapacity) / infraCapacity : 0;
    const bugsDelta = Math.max(0, overload * 4 - quality * 0.25) * hours;
    // bugSeverityFactor: apps con poca tolerancia a bugs (banca, streaming)
    // sienten el mismo nivel de errores mucho mas que una red social.
    const satisfaction = this.clamp(
      company.satisfaction + moduleSatisfaction * hours - overload * 12 * hours - bugsDelta * profile.bugSeverityFactor,
      0,
      100,
    );
    // networkFactor: solo tiene efecto real cuando networkEffect > 0 (red
    // social). Por debajo de la masa critica (50 usuarios) resta
    // crecimiento — "si no hay suficientes usuarios activos, los nuevos
    // abandonan rapido" — y por encima lo empuja (efecto red de verdad).
    const networkFactor = profile.networkEffect * this.clamp((company.activeUsers - 50) / 200, -1, 1);
    // ratingFactor: antes el rating (reseñas/estrellas) solo mejoraba la
    // eficiencia de campañas pagas y la valuacion — una app de 1 estrella
    // crecia organicamente igual que una de 5. Ahora una app mal calificada
    // tambien pierde crecimiento organico (y una bien calificada lo gana),
    // centrado en 3 estrellas (neutro) para no cambiar el comportamiento de
    // una empresa recien fundada (arranca en rating 4 por blueprint).
    const ratingFactor = (company.rating - 3) * 0.025;
    const growthRate = Math.max(
      -0.1,
      (0.04 + moduleGrowth + company.reputation / 500 + satisfaction / 5000 - overload * 0.2 + networkFactor + ratingFactor) *
        profile.growthMultiplier,
    );
    const newUsers = Math.max(0, Math.floor(company.activeUsers * growthRate * hours + modules.length * 2 * hours + 8 * hours));
    const lostUsers = Math.max(
      0,
      Math.floor(company.activeUsers * Math.max(0.005, (100 - satisfaction) / 2500) * profile.churnMultiplier * hours),
    );
    const activeUsers = Math.max(0, company.activeUsers + newUsers - lostUsers);
    const grossRevenue = Math.floor(activeUsers * (0.02 + moduleRevenue) * hours);
    const expenses = Math.floor((monthlySalary / 720 + (infraCost * profile.infraCostMultiplier) / 720 + company.bugs * 0.15) * hours);
    const cash = company.cash + grossRevenue - expenses;
    const reputationBonus =
      reputationSignals.supportCount * 0.15 +
      reputationSignals.securityTechCount * 0.1 +
      Math.log2(reputationSignals.fixedBugsCount + 1) * 0.08;
    const reputation = this.clamp(
      company.reputation + (satisfaction - 70) * 0.002 * hours - overload * hours + reputationBonus * hours,
      0,
      100,
    );
    const bugPenalty = openBugPenalty * hours;
    const rating = this.clamp(
      2.5 + satisfaction / 35 - (company.bugs / 80) * profile.bugSeverityFactor - overload - bugPenalty * 0.08 * profile.bugSeverityFactor,
      1,
      5,
    );
    const valuation = Math.max(0, Math.floor(activeUsers * rating * 8 + grossRevenue * 12 + reputation * 250 + company.innovation * 500));

    // Founder-solo baseline: si una tarea no tiene empleados asignados (o
    // los que tenia ya no estan en la empresa), avanza igual pero al ritmo
    // de "el fundador la codea solo" — asignar gente de verdad es lo que la
    // acelera, no un adorno. Antes esto usaba `productivity` (la suma de
    // TODO el plantel) para CADA tarea a la vez, asi que tener 10 features
    // en paralelo no costaba nada; ahora cada tarea vive de a quien se le
    // asigno, y un mismo empleado no puede estar en dos tareas IN_PROGRESS
    // (bloqueado en codestudio.service.ts:startDevelopment).
    const soloFounderProductivity = 0.35;
    const developmentUpdates = (company.development ?? [])
      .filter(
        (task) =>
          task.status === CodeStudioDevelopmentStatus.QUEUED ||
          task.status === CodeStudioDevelopmentStatus.IN_PROGRESS,
      )
      .map((task) => {
        const assignedIds = Array.isArray(task.assignedEmployees)
          ? (task.assignedEmployees as unknown[]).filter((id): id is string => typeof id === 'string')
          : [];
        const assignedEmployees = employees.filter((employee) => assignedIds.includes(employee.id));
        const taskProductivity =
          assignedEmployees.length > 0
            ? assignedEmployees.reduce((sum, employee) => sum + employee.productivity * employee.speed, 0)
            : soloFounderProductivity;
        const spentSeconds = Math.min(task.requiredSeconds, task.spentSeconds + Math.floor(safeSeconds * Math.max(0.1, taskProductivity)));
        const progress = this.clamp((spentSeconds / Math.max(1, task.requiredSeconds)) * 100, 0, 100);
        const completed = progress >= 100;
        return {
          id: task.id,
          moduleId: task.module.id,
          moduleName: task.module.name ?? task.module.id,
          spentSeconds,
          progress,
          status: completed ? CodeStudioDevelopmentStatus.COMPLETED : CodeStudioDevelopmentStatus.IN_PROGRESS,
          completed,
        };
      });

    return {
      company: {
        activeUsers,
        totalUsers: company.totalUsers + newUsers,
        revenue: company.revenue + grossRevenue,
        expenses: company.expenses + expenses,
        cash,
        satisfaction,
        bugs: this.clamp(company.bugs + bugsDelta - quality * 0.15 * hours, 0, 100),
        latency: Math.max(20, infraLatency + overload * 240 + techBonus.latency),
        stability: this.clamp(infraStability - overload * 25 - bugsDelta * 0.2 - bugPenalty * 1.2 + techBonus.stability, 0, 100),
        reputation,
        rating,
        valuation,
        tickCount: company.tickCount + 1,
        lastSimulatedAt: new Date(),
        status: activeUsers > 25 || modules.length > 2 ? 'LIVE' : company.status,
      },
      snapshot: {
        activeUsers,
        newUsers,
        lostUsers,
        retention: activeUsers > 0 ? this.clamp(1 - lostUsers / Math.max(1, activeUsers), 0, 1) : 1,
        conversion: this.clamp(0.01 + moduleRevenue + satisfaction / 5000, 0, 1),
        errors: this.clamp(company.bugs + bugsDelta + overload * 15, 0, 100),
        latency: Math.max(20, infraLatency + overload * 240 + techBonus.latency),
        rating,
        revenue: grossRevenue,
        expenses,
        metadata: { overload, productivity, quality },
      },
      developmentUpdates,
    };
  }

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
  }

  // 0.5 es el valor neutro para retentionBase/bugTolerance a proposito: con
  // eso, churnMultiplier y bugSeverityFactor dan exactamente 1 (sin efecto),
  // que es el comportamiento que tenia el motor ANTES de esta fase — asi una
  // empresa sin perfil sembrado no cambia de comportamiento de la nada.
  private resolveAppProfile(profile: AppSimulationProfile) {
    const growthMultiplier = Number.isFinite(profile.growthMultiplier) ? (profile.growthMultiplier as number) : 1;
    const retentionBase = Number.isFinite(profile.retentionBase) ? (profile.retentionBase as number) : 0.5;
    const infraCostMultiplier = Number.isFinite(profile.infraCostMultiplier) ? (profile.infraCostMultiplier as number) : 1;
    const networkEffect = Number.isFinite(profile.networkEffect) ? (profile.networkEffect as number) : 0;
    const bugTolerance = Number.isFinite(profile.bugTolerance) ? (profile.bugTolerance as number) : 0.5;

    return {
      growthMultiplier: this.clamp(growthMultiplier, 0.3, 2.5),
      infraCostMultiplier: this.clamp(infraCostMultiplier, 0.3, 3),
      networkEffect: this.clamp(networkEffect, 0, 1),
      churnMultiplier: this.clamp(2 - 2 * retentionBase, 0.4, 1.6),
      bugSeverityFactor: this.clamp(2 - 2 * bugTolerance, 0.4, 1.6),
    };
  }
}
