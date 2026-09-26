import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CodeStudioBugSeverity,
  CodeStudioBugStatus,
  CodeStudioCompanyStatus,
  CodeStudioDevelopmentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CodeStudioEngineService,
  EngineHosting,
  EngineInput,
  EngineMetrics,
  MAX_ELAPSED_SECONDS,
  releaseBugChance,
  resolveProfile,
} from './codestudio-engine.service';
import { CodeStudioCatalogService } from './codestudio-catalog.service';
import { CodeStudioRewardsService } from './codestudio-rewards.service';
import { campaignQuote, evaluateStage, fundingOffer, stageProgress } from './codestudio-rules';
import {
  BUG_CAPABLE_ROLES,
  CAMPAIGN_BUDGET_MULTIPLIERS,
  CAMPAIGN_FATIGUE_WINDOW_MS,
  HIRE_BONUS_FACTOR,
  SEVERANCE_FACTOR,
} from './content/economy';
import { FEATURES } from './content/features';
import { FUNDING_MIN_RATING, MAX_STAGE, STAGES, StageMetrics, startingCashBonus } from './content/progression';
import {
  BUG_SCENARIO_BY_KEY,
  BUG_SEVERITY_WEIGHT,
  BugScenario,
  BugTrigger,
  DIAGNOSE_COST_FACTOR,
  EMPLOYEE_FIX_SECONDS_PER_WEIGHT,
  MAX_OPEN_BUGS,
  WRONG_DIAGNOSIS_COST_FACTOR,
  WRONG_DIAGNOSIS_SATISFACTION,
  consultantFixCost,
  pickScenario,
} from './content/bugs';
import {
  DECISION_BY_KEY,
  DECISION_EVENTS,
  DECISION_SHARE,
  DECISION_TTL_DAYS,
  EVENT_INTERVAL_DAYS,
  EventContext,
  EventOutcome,
  PASSIVE_EVENTS,
  PRICE_LEVELS,
  pickWeighted,
} from './content/events';
import { CreateCodeStudioCompanyDto } from './dto/create-codestudio-company.dto';
import { StartDevelopmentDto } from './dto/start-development.dto';
import { HireEmployeeDto } from './dto/hire-employee.dto';
import { InstallInfrastructureDto } from './dto/install-infrastructure.dto';
import { FixBugDto } from './dto/fix-bug.dto';
import { LaunchCampaignDto } from './dto/launch-campaign.dto';
import { ChooseDecisionDto } from './dto/choose-decision.dto';
import { SetPricingDto } from './dto/set-pricing.dto';

type Tx = Prisma.TransactionClient;

const companyInclude = {
  appType: true,
  modules: { include: { module: true }, orderBy: { installedAt: 'asc' as const } },
  employees: { include: { employeeType: true }, orderBy: { hiredAt: 'asc' as const } },
  infrastructure: { include: { infrastructureType: true } },
  development: {
    where: { status: { in: [CodeStudioDevelopmentStatus.QUEUED, CodeStudioDevelopmentStatus.IN_PROGRESS] } },
    include: { module: true },
    orderBy: { createdAt: 'asc' as const },
  },
  bugReports: { where: { status: CodeStudioBugStatus.OPEN }, orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.CodeStudioCompanyInclude;

type LoadedCompany = Prisma.CodeStudioCompanyGetPayload<{ include: typeof companyInclude }>;

// Empresas vivas (no quebradas) por usuario: evita que alguien abra 50
// empresas para farmear logros.
const MAX_ALIVE_COMPANIES = 3;
const MAX_EMPLOYEES = 40;
// Features en desarrollo + en cola a la vez.
const MAX_DEVELOPMENT_QUEUE = 6;
const BANKRUPTCY_DEBT_DAYS = 7;
const SNAPSHOT_EVERY_MS = 60_000;
const KEEP_SNAPSHOTS = 60;
const KEEP_EVENTS = 100;
// Evita simular dos veces seguidas por acciones rápidas del jugador.
const MIN_SIM_SECONDS = 3;

// Error interno para abortar una transacción de simulación cuando otra
// request ya simuló este mismo intervalo (ver guard en simulateCompany).
class SimulationRaceError extends Error {}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
const money = (value: number) => `$${Math.round(value).toLocaleString('es-CO')}`;

@Injectable()
export class CodeStudioService {
  private rankingCache: { at: number; rows: unknown[] } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: CodeStudioEngineService,
    private readonly catalogService: CodeStudioCatalogService,
    private readonly rewards: CodeStudioRewardsService,
  ) {}

  // ─── Lectura ────────────────────────────────────────────────────────────

  catalog() {
    return this.catalogService.catalog();
  }

  // Liviano a propósito: lista de empresas SIN simular (la que el jugador
  // está mirando se simula al pedirla con getCompany) + catálogo + carrera.
  async myStudio(userId: string) {
    const [companies, catalog, profile] = await Promise.all([
      this.prisma.codeStudioCompany.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          stage: true,
          valuation: true,
          activeUsers: true,
          cash: true,
          failedAt: true,
          appType: { select: { name: true, color: true, icon: true, slug: true } },
        },
      }),
      this.catalogService.catalog(),
      this.rewards.getProfile(userId),
    ]);
    return { companies, catalog, profile };
  }

  async getCompany(userId: string, companyId: string) {
    await this.simulateCompany(userId, companyId);
    return this.buildView(userId, companyId);
  }

  async ranking() {
    if (this.rankingCache && Date.now() - this.rankingCache.at < 30_000) return this.rankingCache.rows;
    const rows = await this.prisma.codeStudioCompany.findMany({
      where: { status: { not: CodeStudioCompanyStatus.FAILED } },
      take: 50,
      orderBy: [{ valuation: 'desc' }, { activeUsers: 'desc' }],
      select: {
        id: true,
        name: true,
        valuation: true,
        activeUsers: true,
        stage: true,
        founderEquity: true,
        appType: { select: { name: true, color: true } },
        user: { select: { username: true, avatarUrl: true } },
      },
    });
    this.rankingCache = { at: Date.now(), rows };
    return rows;
  }

  // ─── Crear / borrar ─────────────────────────────────────────────────────

  async createCompany(userId: string, dto: CreateCodeStudioCompanyDto) {
    const name = dto.name.trim();
    if (name.length < 3 || name.length > 40) throw new BadRequestException('El nombre debe tener entre 3 y 40 caracteres');
    const appType = await this.prisma.codeStudioAppType.findUnique({ where: { id: dto.appTypeId } });
    if (!appType || !appType.active) throw new BadRequestException('Ese tipo de app no está disponible');

    const profile = await this.rewards.getProfile(userId);
    const appProfile = (appType.simulationProfile ?? {}) as Record<string, any>;
    const minLevel = Number(appProfile.minFounderLevel ?? 1);
    if (profile.level < minLevel) {
      throw new BadRequestException(`${appType.name} se desbloquea con nivel de fundador ${minLevel}. Tú eres nivel ${profile.level}.`);
    }
    const alive = await this.prisma.codeStudioCompany.count({ where: { userId, status: { not: CodeStudioCompanyStatus.FAILED } } });
    if (alive >= MAX_ALIVE_COMPANIES) {
      throw new BadRequestException(`Puedes tener hasta ${MAX_ALIVE_COMPANIES} empresas activas a la vez. Cierra una desde Ajustes.`);
    }

    const cash = Number(appProfile.startingCash ?? 6000) + startingCashBonus(profile.level);
    const company = await this.prisma.$transaction(async (tx) => {
      const created = await tx.codeStudioCompany.create({
        data: {
          userId,
          appTypeId: appType.id,
          name,
          cash,
          reputation: 5,
          satisfaction: 70,
          rating: 4,
          stability: 95,
          latency: 120,
          bugs: 0,
          simVersion: 2,
          nextEventDay: 8,
          lastSimulatedAt: new Date(),
        },
      });
      await tx.codeStudioEventLog.create({
        data: {
          companyId: created.id,
          title: 'Bienvenido, CEO',
          description: `Tienes ${money(cash)} y una idea. Construye tu MVP en el Árbol: Landing page → Registro y login → Funcionalidad principal. Cada minuto real es un día en tu startup.`,
          effects: { kind: 'info', tone: 'neutral' },
        },
      });
      await this.rewards.addXp(tx, userId, 0, null, { companiesFounded: 1 });
      await this.rewards.grantMilestone(tx, userId, 'first-company', created.id);
      return created;
    });
    this.rankingCache = null;
    return this.buildView(userId, company.id);
  }

  async deleteCompany(userId: string, companyId: string) {
    const company = await this.requireOwned(userId, companyId);
    await this.prisma.codeStudioCompany.delete({ where: { id: company.id } });
    this.rankingCache = null;
    return { id: company.id, name: company.name };
  }

  // ─── Acciones del jugador ───────────────────────────────────────────────

  async startDevelopment(userId: string, companyId: string, dto: StartDevelopmentDto) {
    const company = await this.requireAlive(userId, companyId);
    const module = await this.prisma.codeStudioModule.findUnique({ where: { id: dto.moduleId } });
    if (!module || !module.active || !(module.metadata as { v2?: boolean } | null)?.v2) throw new NotFoundException('Esa feature no está disponible');
    if (company.modules.some((entry) => entry.moduleId === module.id)) throw new BadRequestException('Ya construiste esta feature');
    if (company.development.some((task) => task.moduleId === module.id)) throw new BadRequestException('Esta feature ya está en desarrollo');
    if (company.development.length >= MAX_DEVELOPMENT_QUEUE) {
      throw new BadRequestException(`Tu equipo ya tiene ${MAX_DEVELOPMENT_QUEUE} features en cola. Espera a que terminen o contrata más gente.`);
    }
    const requirements = (module.requirements ?? {}) as { requires?: string[]; minStage?: number };
    if ((requirements.minStage ?? 0) > company.stage) {
      throw new BadRequestException(`Se desbloquea en la etapa ${STAGES[requirements.minStage ?? 0]?.name ?? requirements.minStage}.`);
    }
    const installed = new Set(company.modules.map((entry) => entry.module.slug));
    const missing = (requirements.requires ?? []).filter((slug) => !installed.has(slug));
    if (missing.length > 0) {
      const names = FEATURES.filter((feature) => missing.includes(feature.slug)).map((feature) => feature.name);
      throw new BadRequestException(`Primero necesitas: ${names.join(', ')}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await this.spend(tx, company.id, module.cost);
      await tx.codeStudioDevelopmentTask.create({
        data: {
          companyId: company.id,
          moduleId: module.id,
          requiredSeconds: module.developmentSeconds,
          status: CodeStudioDevelopmentStatus.IN_PROGRESS,
          startedAt: new Date(),
        },
      });
      if (company.status === CodeStudioCompanyStatus.IDEA) {
        await tx.codeStudioCompany.update({ where: { id: company.id }, data: { status: CodeStudioCompanyStatus.BUILDING } });
      }
    });
    return this.getCompany(userId, companyId);
  }

  // Cancelar devuelve la mitad: el trabajo hecho no se recupera.
  async cancelDevelopment(userId: string, companyId: string, taskId: string) {
    const company = await this.requireAlive(userId, companyId);
    const task = company.development.find((entry) => entry.id === taskId);
    if (!task) throw new NotFoundException('Esa tarea no está en desarrollo');
    const refund = Math.round(task.module.cost * 0.5);
    await this.prisma.$transaction(async (tx) => {
      await tx.codeStudioDevelopmentTask.update({ where: { id: task.id }, data: { status: CodeStudioDevelopmentStatus.CANCELLED } });
      await tx.codeStudioCompany.update({ where: { id: company.id }, data: { cash: { increment: refund } } });
      await this.log(tx, company.id, `Cancelaste ${task.module.name}`, `Recuperaste ${money(refund)} (la mitad). El trabajo hecho se pierde.`, 'info', 'neutral');
    });
    return this.getCompany(userId, companyId);
  }

  async hireEmployee(userId: string, companyId: string, dto: HireEmployeeDto) {
    const company = await this.requireAlive(userId, companyId);
    const type = await this.prisma.codeStudioEmployeeType.findUnique({ where: { id: dto.employeeTypeId } });
    if (!type || !type.active) throw new NotFoundException('Ese rol no está disponible');
    if (company.employees.length >= MAX_EMPLOYEES) throw new BadRequestException(`Máximo ${MAX_EMPLOYEES} empleados`);
    const bonus = Math.round(type.salary * HIRE_BONUS_FACTOR);
    const stats = (type.baseStats ?? {}) as Record<string, number>;

    await this.prisma.$transaction(async (tx) => {
      await this.spend(tx, company.id, bonus);
      const employee = await tx.codeStudioEmployee.create({
        data: {
          companyId: company.id,
          employeeTypeId: type.id,
          name: this.generateEmployeeName(),
          avatar: `avatar-${type.slug}`,
          age: 20 + Math.floor(Math.random() * 22),
          salary: type.salary,
          productivity: Number(stats.productivity ?? 1),
          creativity: Number(stats.creativity ?? 1),
          speed: Number(stats.speed ?? 1),
          quality: Number(stats.quality ?? 1),
        },
      });
      await this.log(
        tx,
        company.id,
        `Contrataste a ${employee.name} (${type.name})`,
        `Bono de contratación ${money(bonus)}. Sueldo: ${money(type.salary)}/mes (${money(type.salary / 30)} por día).`,
        'team',
        'neutral',
      );
      await this.rewards.grantMilestone(tx, userId, 'first-hire', company.id);
    });
    return this.getCompany(userId, companyId);
  }

  // Despedir cuesta medio sueldo de indemnización — aunque no tengas caja
  // (puede dejarte en rojo): a veces es la única forma de sobrevivir.
  async fireEmployee(userId: string, companyId: string, employeeId: string) {
    const company = await this.requireAlive(userId, companyId);
    const employee = company.employees.find((entry) => entry.id === employeeId);
    if (!employee) throw new NotFoundException('Empleado no encontrado');
    const severance = Math.round(employee.salary * SEVERANCE_FACTOR);
    await this.prisma.$transaction(async (tx) => {
      await tx.codeStudioBug.updateMany({
        where: { companyId: company.id, assignedEmployeeId: employee.id, status: CodeStudioBugStatus.OPEN },
        data: { assignedEmployeeId: null, fixReadyAt: null },
      });
      await tx.codeStudioEmployee.delete({ where: { id: employee.id } });
      await tx.codeStudioCompany.update({
        where: { id: company.id },
        data: { cash: { decrement: severance }, expenses: { increment: severance } },
      });
      await this.log(
        tx,
        company.id,
        `${employee.name} dejó la empresa`,
        `Indemnización: ${money(severance)}. Ahorras ${money(employee.salary)}/mes.`,
        'team',
        'neutral',
      );
    });
    return this.getCompany(userId, companyId);
  }

  async installInfrastructure(userId: string, companyId: string, dto: InstallInfrastructureDto) {
    const company = await this.requireAlive(userId, companyId);
    const type = await this.prisma.codeStudioInfrastructureType.findUnique({ where: { id: dto.infrastructureTypeId } });
    if (!type || !type.active) throw new NotFoundException('Ese servidor no está disponible');
    const scaling = (type.scaling ?? {}) as Record<string, number>;
    if (Number(scaling.minStage ?? 0) > company.stage) {
      throw new BadRequestException(`Se desbloquea en la etapa ${STAGES[Number(scaling.minStage)]?.name ?? scaling.minStage}.`);
    }
    const existing = company.infrastructure.find((item) => item.infrastructureTypeId === type.id);
    const nextLevel = (existing?.level ?? 0) + 1;
    if (nextLevel > Number(scaling.maxLevel ?? 5)) throw new BadRequestException('Ya está al nivel máximo');
    const cost = type.baseCost * nextLevel;

    await this.prisma.$transaction(async (tx) => {
      await this.spend(tx, company.id, cost);
      const data = {
        level: nextLevel,
        capacity: Number(scaling.capacity ?? 0) * nextLevel,
        latency: Number(scaling.latency ?? 120),
        stability: Number(scaling.stability ?? 97),
        cost: Number(scaling.monthly ?? 0) * nextLevel,
      };
      if (existing) await tx.codeStudioInfrastructure.update({ where: { id: existing.id }, data });
      else await tx.codeStudioInfrastructure.create({ data: { companyId: company.id, infrastructureTypeId: type.id, ...data } });
      await this.log(
        tx,
        company.id,
        existing ? `${type.name} mejorado a nivel ${nextLevel}` : `${type.name} instalado`,
        `Capacidad +${Number(scaling.capacity ?? 0).toLocaleString('es-CO')} usuarios. Cuesta ${money(Number(scaling.monthly ?? 0))}/mes por nivel.`,
        'infra',
        'neutral',
      );
    });
    return this.getCompany(userId, companyId);
  }

  async launchCampaign(userId: string, companyId: string, dto: LaunchCampaignDto) {
    const company = await this.requireAlive(userId, companyId);
    const campaign = await this.prisma.codeStudioCampaign.findUnique({ where: { id: dto.campaignId } });
    if (!campaign || !campaign.active) throw new NotFoundException('Esa campaña no está disponible');
    const multiplier = dto.multiplier ?? 1;
    if (!(CAMPAIGN_BUDGET_MULTIPLIERS as readonly number[]).includes(multiplier)) throw new BadRequestException('Presupuesto inválido');
    const minStage = Number((campaign.config as { minStage?: number } | null)?.minStage ?? 1);
    if (minStage > company.stage) throw new BadRequestException(`Se desbloquea en la etapa ${STAGES[minStage]?.name}.`);
    if (company.infrastructure.length === 0 || company.modules.length === 0) {
      throw new BadRequestException('Tu app no está en línea: los usuarios llegarían a una página caída. Instala un servidor primero.');
    }

    const quote = await this.quoteCampaign(company, campaign.slug, multiplier);
    if (!quote) throw new BadRequestException('No se pudo cotizar la campaña');

    await this.prisma.$transaction(async (tx) => {
      await this.spend(tx, company.id, quote.cost);
      await tx.codeStudioCompany.update({
        where: { id: company.id },
        data: { activeUsers: { increment: quote.users }, totalUsers: { increment: quote.users } },
      });
      await tx.codeStudioCampaignRun.create({
        data: { companyId: company.id, campaignId: campaign.id, channel: campaign.name, cost: quote.cost, gainedUsers: quote.users },
      });
      const metrics = this.metricsOf(company);
      const verdict =
        metrics.ltv > 0 && quote.cac > metrics.ltv
          ? `Cada usuario te costó ${money(quote.cac)} pero solo te deja ~${money(metrics.ltv)} en su vida (LTV). Estás comprando usuarios a pérdida.`
          : metrics.ltv > 0
            ? `Cada usuario te costó ${money(quote.cac)} y te deja ~${money(metrics.ltv)} (LTV). Buen negocio.`
            : 'Todavía no cobras nada: estos usuarios no te dejan dinero hasta que tengas monetización.';
      await this.log(tx, company.id, `Campaña en ${campaign.name}: +${quote.users} usuarios`, `Pagaste ${money(quote.cost)}. ${verdict}`, 'marketing', 'neutral');
      await this.rewards.grantMilestone(tx, userId, 'first-campaign', company.id);
    });
    return this.getCompany(userId, companyId);
  }

  async fixBug(userId: string, companyId: string, bugId: string, dto: FixBugDto) {
    const company = await this.requireAlive(userId, companyId);
    const bug = company.bugReports.find((entry) => entry.id === bugId);
    if (!bug) throw new NotFoundException('Ese bug no existe o ya está resuelto');
    if (bug.assignedEmployeeId) throw new BadRequestException('Alguien de tu equipo ya está trabajando en este bug');
    const scenario = bug.scenarioKey ? BUG_SCENARIO_BY_KEY.get(bug.scenarioKey) : undefined;
    const weight = BUG_SEVERITY_WEIGHT[bug.severity];

    if (dto.method === 'diagnose') {
      if (!scenario) throw new BadRequestException('Este bug es del sistema anterior: arréglalo con tu equipo o una consultora.');
      const option = scenario.options.find((entry) => entry.key === dto.optionKey);
      if (!option) throw new BadRequestException('Elige una de las opciones');

      if (!option.correct) {
        const cost = Math.round(bug.fixCost * WRONG_DIAGNOSIS_COST_FACTOR);
        await this.prisma.$transaction(async (tx) => {
          await tx.codeStudioBug.update({ where: { id: bug.id }, data: { attempts: { increment: 1 } } });
          await tx.codeStudioCompany.update({
            where: { id: company.id },
            data: {
              cash: { decrement: cost },
              expenses: { increment: cost },
              satisfaction: clamp(company.satisfaction + WRONG_DIAGNOSIS_SATISFACTION, 0, 100),
            },
          });
        });
        return { result: { correct: false, feedback: option.feedback, cost }, company: await this.getCompany(userId, companyId) };
      }

      const cost = Math.round(bug.fixCost * DIAGNOSE_COST_FACTOR);
      const firstTry = bug.attempts === 0;
      const xp = weight * 12 * (firstTry ? 2 : 1);
      await this.prisma.$transaction(async (tx) => {
        await this.spend(tx, company.id, cost, `Necesitas ${money(cost)} para que tu equipo aplique el arreglo.`);
        await tx.codeStudioBug.update({ where: { id: bug.id }, data: { status: CodeStudioBugStatus.FIXED, fixedAt: new Date(), resolution: 'diagnose' } });
        await tx.codeStudioCompany.update({ where: { id: company.id }, data: { reputation: clamp(company.reputation + 1, 0, 100) } });
        await this.log(
          tx,
          company.id,
          `Bug resuelto: ${bug.title}`,
          `${scenario.lesson}${scenario.preventHint ? ` ${scenario.preventHint}` : ''} (+${xp} XP)`,
          'bug-fixed',
          'good',
        );
        await this.rewards.addXp(tx, userId, xp, company.id, { bugsDiagnosed: 1, ...(firstTry ? { bugsFirstTry: 1 } : {}) });
        await this.rewards.grantMilestone(tx, userId, 'first-bug-diagnosed', company.id);
        const profile = await tx.codeStudioProfile.findUnique({ where: { userId }, select: { bugsFirstTry: true } });
        if ((profile?.bugsFirstTry ?? 0) >= 10) await this.rewards.grantMilestone(tx, userId, 'bug-hunter', company.id);
      });
      return {
        result: { correct: true, feedback: option.feedback, lesson: scenario.lesson, preventHint: scenario.preventHint ?? null, xp, cost, firstTry },
        company: await this.getCompany(userId, companyId),
      };
    }

    if (dto.method === 'employee') {
      const employee = company.employees.find((entry) => entry.id === dto.employeeId);
      if (!employee) throw new NotFoundException('Empleado no encontrado');
      if (!BUG_CAPABLE_ROLES.has(employee.employeeType.slug)) {
        throw new BadRequestException(`${employee.employeeType.name} no tiene el perfil técnico. Necesitas Backend, FullStack, DevOps, QA o Data Scientist.`);
      }
      if (company.bugReports.some((entry) => entry.assignedEmployeeId === employee.id)) {
        throw new BadRequestException(`${employee.name} ya está arreglando otro bug`);
      }
      const seconds = weight * EMPLOYEE_FIX_SECONDS_PER_WEIGHT;
      await this.prisma.codeStudioBug.update({
        where: { id: bug.id },
        data: { assignedEmployeeId: employee.id, fixReadyAt: new Date(Date.now() + seconds * 1000) },
      });
      return { result: { assigned: true, seconds }, company: await this.getCompany(userId, companyId) };
    }

    // Consultora: rápido y caro, pero no aprendes nada (sin XP).
    await this.prisma.$transaction(async (tx) => {
      await this.spend(tx, company.id, bug.fixCost);
      await tx.codeStudioBug.update({ where: { id: bug.id }, data: { status: CodeStudioBugStatus.FIXED, fixedAt: new Date(), resolution: 'cash' } });
      await this.log(
        tx,
        company.id,
        `Una consultora arregló: ${bug.title}`,
        `Pagaste ${money(bug.fixCost)}. ${scenario ? `Te dejaron una nota: "${scenario.lesson}"` : ''}`,
        'bug-fixed',
        'neutral',
      );
    });
    return { result: { paid: bug.fixCost }, company: await this.getCompany(userId, companyId) };
  }

  async chooseDecision(userId: string, companyId: string, eventId: string, dto: ChooseDecisionDto) {
    const company = await this.requireAlive(userId, companyId);
    const event = await this.prisma.codeStudioEventLog.findUnique({ where: { id: eventId } });
    const effects = (event?.effects ?? {}) as Record<string, any>;
    if (!event || event.companyId !== company.id || effects.kind !== 'decision') throw new NotFoundException('Esa decisión no existe');
    if (effects.status !== 'pending') throw new BadRequestException('Ya tomaste esta decisión');
    const definition = DECISION_BY_KEY.get(effects.key);
    if (!definition) throw new BadRequestException('Decisión desconocida');
    if (!(effects.choices ?? []).some((choice: { key: string }) => choice.key === dto.choice)) throw new BadRequestException('Opción inválida');

    const ctx = this.eventContext(company);
    const blocked = definition.canChoose?.(ctx, effects.params ?? {}, dto.choice);
    if (blocked) throw new BadRequestException(blocked);
    const outcome = definition.resolve(ctx, effects.params ?? {}, dto.choice, Math.random);

    await this.prisma.$transaction(async (tx) => {
      // Guard: si dos clicks llegan juntos, solo el primero resuelve.
      const claimed = await tx.codeStudioEventLog.updateMany({
        where: { id: event.id, effects: { path: ['status'], equals: 'pending' } },
        data: { effects: { ...effects, status: 'resolved', choice: dto.choice, outcome: outcome.message } },
      });
      if (claimed.count === 0) throw new BadRequestException('Ya tomaste esta decisión');
      await this.applyOutcome(tx, company, outcome);
      await this.rewards.addXp(tx, userId, 10, company.id);
    });
    return this.getCompany(userId, companyId);
  }

  async raiseFunding(userId: string, companyId: string) {
    const company = await this.requireAlive(userId, companyId);
    const offer = fundingOffer(company.fundingRound, company.valuation);
    if (!offer) throw new BadRequestException('Ya levantaste todas las rondas disponibles');
    if (company.stage < offer.minStage) throw new BadRequestException(`Los inversores de ${offer.name} esperan que llegues a la etapa ${STAGES[offer.minStage].name}.`);
    if (company.rating < FUNDING_MIN_RATING) {
      throw new BadRequestException(`Ningún inversor apuesta por una app con rating ${company.rating.toFixed(1)}. Súbelo a ${FUNDING_MIN_RATING}+.`);
    }
    const newEquity = company.founderEquity * (1 - offer.equity / 100);
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.codeStudioCompany.updateMany({
        where: { id: company.id, fundingRound: company.fundingRound },
        data: { cash: { increment: offer.raise }, fundingRound: { increment: 1 }, founderEquity: newEquity },
      });
      if (updated.count === 0) throw new BadRequestException('Esa ronda ya se cerró');
      await this.log(
        tx,
        company.id,
        `Ronda ${offer.name} cerrada: +${money(offer.raise)}`,
        `Vendiste el ${offer.equity}% de la empresa. Ahora eres dueño del ${newEquity.toFixed(1)}%. Más caja para crecer, pero cada ronda te diluye.`,
        'finance',
        'good',
      );
      await this.rewards.grantMilestone(tx, userId, 'first-funding', company.id);
    });
    return this.getCompany(userId, companyId);
  }

  async setPricing(userId: string, companyId: string, dto: SetPricingDto) {
    const company = await this.requireAlive(userId, companyId);
    const level = PRICE_LEVELS.find((entry) => entry.value === dto.level);
    if (!level) throw new BadRequestException('Nivel de precio inválido');
    await this.prisma.$transaction(async (tx) => {
      await tx.codeStudioCompany.update({ where: { id: company.id }, data: { priceLevel: level.value } });
      await this.log(
        tx,
        company.id,
        `Nuevo precio: ${level.label}`,
        level.value > 1
          ? 'Cobras más por usuario, pero algunos se irán y llegarán menos.'
          : level.value < 1
            ? 'Cobras menos por usuario, pero se quedan más y llegan más.'
            : 'Precio de mercado.',
        'finance',
        'neutral',
      );
    });
    return this.getCompany(userId, companyId);
  }

  // ─── Simulación ─────────────────────────────────────────────────────────

  private async simulateCompany(userId: string, companyId: string) {
    const company = await this.requireOwned(userId, companyId);
    if (company.status === CodeStudioCompanyStatus.FAILED) return;
    if (company.simVersion < 2) {
      await this.convertLegacyCompany(company);
      return;
    }
    const elapsed = (Date.now() - company.lastSimulatedAt.getTime()) / 1000;
    if (elapsed < MIN_SIM_SECONDS) return;

    try {
      await this.prisma.$transaction(async (tx) => this.runSimulation(tx, userId, company, Math.min(elapsed, MAX_ELAPSED_SECONDS)), {
        timeout: 15_000,
      });
    } catch (error) {
      if (error instanceof SimulationRaceError) return;
      throw error;
    }
  }

  private async runSimulation(tx: Tx, userId: string, company: LoadedCompany, elapsed: number) {
    const now = new Date();
    // Guard optimista: si otra request ya simuló desde que leímos, nos
    // vamos sin tocar nada (evita simular el mismo intervalo dos veces).
    const claimed = await tx.codeStudioCompany.updateMany({
      where: { id: company.id, lastSimulatedAt: company.lastSimulatedAt },
      data: { lastSimulatedAt: now },
    });
    if (claimed.count === 0) throw new SimulationRaceError();

    // Bugs que un empleado terminó de arreglar.
    for (const bug of company.bugReports.filter((entry) => entry.fixReadyAt && entry.fixReadyAt <= now)) {
      const employee = company.employees.find((entry) => entry.id === bug.assignedEmployeeId);
      await tx.codeStudioBug.update({ where: { id: bug.id }, data: { status: CodeStudioBugStatus.FIXED, fixedAt: now, resolution: 'employee' } });
      const scenario = bug.scenarioKey ? BUG_SCENARIO_BY_KEY.get(bug.scenarioKey) : undefined;
      await this.log(
        tx,
        company.id,
        `${employee?.name ?? 'Tu equipo'} arregló: ${bug.title}`,
        scenario ? `Lo que aprendió el equipo: ${scenario.lesson}` : 'Bug resuelto.',
        'bug-fixed',
        'good',
      );
      await this.rewards.addXp(tx, userId, BUG_SEVERITY_WEIGHT[bug.severity] * 3, company.id);
    }
    const openBugs = company.bugReports.filter((entry) => !(entry.fixReadyAt && entry.fixReadyAt <= now));

    const input = this.engineInput(company, openBugs, elapsed);
    const result = this.engine.simulate(input);
    const profile = resolveProfile(input.profile);
    const metrics = result.metrics;
    const installed = new Set(company.modules.map((entry) => entry.module.slug));
    const stats = (company.stats ?? {}) as Record<string, any>;

    // Estado absoluto + deltas (cash/usuarios por increment para no pisar
    // una compra hecha en paralelo).
    const next = {
      satisfaction: result.state.satisfaction,
      reputation: result.state.reputation,
      techDebt: result.state.techDebt,
      cash: result.deltas.cash,
      users: result.deltas.activeUsers,
      newUsers: result.deltas.newUsers,
    };
    let openCount = openBugs.length;
    const openKeys = new Set(openBugs.map((bug) => bug.scenarioKey).filter(Boolean) as string[]);
    const spawn = async (trigger: BugTrigger, releasedSlug?: string) => {
      if (openCount >= MAX_OPEN_BUGS) return;
      const scenario = pickScenario(trigger, { installed, openKeys }, Math.random, releasedSlug);
      if (!scenario) return;
      await this.createBug(tx, company.id, scenario, company.stage);
      openKeys.add(scenario.key);
      openCount++;
    };

    // Releases.
    for (const update of result.tasks) {
      const task = company.development.find((entry) => entry.id === update.id)!;
      await tx.codeStudioDevelopmentTask.update({
        where: { id: task.id },
        data: {
          spentSeconds: Math.round(update.spentSeconds),
          progress: update.progress,
          status: update.completed ? CodeStudioDevelopmentStatus.COMPLETED : CodeStudioDevelopmentStatus.IN_PROGRESS,
          completedAt: update.completed ? now : undefined,
        },
      });
      if (!update.completed) continue;
      await tx.codeStudioCompanyModule.upsert({
        where: { companyId_moduleId: { companyId: company.id, moduleId: task.moduleId } },
        update: {},
        create: { companyId: company.id, moduleId: task.moduleId },
      });
      installed.add(task.module.slug);
      const lesson = (task.module.metadata as { lesson?: string } | null)?.lesson;
      const xp = task.module.difficulty ** 2 * 4;
      await this.log(tx, company.id, `En producción: ${task.module.name}`, `${lesson ?? ''} (+${xp} XP)`.trim(), 'release', 'good');
      await this.rewards.addXp(tx, userId, xp, company.id);
      await this.rewards.grantMilestone(tx, userId, 'first-feature', company.id);
      if (Math.random() < releaseBugChance(update.difficulty, metrics.quality, profile.bugSeverityFactor)) {
        await spawn('release', task.module.slug);
      }
      const branch = FEATURES.find((feature) => feature.slug === task.module.slug)?.branch;
      if (branch && FEATURES.filter((feature) => feature.branch === branch).every((feature) => installed.has(feature.slug))) {
        await this.rewards.grantMilestone(tx, userId, 'full-branch', company.id);
      }
    }

    // Bugs por carga, deuda técnica y seguridad (probabilidad por día).
    const days = elapsed / 60;
    if (metrics.utilization > 1.05 && Math.random() < Math.min(0.9, (metrics.utilization - 1) * 3 * days)) await spawn('load');
    if (result.state.techDebt > 35 && Math.random() < ((result.state.techDebt - 35) / 60) * days) await spawn('stability');
    if (company.activeUsers >= 150 && Math.random() < 0.05 * Math.max(0, 1 - metrics.security / 6) * days) await spawn('security');

    // Eventos de mercado y decisiones.
    const gameDays = result.state.gameDays;
    let nextEventDay = company.nextEventDay;
    const pending = await tx.codeStudioEventLog.findFirst({
      where: { companyId: company.id, effects: { path: ['status'], equals: 'pending' } },
    });
    const ctx = this.eventContext(company, metrics, installed);
    if (pending) {
      const effects = pending.effects as Record<string, any>;
      if (gameDays >= Number(effects.expiresAtDay ?? 0)) {
        const definition = DECISION_BY_KEY.get(effects.key);
        if (definition) {
          const outcome = definition.resolve(ctx, effects.params ?? {}, definition.defaultChoice, Math.random);
          await tx.codeStudioEventLog.update({
            where: { id: pending.id },
            data: { effects: { ...effects, status: 'expired', choice: definition.defaultChoice, outcome: outcome.message } },
          });
          this.foldOutcome(next, outcome);
          await this.applySideEffects(tx, company, outcome);
          await this.log(tx, company.id, `No decidiste a tiempo: ${definition.name}`, outcome.message, 'market', outcome.tone);
        }
      }
    } else if (gameDays >= nextEventDay && company.stage >= 1) {
      nextEventDay = gameDays + EVENT_INTERVAL_DAYS.min + Math.random() * (EVENT_INTERVAL_DAYS.max - EVENT_INTERVAL_DAYS.min);
      const useDecision = Math.random() < DECISION_SHARE;
      const decision = useDecision ? pickWeighted(DECISION_EVENTS.filter((event) => event.eligible(ctx)), Math.random) : null;
      if (decision) {
        const built = decision.build(ctx, Math.random);
        await tx.codeStudioEventLog.create({
          data: {
            companyId: company.id,
            title: decision.name,
            description: built.description,
            effects: {
              kind: 'decision',
              tone: 'neutral',
              status: 'pending',
              key: decision.key,
              params: built.params,
              choices: built.choices,
              expiresAtDay: gameDays + DECISION_TTL_DAYS,
            },
          },
        });
      } else {
        const passive = pickWeighted(PASSIVE_EVENTS.filter((event) => event.eligible(ctx)), Math.random);
        if (passive) {
          const outcome = passive.resolve(ctx, Math.random);
          this.foldOutcome(next, outcome);
          await this.applySideEffects(tx, company, outcome);
          await this.log(tx, company.id, passive.name, outcome.message, 'market', outcome.tone);
        }
      }
    }

    // Caja, deuda y quiebra.
    const finalCash = company.cash + next.cash;
    const debtDays = finalCash < 0 ? company.debtDays + days : 0;
    if (company.debtDays === 0 && debtDays > 0) {
      await this.log(
        tx,
        company.id,
        'Números rojos',
        `Tu caja está en negativo. Tienes ${BANKRUPTCY_DEBT_DAYS} días (minutos) para volver a positivo o la empresa quiebra. Opciones: despedir gente, subir precios, levantar inversión o vender más.`,
        'finance',
        'bad',
      );
    }
    if (company.debtDays > 1 && debtDays === 0) await this.rewards.grantMilestone(tx, userId, 'survived-debt', company.id);
    const failed = debtDays >= BANKRUPTCY_DEBT_DAYS;

    // Etapas.
    const stageMetrics: StageMetrics = {
      activeUsers: company.activeUsers + next.users,
      dailyRevenue: metrics.dailyRevenue,
      dailyProfit: metrics.dailyProfit,
      rating: result.state.rating,
      churn: metrics.churn,
      stability: result.state.stability,
      valuation: result.state.valuation,
      installedSlugs: installed,
      hasInfrastructure: company.infrastructure.length > 0,
    };
    const newStage = failed ? company.stage : evaluateStage(company.stage, stageMetrics);
    for (let reached = company.stage + 1; reached <= newStage; reached++) {
      const stage = STAGES[reached];
      next.cash += stage.reward.cash;
      await this.log(
        tx,
        company.id,
        `¡Nueva etapa: ${stage.name}!`,
        `${stage.tagline}${stage.reward.cash > 0 ? ` Una aceleradora te premia con ${money(stage.reward.cash)}.` : ''}`,
        'stage',
        'good',
      );
      await this.rewards.grantRepeatable(tx, userId, `stage-${reached}`, company.id);
    }
    if (metrics.dailyRevenue > 0) await this.grantOnce(tx, userId, 'first-revenue', company.id, stats);
    if (metrics.dailyProfit > 0 && company.employees.length >= 2) await this.grantOnce(tx, userId, 'first-profitable-day', company.id, stats);

    const activeUsers = Math.max(0, company.activeUsers + next.users);
    const status = failed
      ? CodeStudioCompanyStatus.FAILED
      : metrics.launched && activeUsers > 0
        ? CodeStudioCompanyStatus.LIVE
        : company.modules.length > 0 || company.development.length > 0
          ? CodeStudioCompanyStatus.BUILDING
          : CodeStudioCompanyStatus.IDEA;

    await tx.codeStudioCompany.update({
      where: { id: company.id },
      data: {
        cash: { increment: next.cash },
        activeUsers: { increment: Math.max(-company.activeUsers, next.users) },
        totalUsers: { increment: Math.max(0, next.newUsers) },
        revenue: { increment: result.deltas.revenue },
        expenses: { increment: result.deltas.expenses },
        satisfaction: clamp(next.satisfaction, 0, 100),
        reputation: clamp(next.reputation, 0, 100),
        bugs: clamp(next.techDebt, 0, 100),
        rating: result.state.rating,
        stability: result.state.stability,
        latency: result.state.latency,
        valuation: result.state.valuation,
        debtDays,
        gameDays,
        nextEventDay,
        stage: newStage,
        status,
        tickCount: { increment: 1 },
        stats: { ...stats, ...metrics } as Prisma.InputJsonValue,
        ...(failed ? { failedAt: now, failureReason: this.postMortem(company, metrics) } : {}),
      },
    });

    if (failed) {
      await this.log(tx, company.id, 'Tu startup quebró', this.postMortem(company, metrics), 'failure', 'bad');
      await this.rewards.addXp(tx, userId, 0, company.id, { bankruptcies: 1 });
      await this.rewards.grantMilestone(tx, userId, 'first-bankruptcy', company.id);
    }
    if (result.state.valuation > 0) {
      await tx.codeStudioProfile.updateMany({
        where: { userId, bestValuation: { lt: result.state.valuation } },
        data: { bestValuation: result.state.valuation },
      });
    }

    // Snapshot para los gráficos, como mucho uno por minuto.
    if (!company.lastSnapshotAt || now.getTime() - company.lastSnapshotAt.getTime() >= SNAPSHOT_EVERY_MS) {
      await tx.codeStudioAnalyticsSnapshot.create({
        data: {
          companyId: company.id,
          activeUsers,
          newUsers: Math.round(metrics.dailyNewUsers),
          lostUsers: Math.round(metrics.dailyLostUsers),
          retention: clamp(1 - metrics.churn, 0, 1),
          conversion: metrics.arpu,
          errors: next.techDebt,
          latency: result.state.latency,
          rating: result.state.rating,
          revenue: Math.round(metrics.dailyRevenue),
          expenses: Math.round(metrics.dailyCosts),
          metadata: { cash: company.cash + next.cash, satisfaction: next.satisfaction, valuation: result.state.valuation },
        },
      });
      await tx.codeStudioCompany.update({ where: { id: company.id }, data: { lastSnapshotAt: now } });
      if (Math.random() < 0.1) await this.prune(tx, company.id);
    }
  }

  // Empresas creadas con la economía vieja: se convierten una sola vez.
  // Se conserva todo lo construido; la caja negativa se perdona para que la
  // nueva regla de quiebra no las mate apenas entren.
  private async convertLegacyCompany(company: LoadedCompany) {
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.codeStudioCompany.updateMany({
        where: { id: company.id, simVersion: { lt: 2 } },
        data: {
          simVersion: 2,
          cash: Math.max(company.cash, 2000),
          debtDays: 0,
          gameDays: 0,
          nextEventDay: 8,
          bugs: Math.min(company.bugs, 30),
          lastSimulatedAt: new Date(),
        },
      });
      if (updated.count === 0) return;
      await tx.codeStudioBug.updateMany({
        where: { companyId: company.id, status: CodeStudioBugStatus.OPEN, scenarioKey: null },
        data: { status: CodeStudioBugStatus.FIXED, fixedAt: new Date(), resolution: 'migration' },
      });
      await this.log(
        tx,
        company.id,
        'CodeStudio 2.0',
        'Llegó una economía nueva: 1 minuto = 1 día, sin monetización no hay ingresos, si la caja queda en rojo 7 días quiebras, y los bugs se resuelven diagnosticándolos. Tus features anteriores siguen instaladas; el nuevo Árbol está en la pestaña Árbol.',
        'info',
        'neutral',
      );
    });
  }

  // ─── Vista para el cliente ──────────────────────────────────────────────

  private async buildView(userId: string, companyId: string) {
    const company = await this.requireOwned(userId, companyId);
    const [events, snapshots, catalog, profile, campaignSummary] = await Promise.all([
      this.prisma.codeStudioEventLog.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' }, take: 30 }),
      this.prisma.codeStudioAnalyticsSnapshot.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' }, take: 40 }),
      this.catalogService.catalog(),
      this.rewards.getProfile(userId),
      this.prisma.codeStudioCampaignRun.groupBy({
        by: ['channel'],
        where: { companyId },
        _sum: { gainedUsers: true, cost: true },
        _count: { _all: true },
      }),
    ]);
    const metrics = this.metricsOf(company);
    const appProfile = resolveProfile((company.appType.simulationProfile ?? {}) as Record<string, any>);
    const installed = new Set(company.modules.map((entry) => entry.module.slug));
    const developing = new Map(company.development.map((task, index) => [task.module.slug, { task, index }]));
    const now = Date.now();

    const stageMetrics: StageMetrics = {
      activeUsers: company.activeUsers,
      dailyRevenue: metrics.dailyRevenue,
      dailyProfit: metrics.dailyProfit,
      rating: company.rating,
      churn: metrics.churn,
      stability: company.stability,
      valuation: company.valuation,
      installedSlugs: installed,
      hasInfrastructure: company.infrastructure.length > 0,
    };
    const stage = STAGES[Math.min(company.stage, MAX_STAGE)];
    const nextStage = company.stage < MAX_STAGE ? STAGES[company.stage + 1] : null;

    const tree = catalog.features.map((feature) => {
      const dev = developing.get(feature.slug);
      const missing = feature.requires.filter((slug) => !installed.has(slug));
      const state = installed.has(feature.slug)
        ? 'installed'
        : dev
          ? dev.index < metrics.maxParallel
            ? 'developing'
            : 'queued'
          : feature.minStage > company.stage
            ? 'locked-stage'
            : missing.length > 0
              ? 'locked'
              : 'available';
      return { slug: feature.slug, state, fit: appProfile.featureFit[feature.slug] ?? 1, missing };
    });

    const quotesByChannel = await this.campaignQuotes(company);
    const offer = fundingOffer(company.fundingRound, company.valuation);
    const pending = events.find((event) => (event.effects as Record<string, any> | null)?.status === 'pending');
    const pendingEffects = (pending?.effects ?? {}) as Record<string, any>;
    const busyEmployeeIds = new Set(company.bugReports.map((bug) => bug.assignedEmployeeId).filter(Boolean) as string[]);

    return {
      id: company.id,
      name: company.name,
      status: company.status,
      appType: {
        id: company.appType.id,
        slug: company.appType.slug,
        name: company.appType.name,
        color: company.appType.color,
        icon: company.appType.icon,
        description: company.appType.description,
      },
      cash: company.cash,
      valuation: company.valuation,
      activeUsers: company.activeUsers,
      totalUsers: company.totalUsers,
      satisfaction: company.satisfaction,
      rating: company.rating,
      reputation: company.reputation,
      techDebt: company.bugs,
      stability: company.stability,
      latency: company.latency,
      founderEquity: company.founderEquity,
      priceLevel: company.priceLevel,
      debtDays: company.debtDays,
      daysUntilBankruptcy: company.debtDays > 0 ? Math.max(0, BANKRUPTCY_DEBT_DAYS - company.debtDays) : null,
      gameDays: company.gameDays,
      failedAt: company.failedAt,
      failureReason: company.failureReason,
      metrics,
      stage: {
        index: company.stage,
        name: stage.name,
        tagline: stage.tagline,
        goals: company.stage < MAX_STAGE ? stageProgress(company.stage, stageMetrics) : [],
        next: nextStage ? { name: nextStage.name, reward: nextStage.reward } : null,
      },
      tree,
      legacyFeatures: company.modules
        .filter((entry) => !(entry.module.metadata as { v2?: boolean } | null)?.v2)
        .map((entry) => ({ name: entry.module.name, category: entry.module.category })),
      development: company.development.map((task, index) => ({
        id: task.id,
        slug: task.module.slug,
        name: task.module.name,
        progress: task.progress,
        queued: index >= metrics.maxParallel,
        remainingSeconds:
          index < metrics.maxParallel
            ? Math.max(0, (task.requiredSeconds - task.spentSeconds) / Math.max(0.1, metrics.devPower / Math.min(metrics.maxParallel, company.development.length)))
            : null,
        refund: Math.round(task.module.cost * 0.5),
      })),
      employees: company.employees.map((employee) => ({
        id: employee.id,
        name: employee.name,
        roleSlug: employee.employeeType.slug,
        roleName: employee.employeeType.name,
        salary: employee.salary,
        severance: Math.round(employee.salary * SEVERANCE_FACTOR),
        canFixBugs: BUG_CAPABLE_ROLES.has(employee.employeeType.slug),
        busy: busyEmployeeIds.has(employee.id),
      })),
      hosting: company.infrastructure.map((item) => {
        const scaling = (item.infrastructureType.scaling ?? {}) as Record<string, number>;
        return {
          typeId: item.infrastructureTypeId,
          slug: item.infrastructureType.slug,
          name: item.infrastructureType.name,
          level: item.level,
          maxLevel: Number(scaling.maxLevel ?? 5),
          capacity: Number(scaling.capacity ?? 0) * item.level,
          monthly: Number(scaling.monthly ?? 0) * item.level,
          upgradeCost: item.infrastructureType.baseCost * (item.level + 1),
          legacy: !item.infrastructureType.active,
        };
      }),
      bugs: company.bugReports.map((bug) => this.publicBug(bug, company.stage, now)),
      pendingDecision: pending
        ? {
            id: pending.id,
            title: pending.title,
            description: pending.description,
            choices: pendingEffects.choices ?? [],
            daysLeft: Math.max(0, Number(pendingEffects.expiresAtDay ?? 0) - company.gameDays),
          }
        : null,
      events: events
        .filter((event) => (event.effects as Record<string, any> | null)?.status !== 'pending')
        .map((event) => {
          const effects = (event.effects ?? {}) as Record<string, any>;
          return {
            id: event.id,
            title: event.title,
            description: effects.kind === 'decision' && effects.outcome ? effects.outcome : event.description,
            kind: effects.kind ?? 'info',
            tone: effects.tone ?? 'neutral',
            createdAt: event.createdAt,
          };
        }),
      snapshots: snapshots.reverse().map((snapshot) => ({
        activeUsers: snapshot.activeUsers,
        revenue: snapshot.revenue,
        expenses: snapshot.expenses,
        rating: snapshot.rating,
        createdAt: snapshot.createdAt,
      })),
      marketing: {
        channels: quotesByChannel,
        summary: campaignSummary
          .map((row) => ({ channel: row.channel, gainedUsers: row._sum.gainedUsers ?? 0, spent: row._sum.cost ?? 0, runs: row._count._all }))
          .sort((a, b) => b.gainedUsers - a.gainedUsers),
      },
      funding: offer
        ? {
            name: offer.name,
            raise: offer.raise,
            equity: offer.equity,
            minStage: offer.minStage,
            minStageName: STAGES[offer.minStage].name,
            available: company.stage >= offer.minStage && company.rating >= FUNDING_MIN_RATING,
            minRating: FUNDING_MIN_RATING,
          }
        : null,
      profile,
    };
  }

  // Las opciones correctas y sus explicaciones NO viajan al cliente hasta
  // que el jugador responde: si no, el mini-juego se resuelve abriendo las
  // devtools.
  private publicBug(bug: LoadedCompany['bugReports'][number], stage: number, now: number) {
    const scenario = bug.scenarioKey ? BUG_SCENARIO_BY_KEY.get(bug.scenarioKey) : undefined;
    return {
      id: bug.id,
      title: bug.title,
      severity: bug.severity,
      symptom: scenario?.symptom ?? bug.description,
      evidence: scenario?.evidence ?? [],
      options: scenario?.options.map((option) => ({ key: option.key, label: option.label })) ?? [],
      attempts: bug.attempts,
      consultantCost: bug.fixCost,
      diagnoseCost: Math.round(bug.fixCost * DIAGNOSE_COST_FACTOR),
      wrongCost: Math.round(bug.fixCost * WRONG_DIAGNOSIS_COST_FACTOR),
      xpReward: BUG_SEVERITY_WEIGHT[bug.severity] * 12 * (bug.attempts === 0 ? 2 : 1),
      assignedEmployeeId: bug.assignedEmployeeId,
      fixSecondsLeft: bug.fixReadyAt ? Math.max(0, Math.ceil((bug.fixReadyAt.getTime() - now) / 1000)) : null,
      employeeFixSeconds: BUG_SEVERITY_WEIGHT[bug.severity] * EMPLOYEE_FIX_SECONDS_PER_WEIGHT,
      createdAt: bug.createdAt,
      stage,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private engineInput(company: LoadedCompany, openBugs: LoadedCompany['bugReports'], elapsedSeconds: number): EngineInput {
    const busy = new Set(openBugs.map((bug) => bug.assignedEmployeeId).filter(Boolean) as string[]);
    return {
      company: {
        activeUsers: company.activeUsers,
        cash: company.cash,
        satisfaction: company.satisfaction,
        rating: company.rating,
        reputation: company.reputation,
        techDebt: company.bugs,
        stability: company.stability,
        debtDays: company.debtDays,
        gameDays: company.gameDays,
        priceLevel: company.priceLevel,
      },
      profile: (company.appType.simulationProfile ?? {}) as Record<string, any>,
      features: company.modules.map((entry) => ({
        slug: entry.module.slug,
        effects: entry.module.effects as Record<string, number> | null,
        legacy: !(entry.module.metadata as { v2?: boolean } | null)?.v2,
      })),
      employees: company.employees.map((employee) => ({
        id: employee.id,
        roleSlug: employee.employeeType.slug,
        productivity: employee.productivity,
        speed: employee.speed,
        salary: employee.salary,
        busy: busy.has(employee.id),
      })),
      hosting: this.hostingOf(company),
      tasks: company.development.map((task) => ({
        id: task.id,
        featureSlug: task.module.slug,
        requiredSeconds: task.requiredSeconds,
        spentSeconds: task.spentSeconds,
        difficulty: task.module.difficulty,
      })),
      openBugWeight: openBugs.reduce((sum, bug) => sum + BUG_SEVERITY_WEIGHT[bug.severity], 0),
      elapsedSeconds,
    };
  }

  private hostingOf(company: LoadedCompany): EngineHosting[] {
    return company.infrastructure.map((item) => {
      const scaling = (item.infrastructureType.scaling ?? {}) as Record<string, number>;
      return {
        level: item.level,
        capacity: Number(scaling.capacity ?? 0),
        latency: Number(scaling.latency ?? item.latency),
        stability: Number(scaling.stability ?? item.stability),
        monthly: Number(scaling.monthly ?? item.cost),
      };
    });
  }

  // Métricas del estado ACTUAL (un tick de 0 segundos, cálculo puro sin
  // base de datos): así, apenas contratas a alguien, la vista ya muestra el
  // nuevo sueldo y la nueva velocidad sin esperar al próximo tick.
  private metricsOf(company: LoadedCompany): EngineMetrics {
    return this.engine.simulate(this.engineInput(company, company.bugReports, 0)).metrics;
  }

  private eventContext(company: LoadedCompany, metrics = this.metricsOf(company), installed = new Set(company.modules.map((entry) => entry.module.slug))): EventContext {
    const profile = resolveProfile((company.appType.simulationProfile ?? {}) as Record<string, any>);
    return {
      stage: company.stage,
      activeUsers: company.activeUsers,
      dailyRevenue: metrics.dailyRevenue,
      valuation: company.valuation,
      rating: company.rating,
      cash: company.cash,
      installed,
      hostingSlugs: new Set(company.infrastructure.map((item) => item.infrastructureType.slug)),
      hasMonetization: metrics.arpu > 0,
      activeTaskCount: company.development.length,
      employees: company.employees.map((employee) => ({ id: employee.id, name: employee.name, salary: employee.salary, roleName: employee.employeeType.name })),
      channelFit: (slug) => profile.channelEffectiveness[slug] ?? 1,
    };
  }

  private async quoteCampaign(company: LoadedCompany, channelSlug: string, multiplier: number) {
    const recentRuns = await this.prisma.codeStudioCampaignRun.count({
      where: { companyId: company.id, campaign: { slug: channelSlug }, createdAt: { gte: new Date(Date.now() - CAMPAIGN_FATIGUE_WINDOW_MS) } },
    });
    const profile = resolveProfile((company.appType.simulationProfile ?? {}) as Record<string, any>);
    return campaignQuote({
      channelSlug,
      multiplier,
      rating: company.rating,
      fit: profile.channelEffectiveness[channelSlug] ?? 1,
      cacDiscount: this.metricsOf(company).cacDiscount,
      recentRuns,
      penetration: company.activeUsers / profile.tam,
    });
  }

  private async campaignQuotes(company: LoadedCompany) {
    const catalog = await this.catalogService.catalog();
    const recent = await this.prisma.codeStudioCampaignRun.groupBy({
      by: ['campaignId'],
      where: { companyId: company.id, createdAt: { gte: new Date(Date.now() - CAMPAIGN_FATIGUE_WINDOW_MS) } },
      _count: { _all: true },
    });
    const recentById = new Map(recent.map((row) => [row.campaignId, row._count._all]));
    const profile = resolveProfile((company.appType.simulationProfile ?? {}) as Record<string, any>);
    const metrics = this.metricsOf(company);
    return catalog.channels.map((channel) => ({
      id: channel.id,
      slug: channel.slug,
      name: channel.name,
      channel: channel.channel,
      minStage: channel.minStage,
      locked: channel.minStage > company.stage,
      fit: profile.channelEffectiveness[channel.slug] ?? 1,
      fatigue: recentById.get(channel.id) ?? 0,
      quotes: CAMPAIGN_BUDGET_MULTIPLIERS.map((multiplier) => {
        const quote = campaignQuote({
          channelSlug: channel.slug,
          multiplier,
          rating: company.rating,
          fit: profile.channelEffectiveness[channel.slug] ?? 1,
          cacDiscount: metrics.cacDiscount,
          recentRuns: recentById.get(channel.id) ?? 0,
          penetration: company.activeUsers / profile.tam,
        });
        return { multiplier, cost: quote?.cost ?? 0, users: quote?.users ?? 0, cac: quote?.cac ?? 0 };
      }),
    }));
  }

  private async createBug(tx: Tx, companyId: string, scenario: BugScenario, stage: number) {
    await tx.codeStudioBug.create({
      data: {
        companyId,
        kind: scenario.trigger,
        scenarioKey: scenario.key,
        title: scenario.title,
        description: scenario.symptom,
        severity: scenario.severity as CodeStudioBugSeverity,
        fixCost: consultantFixCost(scenario.severity, stage),
      },
    });
    await this.log(tx, companyId, `Nuevo bug: ${scenario.title}`, `${scenario.symptom} Diagnostícalo en la pestaña Bugs.`, 'bug', 'bad');
  }

  // Suma los efectos "de estado" de un evento al tick que se está por
  // guardar (así no se pisan con el update final de la simulación).
  private foldOutcome(next: { cash: number; users: number; satisfaction: number; reputation: number; techDebt: number; newUsers: number }, outcome: EventOutcome) {
    next.cash += outcome.cash ?? 0;
    next.users += outcome.users ?? 0;
    if ((outcome.users ?? 0) > 0) next.newUsers += outcome.users ?? 0;
    next.satisfaction += outcome.satisfaction ?? 0;
    next.reputation += outcome.reputation ?? 0;
    next.techDebt += outcome.techDebt ?? 0;
  }

  // Para decisiones tomadas por el jugador (fuera del tick).
  private async applyOutcome(tx: Tx, company: LoadedCompany, outcome: EventOutcome) {
    const users = Math.max(-company.activeUsers, outcome.users ?? 0);
    await tx.codeStudioCompany.update({
      where: { id: company.id },
      data: {
        cash: { increment: outcome.cash ?? 0 },
        ...((outcome.cash ?? 0) < 0 ? { expenses: { increment: -(outcome.cash ?? 0) } } : {}),
        activeUsers: { increment: users },
        totalUsers: { increment: Math.max(0, users) },
        satisfaction: clamp(company.satisfaction + (outcome.satisfaction ?? 0), 0, 100),
        reputation: clamp(company.reputation + (outcome.reputation ?? 0), 0, 100),
        bugs: clamp(company.bugs + (outcome.techDebt ?? 0), 0, 100),
      },
    });
    await this.applySideEffects(tx, company, outcome);
    await this.log(tx, company.id, 'Decisión tomada', outcome.message, 'market', outcome.tone);
  }

  private async applySideEffects(tx: Tx, company: LoadedCompany, outcome: EventOutcome) {
    if (outcome.taskProgressBoost) {
      for (const task of company.development) {
        const spentSeconds = Math.min(task.requiredSeconds, Math.round(task.spentSeconds + task.requiredSeconds * outcome.taskProgressBoost));
        await tx.codeStudioDevelopmentTask.update({
          where: { id: task.id },
          data: { spentSeconds, progress: clamp((spentSeconds / Math.max(1, task.requiredSeconds)) * 100, 0, 100) },
        });
      }
    }
    if (outcome.raiseSalary) {
      const employee = company.employees.find((entry) => entry.id === outcome.raiseSalary!.employeeId);
      if (employee) {
        await tx.codeStudioEmployee.update({ where: { id: employee.id }, data: { salary: Math.round(employee.salary * outcome.raiseSalary.factor) } });
      }
    }
    if (outcome.removeEmployeeId && company.employees.some((entry) => entry.id === outcome.removeEmployeeId)) {
      await tx.codeStudioBug.updateMany({
        where: { companyId: company.id, assignedEmployeeId: outcome.removeEmployeeId },
        data: { assignedEmployeeId: null, fixReadyAt: null },
      });
      await tx.codeStudioEmployee.delete({ where: { id: outcome.removeEmployeeId } });
    }
    if (outcome.spawnBugKey) {
      const scenario = BUG_SCENARIO_BY_KEY.get(outcome.spawnBugKey);
      const alreadyOpen = company.bugReports.some((bug) => bug.scenarioKey === outcome.spawnBugKey);
      if (scenario && !alreadyOpen && company.bugReports.length < MAX_OPEN_BUGS) await this.createBug(tx, company.id, scenario, company.stage);
    }
  }

  // Logros que se chequean en cada tick: stats.granted evita pegarle a la
  // base 6 veces por minuto una vez que ya se otorgaron.
  private async grantOnce(tx: Tx, userId: string, key: string, companyId: string, stats: Record<string, any>) {
    const granted: string[] = Array.isArray(stats.granted) ? stats.granted : [];
    if (granted.includes(key)) return;
    await this.rewards.grantMilestone(tx, userId, key, companyId);
    stats.granted = [...granted, key];
  }

  private postMortem(company: LoadedCompany, metrics: EngineMetrics) {
    const reasons: string[] = [
      `Gastabas ${money(metrics.dailyCosts)} por día (sueldos ${money(metrics.dailySalaries)}, servidores ${money(metrics.dailyInfra)}) y entraban ${money(metrics.dailyRevenue)}.`,
    ];
    if (metrics.arpu === 0) reasons.push('Nunca construiste una forma de cobrar: sin la rama Monetización, los usuarios no dejan dinero.');
    if (company.employees.length >= 3 && metrics.dailyRevenue < metrics.dailySalaries * 0.5) {
      reasons.push('Contrataste más rápido de lo que crecían tus ingresos. Cada sueldo es un compromiso diario.');
    }
    if (metrics.churn > 0.04) reasons.push(`Tus usuarios se iban rápido (${(metrics.churn * 100).toFixed(1)}% por día): mejora la satisfacción y la retención.`);
    if (company.fundingRound === 0 && company.stage >= 2) reasons.push('Podías levantar una ronda de inversión y no lo hiciste.');
    reasons.push('Tu nivel de fundador y tus logros se conservan: la próxima arranca con más caja.');
    return reasons.join(' ');
  }

  private async prune(tx: Tx, companyId: string) {
    const [snapshotCutoff, eventCutoff] = await Promise.all([
      tx.codeStudioAnalyticsSnapshot.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' }, skip: KEEP_SNAPSHOTS, select: { createdAt: true } }),
      tx.codeStudioEventLog.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' }, skip: KEEP_EVENTS, select: { createdAt: true } }),
    ]);
    if (snapshotCutoff) await tx.codeStudioAnalyticsSnapshot.deleteMany({ where: { companyId, createdAt: { lte: snapshotCutoff.createdAt } } });
    if (eventCutoff) await tx.codeStudioEventLog.deleteMany({ where: { companyId, createdAt: { lte: eventCutoff.createdAt } } });
  }

  // Cobro atómico: solo descuenta si hay caja suficiente (evita que dos
  // clicks simultáneos gasten la misma plata dos veces).
  private async spend(tx: Tx, companyId: string, amount: number, message = 'Fondos insuficientes') {
    if (amount <= 0) return;
    const result = await tx.codeStudioCompany.updateMany({
      where: { id: companyId, cash: { gte: amount }, status: { not: CodeStudioCompanyStatus.FAILED } },
      data: { cash: { decrement: amount }, expenses: { increment: amount } },
    });
    if (result.count === 0) throw new BadRequestException(message);
  }

  private log(tx: Tx, companyId: string, title: string, description: string, kind: string, tone: string) {
    return tx.codeStudioEventLog.create({ data: { companyId, title, description, effects: { kind, tone } } });
  }

  private async requireOwned(userId: string, companyId: string) {
    const company = await this.prisma.codeStudioCompany.findUnique({ where: { id: companyId }, include: companyInclude });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    if (company.userId !== userId) throw new ForbiddenException('No puedes acceder a esta empresa');
    return company;
  }

  private async requireAlive(userId: string, companyId: string) {
    const company = await this.requireOwned(userId, companyId);
    if (company.status === CodeStudioCompanyStatus.FAILED) throw new BadRequestException('Esta empresa quebró. Funda una nueva.');
    return company;
  }

  private generateEmployeeName() {
    const first = ['Nico', 'Luna', 'Max', 'Ari', 'Sofi', 'Kai', 'Vale', 'Leo', 'Mara', 'Noah', 'Iris', 'Tomi', 'Juli', 'Emi', 'Sam'];
    const last = ['Pixel', 'Stack', 'Cloud', 'Sprint', 'Byte', 'Nova', 'Cache', 'Loop', 'Script', 'Rocket', 'Commit', 'Deploy'];
    return `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`;
  }

  // ─── Admin (catálogo editable desde /admin/codestudio) ──────────────────

  async adminList(resource: string) {
    return this.model(resource).findMany({ orderBy: { order: 'asc' } }).catch(() => this.model(resource).findMany());
  }

  async adminCreate(resource: string, data: Record<string, any>) {
    const created = await this.model(resource).create({ data: this.sanitizeAdminPayload(data) });
    this.catalogService.invalidate();
    return created;
  }

  async adminUpdate(resource: string, id: string, data: Record<string, any>) {
    const updated = await this.model(resource).update({ where: { id }, data: this.sanitizeAdminPayload(data) });
    this.catalogService.invalidate();
    return updated;
  }

  async adminDelete(resource: string, id: string) {
    const deleted = await this.model(resource).delete({ where: { id } });
    this.catalogService.invalidate();
    return deleted;
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
      'snapshots',
      'events',
      'user',
    ]);
    return Object.fromEntries(Object.entries(data).filter(([key, value]) => !blocked.has(key) && value !== undefined));
  }
}
