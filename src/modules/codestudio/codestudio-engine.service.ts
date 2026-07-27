import { Injectable } from '@nestjs/common';
import { CodeStudioCompany, CodeStudioDevelopmentStatus } from '@prisma/client';

type SimulatedCompany = CodeStudioCompany & {
  modules?: Array<{ module: { effects?: any } }>;
  employees?: Array<{
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
    module: { id: string; name?: string; cost: number; developmentSeconds: number; effects?: any };
  }>;
};

@Injectable()
export class CodeStudioEngineService {
  simulate(company: SimulatedCompany, elapsedSeconds: number) {
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
    const satisfaction = this.clamp(company.satisfaction + moduleSatisfaction * hours - overload * 12 * hours - bugsDelta, 0, 100);
    const growthRate = Math.max(-0.1, 0.04 + moduleGrowth + company.reputation / 500 + satisfaction / 5000 - overload * 0.2);
    const newUsers = Math.max(0, Math.floor(company.activeUsers * growthRate * hours + modules.length * 2 * hours + 8 * hours));
    const lostUsers = Math.max(0, Math.floor(company.activeUsers * Math.max(0.005, (100 - satisfaction) / 2500) * hours));
    const activeUsers = Math.max(0, company.activeUsers + newUsers - lostUsers);
    const grossRevenue = Math.floor(activeUsers * (0.02 + moduleRevenue) * hours);
    const expenses = Math.floor((monthlySalary / 720 + infraCost / 720 + company.bugs * 0.15) * hours);
    const cash = company.cash + grossRevenue - expenses;
    const reputation = this.clamp(company.reputation + (satisfaction - 70) * 0.002 * hours - overload * hours, 0, 100);
    const rating = this.clamp(2.5 + satisfaction / 35 - company.bugs / 80 - overload, 1, 5);
    const valuation = Math.max(0, Math.floor(activeUsers * rating * 8 + grossRevenue * 12 + reputation * 250 + company.innovation * 500));

    const developmentUpdates = (company.development ?? [])
      .filter(
        (task) =>
          task.status === CodeStudioDevelopmentStatus.QUEUED ||
          task.status === CodeStudioDevelopmentStatus.IN_PROGRESS,
      )
      .map((task) => {
        const spentSeconds = Math.min(task.requiredSeconds, task.spentSeconds + Math.floor(safeSeconds * Math.max(0.1, productivity)));
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
        latency: Math.max(20, infraLatency + overload * 240),
        stability: this.clamp(infraStability - overload * 25 - bugsDelta * 0.2, 0, 100),
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
        latency: Math.max(20, infraLatency + overload * 240),
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
}
