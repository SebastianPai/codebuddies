import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CodeStudioBugSeverity,
  CodeStudioBugStatus,
  CodeStudioCompanyStatus,
  CodeStudioDevelopmentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppSimulationProfile, CodeStudioEngineService } from './codestudio-engine.service';
import { CreateCodeStudioCompanyDto } from './dto/create-codestudio-company.dto';
import { StartDevelopmentDto } from './dto/start-development.dto';
import { HireEmployeeDto } from './dto/hire-employee.dto';
import { InstallInfrastructureDto } from './dto/install-infrastructure.dto';
import { FixBugDto } from './dto/fix-bug.dto';
import { LaunchCampaignDto } from './dto/launch-campaign.dto';
import { UnlockTechnologyDto } from './dto/unlock-technology.dto';

const companyInclude = {
  appType: true,
  modules: { include: { module: true }, orderBy: { installedAt: 'asc' as const } },
  employees: { include: { employeeType: true } },
  infrastructure: { include: { infrastructureType: true } },
  development: { include: { module: true }, orderBy: { createdAt: 'desc' as const } },
  snapshots: { orderBy: { createdAt: 'desc' as const }, take: 24 },
  events: { orderBy: { createdAt: 'desc' as const }, take: 20 },
  bugReports: { where: { status: CodeStudioBugStatus.OPEN }, orderBy: { createdAt: 'desc' as const } },
  technologies: { include: { technology: true } },
};

// Umbrales identicos a los que ya disparaban los CodeStudioEventLog
// informativos ("Bug detectado automaticamente", "Servidor saturado") — en
// vez de inventar condiciones paralelas, cada una ahora TAMBIEN puede crear
// un CodeStudioBug real y resoluble si todavia no hay uno abierto de ese
// mismo "kind" para la empresa.
const BUG_DEFINITIONS = [
  {
    kind: 'traffic-errors',
    title: 'Errores de trafico',
    // devRisk multiplica el "errors" efectivo: publicar muchas features con
    // poco QA hace que el mismo nivel real de errores dispare el bug antes
    // y con mas severidad — ver devRiskFactor en simulateCompany.
    condition: (snapshot: { errors: number; devRisk: number }) => snapshot.errors * snapshot.devRisk > 18,
    severity: (snapshot: { errors: number; devRisk: number }): CodeStudioBugSeverity => {
      const effective = snapshot.errors * snapshot.devRisk;
      return effective > 45 ? 'CRITICAL' : effective > 30 ? 'HIGH' : 'MEDIUM';
    },
    description: 'El motor detecto errores por complejidad, trafico o infraestructura insuficiente.',
  },
  {
    kind: 'latency',
    title: 'Servidor saturado',
    condition: (snapshot: { latency: number }) => snapshot.latency > 180,
    severity: (snapshot: { latency: number }): CodeStudioBugSeverity =>
      snapshot.latency > 320 ? 'CRITICAL' : snapshot.latency > 240 ? 'HIGH' : 'MEDIUM',
    description: 'La latencia subio. Conviene mejorar cache, CDN o balanceador, o resolverlo ahora.',
  },
  {
    kind: 'stability',
    title: 'Inestabilidad de datos',
    // devRisk tambien empuja este: features nuevas sin testear suelen
    // tocar datos/migraciones y bajar la estabilidad real mas rapido — con
    // devRisk alto el umbral sube (mas facil de disparar), con devRisk bajo
    // (muchos QA, pocas features) baja (mas dificil, mas perdonavida).
    condition: (snapshot: { stability: number; devRisk: number }) => snapshot.stability < Math.min(99, 96 * snapshot.devRisk),
    severity: (snapshot: { stability: number }): CodeStudioBugSeverity =>
      snapshot.stability < 80 ? 'CRITICAL' : snapshot.stability < 90 ? 'HIGH' : 'MEDIUM',
    description: 'Riesgo de perdida de sesiones y datos por infraestructura poco confiable.',
  },
] satisfies Array<{
  kind: string;
  title: string;
  condition: (s: any) => boolean;
  severity: (s: any) => CodeStudioBugSeverity;
  description: string;
}>;

const BUG_FIX_COST: Record<CodeStudioBugSeverity, number> = {
  LOW: 150,
  MEDIUM: 350,
  HIGH: 650,
  CRITICAL: 1100,
};

const BUG_SEVERITY_WEIGHT: Record<CodeStudioBugSeverity, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 5,
};

// Los 3 "kinds" de bug (traffic-errors, latency, stability) son todos
// problemas de servidor/infra/datos — un Frontend, UX, Marketing, Soporte,
// Community Manager o Product Manager no tiene con que resolverlos gratis
// asignandose; solo perfiles tecnicos de backend pueden.
const BUG_CAPABLE_EMPLOYEE_SLUGS = new Set(['backend', 'fullstack', 'devops', 'qa', 'data-scientist']);

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

  // La empresa nace VACÍA a propósito (sin módulos/tareas/infra/empleados
  // pre-armados) — el jugador la funda con la plata inicial del blueprint,
  // pero cada pieza (primera feature, primer empleado, primer servidor) la
  // agrega él mismo con hireEmployee/installInfrastructure/startDevelopment.
  // Antes esto instalaba hasta 3 módulos ya activos + 3 tareas ya en
  // progreso + infra + 2 empleados en una sola transacción, así que crear
  // una empresa se sentía como un formulario de panel admin en vez de un
  // juego (el jugador nunca decidía nada).
  async createCompany(userId: string, dto: CreateCodeStudioCompanyDto) {
    const appType = await this.prisma.codeStudioAppType.findUnique({
      where: { id: dto.appTypeId },
      include: {
        blueprint: true,
      },
    });
    if (!appType?.blueprint) throw new BadRequestException('Este tipo de app no tiene blueprint activo');
    const blueprint = appType.blueprint;

    const initialStats = (blueprint.initialStats ?? {}) as Record<string, any>;

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

      await tx.codeStudioEventLog.create({
        data: {
          companyId: company.id,
          title: 'Bienvenido CEO',
          description:
            'Tu startup arranca de cero: todavia no tenes features, equipo ni infraestructura. Elegi tu primera feature en el Backlog, contrata a tu primer empleado, e instala tu primer servidor para salir en vivo.',
          effects: { tutorialStep: 0 },
        },
      });

      return tx.codeStudioCompany.findUniqueOrThrow({ where: { id: company.id }, include: companyInclude });
    });
  }

  // Contratar es una decision del jugador (antes solo pasaba automatico al
  // crear la empresa): cobra un bono de contratacion (el salario de un mes)
  // y agrega el empleado — el sueldo recurrente ya lo descuenta el motor de
  // simulacion por tick (codestudio-engine.service.ts), no hace falta nada
  // mas aca.
  async hireEmployee(userId: string, companyId: string, dto: HireEmployeeDto) {
    const company = await this.requireCompany(userId, companyId);
    const type = await this.prisma.codeStudioEmployeeType.findUnique({ where: { id: dto.employeeTypeId } });
    if (!type || !type.active) throw new NotFoundException('Tipo de empleado no disponible');
    if (company.cash < type.salary) throw new BadRequestException('Fondos insuficientes para el bono de contratacion');

    await this.prisma.$transaction(async (tx) => {
      await tx.codeStudioCompany.update({
        where: { id: company.id },
        data: { cash: { decrement: type.salary }, expenses: { increment: type.salary } },
      });
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
    });

    return this.simulateAndReload(userId, companyId);
  }

  // Igual que hireEmployee: instalar un tipo nuevo cobra su costo base;
  // volver a "instalar" un tipo ya presente lo mejora de nivel (mismo
  // criterio de escalado de costo/capacidad que ya usaba la creacion
  // automatica vieja: costo y capacidad se multiplican por el nivel).
  async installInfrastructure(userId: string, companyId: string, dto: InstallInfrastructureDto) {
    const company = await this.requireCompany(userId, companyId);
    const type = await this.prisma.codeStudioInfrastructureType.findUnique({ where: { id: dto.infrastructureTypeId } });
    if (!type || !type.active) throw new NotFoundException('Tipo de infraestructura no disponible');

    const existing = company.infrastructure.find((item) => item.infrastructureTypeId === type.id);
    const nextLevel = (existing?.level ?? 0) + 1;
    const cost = type.baseCost * nextLevel;
    if (company.cash < cost) throw new BadRequestException('Fondos insuficientes');

    const scaling = (type.scaling as any) ?? {};

    await this.prisma.$transaction(async (tx) => {
      await tx.codeStudioCompany.update({
        where: { id: company.id },
        data: { cash: { decrement: cost }, expenses: { increment: cost } },
      });

      if (existing) {
        await tx.codeStudioInfrastructure.update({
          where: { id: existing.id },
          data: {
            level: nextLevel,
            capacity: Number(scaling.capacity ?? 1000) * nextLevel,
            cost,
          },
        });
      } else {
        await tx.codeStudioInfrastructure.create({
          data: {
            companyId: company.id,
            infrastructureTypeId: type.id,
            level: 1,
            capacity: Number(scaling.capacity ?? 1000),
            latency: Number(scaling.latency ?? 120),
            stability: Number(scaling.stability ?? 98),
            cost,
          },
        });
      }
    });

    return this.simulateAndReload(userId, companyId);
  }

  // Resolver un bug real: pagando cash (cobra fixCost, escalado por
  // severidad) o asignando un empleado propio (sin costo en cash — el sueldo
  // recurrente del empleado ya es el costo). No hace falta tocar
  // rating/estabilidad a mano: mientras el bug siga OPEN, openBugPenalty lo
  // sigue castigando en cada tick (codestudio-engine.service.ts); apenas se
  // marca FIXED, ese castigo desaparece solo en el proximo tick.
  async fixBug(userId: string, companyId: string, bugId: string, dto: FixBugDto) {
    const company = await this.requireCompany(userId, companyId);
    const bug = await this.prisma.codeStudioBug.findUnique({ where: { id: bugId } });
    if (!bug || bug.companyId !== company.id) throw new NotFoundException('Bug no encontrado');
    if (bug.status === CodeStudioBugStatus.FIXED) throw new BadRequestException('Este bug ya esta resuelto');

    let employeeName: string | undefined;
    if (dto.method === 'employee') {
      const employee = company.employees.find((item) => item.id === dto.employeeId);
      if (!employee) throw new NotFoundException('Empleado no encontrado');
      if (!BUG_CAPABLE_EMPLOYEE_SLUGS.has(employee.employeeType.slug)) {
        throw new BadRequestException(
          `${employee.employeeType.name} no tiene el perfil tecnico para resolver esto. Necesitas Backend, FullStack, DevOps, QA o Data Scientist.`,
        );
      }
      employeeName = employee.name;
    } else if (company.cash < bug.fixCost) {
      throw new BadRequestException('Fondos insuficientes para pagar el arreglo');
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.method === 'cash') {
        await tx.codeStudioCompany.update({
          where: { id: company.id },
          data: { cash: { decrement: bug.fixCost }, expenses: { increment: bug.fixCost } },
        });
      }
      await tx.codeStudioBug.update({
        where: { id: bug.id },
        data: { status: CodeStudioBugStatus.FIXED, fixedAt: new Date() },
      });
      await tx.codeStudioEventLog.create({
        data: {
          companyId: company.id,
          title: `Bug resuelto: ${bug.title}`,
          description:
            dto.method === 'employee'
              ? `${employeeName} resolvio este problema.`
              : `Pagaste $${bug.fixCost} para resolverlo.`,
          effects: { bugId: bug.id, method: dto.method },
        },
      });
    });

    return this.simulateAndReload(userId, companyId);
  }

  // Desbloquea un nodo del arbol de tecnologia: exige tener ya desbloqueados
  // TODOS los slugs en technology.requirements.requires (la cadena de su
  // rama/categoria) y el cash de su costo. El efecto es permanente — no hace
  // falta escribir stability/latency a mano aca, techBonus lo vuelve a
  // aplicar en cada tick (ver codestudio-engine.service.ts).
  async unlockTechnology(userId: string, companyId: string, dto: UnlockTechnologyDto) {
    const company = await this.requireCompany(userId, companyId);
    const technology = await this.prisma.codeStudioTechnology.findUnique({ where: { id: dto.technologyId } });
    if (!technology || !technology.active) throw new NotFoundException('Tecnologia no disponible');

    const unlockedSlugs = new Set(company.technologies.map((entry) => entry.technology.slug));
    if (unlockedSlugs.has(technology.slug)) throw new BadRequestException('Ya desbloqueaste esta tecnologia');

    const requiredSlugs: string[] = (technology.requirements as any)?.requires ?? [];
    const missing = requiredSlugs.filter((slug) => !unlockedSlugs.has(slug));
    if (missing.length > 0) throw new BadRequestException('Todavia te falta desbloquear un nodo anterior de esta rama');
    if (company.cash < technology.cost) throw new BadRequestException('Fondos insuficientes para esta tecnologia');

    await this.prisma.$transaction(async (tx) => {
      await tx.codeStudioCompany.update({
        where: { id: company.id },
        data: { cash: { decrement: technology.cost }, expenses: { increment: technology.cost } },
      });
      await tx.codeStudioCompanyTechnology.create({
        data: { companyId: company.id, technologyId: technology.id },
      });
      await tx.codeStudioEventLog.create({
        data: {
          companyId: company.id,
          title: `Tecnologia desbloqueada: ${technology.name}`,
          description: `${technology.name} ya esta activa y mejora tu empresa de forma permanente.`,
          effects: { technologyId: technology.id },
        },
      });
    });

    return this.simulateAndReload(userId, companyId);
  }

  // Lanzar una campana real: cobra baseCost y suma usuarios atribuidos a ESE
  // canal especifico (guardado en CodeStudioCampaignRun), no un numero
  // decorativo. La ganancia depende del costo, el "growth" propio de la
  // campana (catalogo) y el rating actual de la empresa (una app mejor
  // convierte mejor el mismo gasto en marketing).
  async launchCampaign(userId: string, companyId: string, dto: LaunchCampaignDto) {
    const company = await this.requireCompany(userId, companyId);
    const campaign = await this.prisma.codeStudioCampaign.findUnique({ where: { id: dto.campaignId } });
    if (!campaign || !campaign.active) throw new NotFoundException('Campana no disponible');
    if (company.cash < campaign.baseCost) throw new BadRequestException('Fondos insuficientes para esta campana');

    const growth = Number((campaign.effects as any)?.growth ?? 0.02);
    const qualityFactor = Math.max(0.5, Math.min(1.8, company.rating / 3));
    // "No todas las campanas funcionan igual, dependen del tipo de app": el
    // mismo canal (TikTok, Google Ads, etc.) rinde distinto segun
    // appType.simulationProfile.channelEffectiveness — ver seed-codestudio.ts.
    const appProfile = ((company as any).appType?.simulationProfile ?? {}) as AppSimulationProfile;
    const channelSlug = this.slugifyChannel(campaign.name);
    const channelEffectiveness = appProfile.channelEffectiveness?.[channelSlug] ?? 1;
    const gainedUsers = Math.max(3, Math.round(campaign.baseCost * growth * 4 * qualityFactor * channelEffectiveness));

    await this.prisma.$transaction(async (tx) => {
      await tx.codeStudioCompany.update({
        where: { id: company.id },
        data: {
          cash: { decrement: campaign.baseCost },
          expenses: { increment: campaign.baseCost },
          activeUsers: { increment: gainedUsers },
          totalUsers: { increment: gainedUsers },
        },
      });
      await tx.codeStudioCampaignRun.create({
        data: {
          companyId: company.id,
          campaignId: campaign.id,
          channel: campaign.name,
          cost: campaign.baseCost,
          gainedUsers,
        },
      });
      await tx.codeStudioEventLog.create({
        data: {
          companyId: company.id,
          title: `Campana de ${campaign.name}: +${gainedUsers} usuarios`,
          description: `Pagaste $${campaign.baseCost} en ${campaign.channel} y llegaron ${gainedUsers} usuarios nuevos.`,
          effects: { campaignId: campaign.id, channel: campaign.name, gainedUsers },
        },
      });
    });

    return this.simulateAndReload(userId, companyId);
  }

  // Ranking por canal para poder comparar ("gracias a TikTok +45, a Facebook
  // +12") en vez de mostrar cada campana lanzada suelta sin acumular.
  private async getMarketingSummary(companyId: string) {
    const rows = await this.prisma.codeStudioCampaignRun.groupBy({
      by: ['channel'],
      where: { companyId },
      _sum: { gainedUsers: true, cost: true },
      _count: { _all: true },
    });

    return rows
      .map((row) => ({
        channel: row.channel,
        gainedUsers: row._sum.gainedUsers ?? 0,
        spent: row._sum.cost ?? 0,
        runs: row._count._all,
      }))
      .sort((a, b) => b.gainedUsers - a.gainedUsers);
  }

  async getCompany(userId: string, companyId: string) {
    return this.simulateAndReload(userId, companyId);
  }

  // requireCompany ya valida ownership (userId === company.userId) — el
  // delete en cascada de Prisma se encarga de módulos/tareas/empleados/
  // infraestructura/eventos/snapshots (todos con onDelete: Cascade hacia
  // CodeStudioCompany en el schema), no hace falta borrarlos a mano.
  async deleteCompany(userId: string, companyId: string) {
    const company = await this.requireCompany(userId, companyId);
    await this.prisma.codeStudioCompany.delete({ where: { id: company.id } });
    return { id: company.id, name: company.name };
  }

  async startDevelopment(userId: string, companyId: string, dto: StartDevelopmentDto) {
    const company = await this.requireCompany(userId, companyId);
    const module = await this.prisma.codeStudioModule.findUnique({ where: { id: dto.moduleId } });
    if (!module || !module.active) throw new NotFoundException('Modulo no disponible');

    const alreadyInstalled = await this.prisma.codeStudioCompanyModule.findUnique({
      where: { companyId_moduleId: { companyId: company.id, moduleId: module.id } },
    });
    if (alreadyInstalled) throw new BadRequestException('Este modulo ya esta instalado');

    // Cadena por categoria (ver seed-codestudio.ts): exige tener ya
    // INSTALADA (no en desarrollo) la feature anterior de la misma
    // categoria, sin importar el cash — mismo criterio que
    // unlockTechnology.
    const installedSlugs = new Set(company.modules.map((entry) => entry.module.slug));
    const requiredSlugs: string[] = (module.requirements as any)?.requires ?? [];
    const missing = requiredSlugs.filter((slug) => !installedSlugs.has(slug));
    if (missing.length > 0) {
      throw new BadRequestException('Todavia te falta desarrollar la feature anterior de esta categoria');
    }
    if (company.cash < module.cost) throw new BadRequestException('Fondos insuficientes');

    // Asignar empleados a una tarea ahora tiene consecuencia real (ver
    // codestudio-engine.service.ts: la productividad de la tarea sale SOLO
    // de los empleados aca listados, no de todo el plantel) — por eso no se
    // puede asignar a alguien que ya esta ocupado en otra tarea IN_PROGRESS
    // ni a un id que no pertenece a esta empresa. Sin asignacion explicita,
    // la tarea igual avanza (a ritmo de "fundador solo"), no queda trabada.
    const assignedIds = (dto.assignedEmployees ?? []).filter((id): id is string => typeof id === 'string');
    if (assignedIds.length > 0) {
      const employeeIds = new Set(company.employees.map((employee) => employee.id));
      const unknownIds = assignedIds.filter((id) => !employeeIds.has(id));
      if (unknownIds.length > 0) throw new BadRequestException('Uno de los empleados asignados no pertenece a esta empresa');

      const busyIds = new Set(
        company.development
          .filter((existingTask) => existingTask.status === CodeStudioDevelopmentStatus.IN_PROGRESS)
          .flatMap((existingTask) => ((existingTask.assignedEmployees as string[] | null) ?? [])),
      );
      const doubleBooked = assignedIds.filter((id) => busyIds.has(id));
      if (doubleBooked.length > 0) {
        throw new BadRequestException('Uno de los empleados asignados ya esta trabajando en otra tarea en desarrollo');
      }
    }

    const task = await this.prisma.$transaction(async (tx) => {
      await tx.codeStudioCompany.update({
        where: { id: company.id },
        data: {
          cash: { decrement: module.cost },
          expenses: { increment: module.cost },
          // Primera decision real del jugador post-fundacion: pasa de IDEA
          // ("recien fundada, todavia nada") a BUILDING ("ya arranco a
          // construir"). LIVE lo asigna solo el motor de simulacion
          // (codestudio-engine.service.ts) cuando hay usuarios/features de
          // verdad.
          ...(company.status === CodeStudioCompanyStatus.IDEA
            ? { status: CodeStudioCompanyStatus.BUILDING }
            : {}),
        },
      });
      return tx.codeStudioDevelopmentTask.create({
        data: {
          companyId: company.id,
          moduleId: module.id,
          requiredSeconds: module.developmentSeconds,
          status: CodeStudioDevelopmentStatus.IN_PROGRESS,
          startedAt: new Date(),
          assignedEmployees: assignedIds as Prisma.InputJsonValue,
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

    const [reloaded, marketingSummary] = await Promise.all([
      this.prisma.codeStudioCompany.findUniqueOrThrow({ where: { id: company.id }, include: companyInclude }),
      this.getMarketingSummary(company.id),
    ]);

    return { ...reloaded, marketingSummary };
  }

  private async simulateCompany(company: Awaited<ReturnType<typeof this.requireCompany>>, force = false) {
    const elapsedSeconds = Math.floor((Date.now() - company.lastSimulatedAt.getTime()) / 1000);
    if (!force && elapsedSeconds < 30) return;

    const openBugs = (company as any).bugReports ?? [];
    const openBugPenalty = openBugs.reduce(
      (sum: number, bug: { severity: CodeStudioBugSeverity }) => sum + BUG_SEVERITY_WEIGHT[bug.severity],
      0,
    );
    const openKinds = new Set(openBugs.map((bug: { kind: string }) => bug.kind));

    const unlockedTechnologies = (company as any).technologies ?? [];
    const techBonus = unlockedTechnologies.reduce(
      (acc: { stability: number; latency: number }, entry: { technology: { effects: any } }) => {
        const effects = entry.technology.effects ?? {};
        return {
          stability: acc.stability + Number(effects.stability ?? 0),
          latency: acc.latency + Number(effects.latency ?? 0),
        };
      },
      { stability: 0, latency: 0 },
    );

    // El TIPO de app cambia la simulacion de verdad (ver
    // appTypeSimulationProfiles en seed-codestudio.ts y AppSimulationProfile
    // en codestudio-engine.service.ts) — una red social y un SaaS B2B con
    // las mismas acciones ya no crecen/gastan igual.
    const appProfile = ((company as any).appType?.simulationProfile ?? {}) as AppSimulationProfile;

    // "La reputacion depende de soporte, seguridad, bugs resueltos" — ver
    // comentario en codestudio-engine.service.ts.
    const supportCount = company.employees.filter((employee) =>
      ['support', 'community-manager'].includes(employee.employeeType.slug),
    ).length;
    const securityTechCount = unlockedTechnologies.filter(
      (entry: { technology: { category: string } }) => entry.technology.category === 'Plataforma',
    ).length;
    const fixedBugsCount = await this.prisma.codeStudioBug.count({
      where: { companyId: company.id, status: CodeStudioBugStatus.FIXED },
    });

    // "Eventos del mercado": revive CodeStudioEventTemplate (sembrado desde
    // el principio pero nunca leido por nada real) — cada tanto (cooldown
    // real + roll de probabilidad) elige uno ponderado por `weight`, aplica
    // effects.users/satisfaction de verdad y deja un CodeStudioEventLog con
    // templateId seteado (el campo existe hace rato pero nunca se usaba).
    const marketEventCooldownMs = 3 * 60 * 1000;
    const canRollMarketEvent =
      !company.lastMarketEventAt || Date.now() - company.lastMarketEventAt.getTime() > marketEventCooldownMs;
    let marketEvent: { template: { id: string; name: string; description: string | null }; userDelta: number; satisfactionDelta: number } | null = null;
    if (canRollMarketEvent && Math.random() < 0.15) {
      const templates = await this.prisma.codeStudioEventTemplate.findMany({ where: { active: true } });
      const template = this.pickWeightedEventTemplate(templates);
      if (template) {
        const effects = (template.effects as any) ?? {};
        const maxNegative = -Math.floor(company.activeUsers * 0.4);
        const userDelta = Math.max(maxNegative, Math.round(company.activeUsers * Number(effects.users ?? 0)));
        const satisfactionDelta = Number(effects.satisfaction ?? 0);
        marketEvent = { template, userDelta, satisfactionDelta };
      }
    }

    const result = this.engine.simulate(
      company as any,
      Math.max(elapsedSeconds, force ? 10 : 0),
      openBugPenalty,
      techBonus,
      appProfile,
      { supportCount, securityTechCount, fixedBugsCount },
    );
    if (marketEvent) {
      (result.company as any).activeUsers = Math.max(0, result.company.activeUsers + marketEvent.userDelta);
      (result.company as any).totalUsers = result.company.totalUsers + Math.max(0, marketEvent.userDelta);
      (result.company as any).satisfaction = Math.max(0, Math.min(100, result.company.satisfaction + marketEvent.satisfactionDelta));
      (result.company as any).lastMarketEventAt = new Date();
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.codeStudioCompany.update({ where: { id: company.id }, data: result.company as any });
      await tx.codeStudioAnalyticsSnapshot.create({
        data: { companyId: company.id, ...result.snapshot },
      });

      if (marketEvent) {
        await tx.codeStudioEventLog.create({
          data: {
            companyId: company.id,
            templateId: marketEvent.template.id,
            title: marketEvent.template.name,
            description: marketEvent.template.description ?? undefined,
            effects: { marketEvent: true, users: marketEvent.userDelta, satisfaction: marketEvent.satisfactionDelta },
          },
        });
      }

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

      // "Los bugs no aparecen aleatoriamente, dependen de cuantas features
      // hay, cuantos QA las prueban, etc." — devRiskFactor > 1 = publicando
      // rapido con poco QA (mas riesgo), < 1 = equipo con QA de sobra para
      // lo que tiene instalado (mas seguro). 1 = neutro (comportamiento
      // identico al de antes de esta fase).
      const qaCount = company.employees.filter((employee) => employee.employeeType.slug === 'qa').length;
      const devRiskFactor = this.clampNumber(company.modules.length / (4 * (qaCount + 1)), 0.5, 2.5);

      // Mismos umbrales que ya usaban los eventLog de arriba: si se cumplen y
      // todavia no hay un CodeStudioBug OPEN de ese "kind", se crea uno de
      // verdad (resoluble desde Desarrollo pagando cash o asignando un
      // empleado) ademas del evento informativo.
      const snapshotForBugs = {
        errors: result.snapshot.errors,
        latency: result.snapshot.latency,
        stability: (result.company as any).stability,
        devRisk: devRiskFactor,
      };
      for (const definition of BUG_DEFINITIONS) {
        if (!definition.condition(snapshotForBugs) || openKinds.has(definition.kind)) continue;
        const severity = definition.severity(snapshotForBugs);
        await tx.codeStudioBug.create({
          data: {
            companyId: company.id,
            kind: definition.kind,
            title: definition.title,
            description: definition.description,
            severity,
            fixCost: BUG_FIX_COST[severity],
          },
        });
        await tx.codeStudioEventLog.create({
          data: {
            companyId: company.id,
            title: `Nuevo bug: ${definition.title}`,
            description: `${definition.description} Podes resolverlo desde Desarrollo.`,
            effects: { kind: definition.kind, severity },
          },
        });
        openKinds.add(definition.kind);
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

  // Mismo criterio que slugify() en seed-codestudio.ts, para que las claves
  // de appProfile.channelEffectiveness (sembradas con esa funcion) matcheen
  // con el nombre real de la campana ("Google Ads" -> "google-ads").
  private clampNumber(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
  }

  private pickWeightedEventTemplate<T extends { weight: number }>(templates: T[]): T | null {
    if (templates.length === 0) return null;
    const totalWeight = templates.reduce((sum, template) => sum + Math.max(1, template.weight), 0);
    let roll = Math.random() * totalWeight;
    for (const template of templates) {
      roll -= Math.max(1, template.weight);
      if (roll <= 0) return template;
    }
    return templates[templates.length - 1];
  }

  private slugifyChannel(value: string) {
    // Los nombres de campana (TikTok, Google Ads, etc.) no tienen acentos,
    // asi que a diferencia del slugify() de seed-codestudio.ts no hace
    // falta el paso de normalizar/quitar diacriticos.
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
