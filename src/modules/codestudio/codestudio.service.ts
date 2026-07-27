import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CodeStudioDevelopmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CodeStudioEngineService } from './codestudio-engine.service';
import { CreateCodeStudioCompanyDto } from './dto/create-codestudio-company.dto';
import { StartDevelopmentDto } from './dto/start-development.dto';

const companyInclude = {
  appType: true,
  modules: { include: { module: true }, orderBy: { installedAt: 'asc' as const } },
  employees: { include: { employeeType: true } },
  infrastructure: { include: { infrastructureType: true } },
  development: { include: { module: true }, orderBy: { createdAt: 'desc' as const } },
  snapshots: { orderBy: { createdAt: 'desc' as const }, take: 24 },
  events: { orderBy: { createdAt: 'desc' as const }, take: 20 },
};

@Injectable()
export class CodeStudioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: CodeStudioEngineService,
  ) {}

  async catalog() {
    const [appTypes, modules, technologies, research, campaigns, events, employees, infrastructure, achievements] =
      await Promise.all([
        this.prisma.codeStudioAppType.findMany({
          where: { active: true, visible: true },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
          include: { blueprint: { include: { modules: { include: { module: true }, orderBy: { order: 'asc' } } } } },
        }),
        this.prisma.codeStudioModule.findMany({
          where: { active: true, visible: true },
          orderBy: [{ category: 'asc' }, { order: 'asc' }],
        }),
        this.prisma.codeStudioTechnology.findMany({ where: { active: true }, orderBy: [{ category: 'asc' }, { order: 'asc' }] }),
        this.prisma.codeStudioResearch.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
        this.prisma.codeStudioCampaign.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
        this.prisma.codeStudioEventTemplate.findMany({ where: { active: true }, orderBy: [{ category: 'asc' }, { weight: 'desc' }] }),
        this.prisma.codeStudioEmployeeType.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
        this.prisma.codeStudioInfrastructureType.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
        this.prisma.codeStudioAchievement.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
      ]);

    return { appTypes, modules, technologies, research, campaigns, events, employees, infrastructure, achievements };
  }

  async myStudio(userId: string) {
    const companies = await this.prisma.codeStudioCompany.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: companyInclude,
    });

    return {
      companies: await Promise.all(companies.map((company) => this.simulateAndReload(userId, company.id))),
      catalog: await this.catalog(),
    };
  }

  async createCompany(userId: string, dto: CreateCodeStudioCompanyDto) {
    const appType = await this.prisma.codeStudioAppType.findUnique({
      where: { id: dto.appTypeId },
      include: {
        blueprint: {
          include: { modules: { include: { module: true }, orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!appType?.blueprint) throw new BadRequestException('Este tipo de app no tiene blueprint activo');
    const blueprint = appType.blueprint;

    const initialStats = (blueprint.initialStats ?? {}) as Record<string, any>;
    const initialInfrastructure = (blueprint.initialInfrastructure ?? []) as Array<{ slug: string; level?: number }>;
    const recommendedEmployees = (blueprint.recommendedEmployees ?? []) as Array<{ slug: string; count?: number }>;

    return this.prisma.$transaction(async (tx) => {
      const company = await tx.codeStudioCompany.create({
        data: {
          userId,
          appTypeId: appType.id,
          name: dto.name.trim(),
          cash: Number(initialStats.cash ?? 5000),
          reputation: Number(initialStats.reputation ?? 5),
          innovation: Number(initialStats.innovation ?? 1),
          satisfaction: Number(initialStats.satisfaction ?? 75),
          blueprintSnapshot: blueprint as unknown as Prisma.InputJsonValue,
          stats: initialStats as Prisma.InputJsonValue,
        },
      });

      const starterModules = blueprint.modules.filter((entry) => entry.required).slice(0, 3);
      for (const entry of starterModules) {
        await tx.codeStudioCompanyModule.create({
          data: { companyId: company.id, moduleId: entry.moduleId, config: entry.config as Prisma.InputJsonValue },
        });
      }

      const firstSprintModules = blueprint.modules
        .filter((entry) => !entry.required)
        .slice(0, 3);
      for (const entry of firstSprintModules) {
        await tx.codeStudioDevelopmentTask.create({
          data: {
            companyId: company.id,
            moduleId: entry.moduleId,
            status: CodeStudioDevelopmentStatus.IN_PROGRESS,
            requiredSeconds: Math.max(300, entry.module.developmentSeconds),
            startedAt: new Date(),
            assignedEmployees: [] as Prisma.InputJsonValue,
          },
        });
      }

      for (const infra of initialInfrastructure) {
        const type = await tx.codeStudioInfrastructureType.findUnique({ where: { slug: infra.slug } });
        if (!type) continue;
        await tx.codeStudioInfrastructure.create({
          data: {
            companyId: company.id,
            infrastructureTypeId: type.id,
            level: infra.level ?? 1,
            capacity: Number((type.scaling as any)?.capacity ?? 1000) * (infra.level ?? 1),
            latency: Number((type.scaling as any)?.latency ?? 120),
            stability: Number((type.scaling as any)?.stability ?? 98),
            cost: type.baseCost,
          },
        });
      }

      for (const employee of recommendedEmployees.slice(0, 2)) {
        const type = await tx.codeStudioEmployeeType.findUnique({ where: { slug: employee.slug } });
        if (!type) continue;
        await tx.codeStudioEmployee.create({
          data: {
            companyId: company.id,
            employeeTypeId: type.id,
            name: this.generateEmployeeName(),
            avatar: `avatar-${type.slug}`,
            age: 20 + Math.floor(Math.random() * 22),
            salary: type.salary,
            productivity: Number((type.baseStats as any)?.productivity ?? 1),
            creativity: Number((type.baseStats as any)?.creativity ?? 1),
            speed: Number((type.baseStats as any)?.speed ?? 1),
            quality: Number((type.baseStats as any)?.quality ?? 1),
          },
        });
      }

      await tx.codeStudioEventLog.createMany({
        data: [
          {
            companyId: company.id,
            title: 'Bienvenido CEO',
            description: 'Tu primera app fue creada desde Blueprint. El primer sprint ya esta corriendo automaticamente.',
            effects: { tutorialStep: 1 },
          },
          {
            companyId: company.id,
            title: 'Primer backlog generado',
            description: 'El equipo priorizo las primeras features. Los ticks del juego avanzaran el desarrollo sin botones manuales.',
            effects: { tutorialStep: 2 },
          },
          {
            companyId: company.id,
            title: 'QA encontro bugs iniciales',
            description: 'Toda startup nace con deuda tecnica. Revisa el panel de Bugs para decidir prioridades.',
            effects: { bugs: 3 },
          },
        ],
      });

      return tx.codeStudioCompany.findUniqueOrThrow({ where: { id: company.id }, include: companyInclude });
    });
  }

  async getCompany(userId: string, companyId: string) {
    return this.simulateAndReload(userId, companyId);
  }

  async startDevelopment(userId: string, companyId: string, dto: StartDevelopmentDto) {
    const company = await this.requireCompany(userId, companyId);
    const module = await this.prisma.codeStudioModule.findUnique({ where: { id: dto.moduleId } });
    if (!module || !module.active) throw new NotFoundException('Modulo no disponible');

    const alreadyInstalled = await this.prisma.codeStudioCompanyModule.findUnique({
      where: { companyId_moduleId: { companyId: company.id, moduleId: module.id } },
    });
    if (alreadyInstalled) throw new BadRequestException('Este modulo ya esta instalado');
    if (company.cash < module.cost) throw new BadRequestException('Fondos insuficientes');

    const task = await this.prisma.$transaction(async (tx) => {
      await tx.codeStudioCompany.update({
        where: { id: company.id },
        data: { cash: { decrement: module.cost }, expenses: { increment: module.cost } },
      });
      return tx.codeStudioDevelopmentTask.create({
        data: {
          companyId: company.id,
          moduleId: module.id,
          requiredSeconds: module.developmentSeconds,
          status: CodeStudioDevelopmentStatus.IN_PROGRESS,
          startedAt: new Date(),
          assignedEmployees: (dto.assignedEmployees ?? []) as Prisma.InputJsonValue,
        },
        include: { module: true },
      });
    });

    return { task, company: await this.simulateAndReload(userId, companyId) };
  }

  async tick(userId: string, companyId: string) {
    return this.simulateAndReload(userId, companyId, true);
  }

  async runGlobalTick() {
    const companies = await this.prisma.codeStudioCompany.findMany({
      orderBy: { lastSimulatedAt: 'asc' },
      take: 200,
      include: companyInclude,
    });

    for (const company of companies) {
      await this.simulateCompany(company as any, true);
    }

    return { processed: companies.length };
  }

  async ranking() {
    return this.prisma.codeStudioCompany.findMany({
      take: 50,
      orderBy: [{ valuation: 'desc' }, { activeUsers: 'desc' }],
      include: { appType: true, user: { select: { username: true, avatarUrl: true } } },
    });
  }

  async adminList(resource: string) {
    return this.model(resource).findMany({ orderBy: { order: 'asc' } }).catch(() => this.model(resource).findMany());
  }

  async adminCreate(resource: string, data: Record<string, any>) {
    return this.model(resource).create({ data: this.sanitizeAdminPayload(data) });
  }

  async adminUpdate(resource: string, id: string, data: Record<string, any>) {
    return this.model(resource).update({
      where: { id },
      data: this.sanitizeAdminPayload(data),
    });
  }

  async adminDelete(resource: string, id: string) {
    return this.model(resource).delete({ where: { id } });
  }

  private async simulateAndReload(userId: string, companyId: string, force = false) {
    const company = await this.requireCompany(userId, companyId);
    await this.simulateCompany(company as any, force);

    return this.prisma.codeStudioCompany.findUniqueOrThrow({ where: { id: company.id }, include: companyInclude });
  }

  private async simulateCompany(company: Awaited<ReturnType<typeof this.requireCompany>>, force = false) {
    const elapsedSeconds = Math.floor((Date.now() - company.lastSimulatedAt.getTime()) / 1000);
    if (!force && elapsedSeconds < 30) return;

    const result = this.engine.simulate(company as any, Math.max(elapsedSeconds, force ? 10 : 0));
    await this.prisma.$transaction(async (tx) => {
      await tx.codeStudioCompany.update({ where: { id: company.id }, data: result.company as any });
      await tx.codeStudioAnalyticsSnapshot.create({
        data: { companyId: company.id, ...result.snapshot },
      });

      const nextTick = Number((result.company as any).tickCount ?? company.tickCount + 1);
      if (result.snapshot.newUsers > 0 && nextTick % 3 === 0) {
        await tx.codeStudioEventLog.create({
          data: {
            companyId: company.id,
            title: `Nuevo pico de trafico: +${result.snapshot.newUsers} usuarios`,
            description: 'La empresa gano usuarios mientras el equipo seguia trabajando.',
            effects: { newUsers: result.snapshot.newUsers },
          },
        });
      }
      if (result.snapshot.errors > 18 && nextTick % 4 === 0) {
        await tx.codeStudioEventLog.create({
          data: {
            companyId: company.id,
            title: 'Bug detectado automaticamente',
            description: 'El motor detecto errores por complejidad, trafico o infraestructura insuficiente.',
            effects: { errors: result.snapshot.errors },
          },
        });
      }
      if (result.snapshot.latency > 180 && nextTick % 5 === 0) {
        await tx.codeStudioEventLog.create({
          data: {
            companyId: company.id,
            title: 'Servidor saturado',
            description: 'La latencia subio. Conviene mejorar cache, CDN o balanceador.',
            effects: { latency: result.snapshot.latency },
          },
        });
      }

      for (const task of result.developmentUpdates) {
        await tx.codeStudioDevelopmentTask.update({
          where: { id: task.id },
          data: {
            spentSeconds: task.spentSeconds,
            progress: task.progress,
            status: task.status,
            completedAt: task.completed ? new Date() : undefined,
          },
        });
        if (task.completed) {
          await tx.codeStudioCompanyModule.upsert({
            where: { companyId_moduleId: { companyId: company.id, moduleId: task.moduleId } },
            update: {},
            create: { companyId: company.id, moduleId: task.moduleId },
          });
          await tx.codeStudioEventLog.create({
            data: {
              companyId: company.id,
              title: `Release automatico: ${task.moduleName}`,
              description: `${task.moduleName} fue completado por el equipo y publicado en la app.`,
              effects: { moduleId: task.moduleId },
            },
          });
        }
      }
    });
  }

  private async requireCompany(userId: string, companyId: string) {
    const company = await this.prisma.codeStudioCompany.findUnique({ where: { id: companyId }, include: companyInclude });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    if (company.userId !== userId) throw new ForbiddenException('No puedes acceder a esta empresa');
    return company;
  }

  private model(resource: string): any {
    const models: Record<string, keyof PrismaService> = {
      appTypes: 'codeStudioAppType',
      modules: 'codeStudioModule',
      technologies: 'codeStudioTechnology',
      research: 'codeStudioResearch',
      campaigns: 'codeStudioCampaign',
      events: 'codeStudioEventTemplate',
      employees: 'codeStudioEmployeeType',
      infrastructure: 'codeStudioInfrastructureType',
      achievements: 'codeStudioAchievement',
      blueprints: 'codeStudioBlueprint',
    };
    const modelName = models[resource];
    if (!modelName) throw new NotFoundException('Recurso CodeStudio no existe');
    return (this.prisma as any)[modelName];
  }

  private sanitizeAdminPayload(data: Record<string, any>) {
    const blocked = new Set([
      'id',
      'createdAt',
      'updatedAt',
      'appType',
      'blueprint',
      'companies',
      'modules',
      'module',
      'blueprintModules',
      'installedModules',
      'developmentTasks',
      'eventLogs',
      'employees',
      'infrastructure',
      'eventLogs',
      'snapshots',
      'events',
      'user',
    ]);

    return Object.fromEntries(
      Object.entries(data).filter(([key, value]) => {
        if (blocked.has(key)) return false;
        return value !== undefined;
      }),
    );
  }

  private generateEmployeeName() {
    const first = ['Nico', 'Luna', 'Max', 'Ari', 'Sofi', 'Kai', 'Vale', 'Leo', 'Mara', 'Noah'];
    const last = ['Pixel', 'Stack', 'Cloud', 'Sprint', 'Byte', 'Nova', 'Cache', 'Loop', 'Script', 'Rocket'];
    return `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`;
  }
}
