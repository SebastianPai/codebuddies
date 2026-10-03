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
import { TRAITS, bumpStats, performanceOf, rollTrait, statsOf, traitOf } from './content/traits';
import { cardStats, employeeName, genderOf, resolveSkin, rollGender } from './content/employee-card';
import { OFFICE_TAGS, OfficeCounts, countOffice, officeFactors, officeLines, officePrice, officeSummary } from './content/office';
import { employeeLines } from './content/office-lines';
import {
  BUG_CAPABLE_ROLES,
  ROLE_BY_SLUG,
  CAMPAIGN_BUDGET_MULTIPLIERS,
  CAMPAIGN_FATIGUE_WINDOW_MS,
  HIRE_BONUS_FACTOR,
  SEVERANCE_FACTOR,
} from './content/economy';
import { FEATURES } from './content/features';
import { FUNDING_MIN_RATING, GAME_XP_FACTOR, MAX_STAGE, STAGES, StageMetrics, startingCashBonus } from './content/progression';
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
import { L, Lang, Localized, MSG, contentFor, localizeScenario, pick, stageText } from './content/i18n';
import { CreateCodeStudioCompanyDto } from './dto/create-codestudio-company.dto';
import { StartDevelopmentDto } from './dto/start-development.dto';
import { HireEmployeeDto } from './dto/hire-employee.dto';
import { InstallInfrastructureDto } from './dto/install-infrastructure.dto';
import { FixBugDto } from './dto/fix-bug.dto';
import { LaunchCampaignDto } from './dto/launch-campaign.dto';
import { ChooseDecisionDto } from './dto/choose-decision.dto';
import { SetPricingDto } from './dto/set-pricing.dto';

// Los bugs nuevos esperan 2 min antes de que un Product Manager se los pase
// al equipo: tiempo para que el jugador los diagnostique (y aprenda).
const AUTO_ASSIGN_DELAY_MS = 120_000;

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
// request ya simuló este mismo intervalo (ver guard en runSimulation).
class SimulationRaceError extends Error {}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

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

  catalog(lang: Lang = 'es') {
    return this.catalogService.catalog(lang);
  }

  // Liviano a propósito: lista de empresas SIN simular (la que el jugador
  // está mirando se simula al pedirla con getCompany) + catálogo + carrera.
  async myStudio(userId: string, lang: Lang = 'es') {
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
      this.catalogService.catalog(lang),
      this.rewards.getProfile(userId, lang),
    ]);
    const t = contentFor(lang);
    return {
      companies: companies.map((company) => ({
        ...company,
        appType: { ...company.appType, name: t?.appTypes[company.appType.slug]?.name ?? company.appType.name },
      })),
      catalog,
      profile,
    };
  }

  // Resumen liviano para la web (dashboard, misiones, recompensas): la
  // empresa principal, el progreso y las misiones de hoy, sin el catálogo
  // ni simular nada (la web solo invita a jugar, no avanza el juego).
  async summary(userId: string, lang: Lang = 'es') {
    const [companies, profile] = await Promise.all([
      this.prisma.codeStudioCompany.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, status: true, stage: true, cash: true, activeUsers: true, valuation: true },
      }),
      this.rewards.getProfile(userId, lang),
    ]);
    const main = companies.find((company) => company.status !== 'FAILED') ?? null;
    return {
      company: main
        ? {
            ...main,
            stageName: stageText(main.stage, lang).name,
            stageCount: STAGES.length,
          }
        : null,
      companiesCount: companies.length,
      level: profile.level,
      xp: profile.xp,
      levelXp: profile.levelXp,
      nextLevelXp: profile.nextLevelXp,
      gameXpToday: profile.gameXpToday,
      gameXpCap: profile.gameXpCap,
      daily: profile.daily,
      milestones: profile.milestones.length,
      totalMilestones: profile.totalMilestones,
    };
  }

  // Logros de CodeStudio para la página de logros de la web.
  achievements(userId: string, lang: Lang = 'es') {
    return this.rewards.achievements(userId, lang);
  }

  async getCompany(userId: string, companyId: string, lang: Lang = 'es') {
    await this.simulateCompany(userId, companyId, lang);
    return this.buildView(userId, companyId, lang);
  }

  async ranking(lang: Lang = 'es') {
    if (!this.rankingCache || Date.now() - this.rankingCache.at >= 30_000) {
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
          appType: { select: { name: true, color: true, slug: true } },
          user: { select: { username: true, avatarUrl: true } },
        },
      });
      this.rankingCache = { at: Date.now(), rows };
    }
    const t = contentFor(lang);
    return (this.rankingCache.rows as Array<{ appType: { name: string; slug: string; color: string | null } }>).map((row) => ({
      ...row,
      appType: { ...row.appType, name: t?.appTypes[row.appType.slug]?.name ?? row.appType.name },
    }));
  }

  // ─── Crear / borrar ─────────────────────────────────────────────────────

  async createCompany(userId: string, dto: CreateCodeStudioCompanyDto, lang: Lang = 'es') {
    const name = dto.name.trim();
    if (name.length < 3 || name.length > 40) throw new BadRequestException(pick(MSG.nameLength(), lang));
    const appType = await this.prisma.codeStudioAppType.findUnique({ where: { id: dto.appTypeId } });
    if (!appType || !appType.active) throw new BadRequestException(pick(MSG.appTypeUnavailable(), lang));

    const profile = await this.rewards.getProfile(userId, lang);
    const appProfile = (appType.simulationProfile ?? {}) as Record<string, any>;
    const minLevel = Number(appProfile.minFounderLevel ?? 1);
    if (profile.level < minLevel) {
      const appName = contentFor(lang)?.appTypes[appType.slug]?.name ?? appType.name;
      throw new BadRequestException(pick(MSG.appTypeLocked(appName, minLevel, profile.level), lang));
    }
    const alive = await this.prisma.codeStudioCompany.count({ where: { userId, status: { not: CodeStudioCompanyStatus.FAILED } } });
    if (alive >= MAX_ALIVE_COMPANIES) throw new BadRequestException(pick(MSG.tooManyCompanies(MAX_ALIVE_COMPANIES), lang));

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
      await this.log(tx, created.id, MSG.welcomeTitle(), MSG.welcomeText(cash), 'info', 'neutral', lang);
      await this.rewards.addXp(tx, userId, 0, null, { companiesFounded: 1 }, lang);
      await this.rewards.grantMilestone(tx, userId, 'first-company', created.id, lang);
      const types = await tx.codeStudioCompany.findMany({ where: { userId }, distinct: ['appTypeId'], select: { appTypeId: true } });
      if (types.length >= 3) await this.rewards.grantMilestone(tx, userId, 'serial-founder', created.id, lang);
      return created;
    });
    this.rankingCache = null;
    return this.buildView(userId, company.id, lang);
  }

  async deleteCompany(userId: string, companyId: string, lang: Lang = 'es') {
    const company = await this.requireOwned(userId, companyId, lang);
    await this.prisma.codeStudioCompany.delete({ where: { id: company.id } });
    this.rankingCache = null;
    return { id: company.id, name: company.name };
  }

  // ─── Acciones del jugador ───────────────────────────────────────────────

  async startDevelopment(userId: string, companyId: string, dto: StartDevelopmentDto, lang: Lang = 'es') {
    const company = await this.requireAlive(userId, companyId, lang);
    const module = await this.prisma.codeStudioModule.findUnique({ where: { id: dto.moduleId } });
    if (!module || !module.active || !(module.metadata as { v2?: boolean } | null)?.v2) throw new NotFoundException(pick(MSG.featureUnavailable(), lang));
    if (company.modules.some((entry) => entry.moduleId === module.id)) throw new BadRequestException(pick(MSG.featureInstalled(), lang));
    if (company.development.some((task) => task.moduleId === module.id)) throw new BadRequestException(pick(MSG.featureInProgress(), lang));
    if (company.development.length >= MAX_DEVELOPMENT_QUEUE) throw new BadRequestException(pick(MSG.queueFull(MAX_DEVELOPMENT_QUEUE), lang));
    const requirements = (module.requirements ?? {}) as { requires?: string[]; minStage?: number };
    if ((requirements.minStage ?? 0) > company.stage) {
      throw new BadRequestException(pick(MSG.unlocksAtStage(stageText(requirements.minStage ?? 0, lang).name), lang));
    }
    const installed = new Set(company.modules.map((entry) => entry.module.slug));
    const missing = (requirements.requires ?? []).filter((slug) => !installed.has(slug));
    if (missing.length > 0) {
      const names = missing.map((slug) => this.featureName(slug, lang));
      throw new BadRequestException(pick(MSG.needsFirst(names.join(', ')), lang));
    }

    await this.prisma.$transaction(async (tx) => {
      await this.spend(tx, company.id, module.cost, lang);
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
    return this.getCompany(userId, companyId, lang);
  }

  // Cancelar devuelve la mitad: el trabajo hecho no se recupera.
  async cancelDevelopment(userId: string, companyId: string, taskId: string, lang: Lang = 'es') {
    const company = await this.requireAlive(userId, companyId, lang);
    const task = company.development.find((entry) => entry.id === taskId);
    if (!task) throw new NotFoundException(pick(MSG.taskNotFound(), lang));
    const refund = Math.round(task.module.cost * 0.5);
    await this.prisma.$transaction(async (tx) => {
      await tx.codeStudioDevelopmentTask.update({ where: { id: task.id }, data: { status: CodeStudioDevelopmentStatus.CANCELLED } });
      await tx.codeStudioCompany.update({ where: { id: company.id }, data: { cash: { increment: refund } } });
      await this.log(tx, company.id, MSG.cancelledTitle(this.featureName(task.module.slug, lang)), MSG.cancelledText(refund), 'info', 'neutral', lang);
    });
    return this.getCompany(userId, companyId, lang);
  }

  async hireEmployee(userId: string, companyId: string, dto: HireEmployeeDto, lang: Lang = 'es') {
    const company = await this.requireAlive(userId, companyId, lang);
    const type = await this.prisma.codeStudioEmployeeType.findUnique({ where: { id: dto.employeeTypeId } });
    if (!type || !type.active) throw new NotFoundException(pick(MSG.roleUnavailable(), lang));
    if (company.employees.length >= MAX_EMPLOYEES) throw new BadRequestException(pick(MSG.maxEmployees(MAX_EMPLOYEES), lang));
    const bonus = Math.round(type.salary * HIRE_BONUS_FACTOR);
    const stats = (type.baseStats ?? {}) as Record<string, number>;
    // Género, nombre y skin (NPC EMPLOYEE del admin de ese género; si no
    // hay, el mayordomo) de la persona contratada.
    const gender = rollGender();
    const name = employeeName(gender);
    const tempEmployee = { id: `${company.id}:${Date.now()}`, name, avatar: null, metadata: { gender } };
    const skin = resolveSkin(tempEmployee, await this.skinNpcs());

    await this.prisma.$transaction(async (tx) => {
      await this.spend(tx, company.id, bonus, lang);
      const employee = await tx.codeStudioEmployee.create({
        data: {
          companyId: company.id,
          employeeTypeId: type.id,
          name,
          avatar: skin?.key ?? `avatar-${type.slug}`,
          age: 20 + Math.floor(Math.random() * 22),
          salary: type.salary,
          productivity: Number(stats.productivity ?? 1),
          creativity: Number(stats.creativity ?? 1),
          speed: Number(stats.speed ?? 1),
          quality: Number(stats.quality ?? 1),
          metadata: { trait: rollTrait(), gender, stats: { featuresShipped: 0, bugsFixed: 0, bugsCaused: 0 } },
        },
      });
      await this.log(tx, company.id, MSG.hiredTitle(employee.name, this.roleName(type.slug, type.name, lang)), MSG.hiredText(bonus, type.salary), 'team', 'neutral', lang);
      await this.rewards.grantMilestone(tx, userId, 'first-hire', company.id, lang);
      const teamSize = company.employees.length + 1;
      if (teamSize >= 5) await this.rewards.grantMilestone(tx, userId, 'team-5', company.id, lang);
      if (teamSize >= 15) await this.rewards.grantMilestone(tx, userId, 'team-15', company.id, lang);
      await this.rewards.bumpDaily(tx, userId, { hires: 1 }, company.id, lang);
    });
    return this.getCompany(userId, companyId, lang);
  }

  // Despedir cuesta medio sueldo de indemnización — aunque no tengas caja
  // (puede dejarte en rojo): a veces es la única forma de sobrevivir.
  async fireEmployee(userId: string, companyId: string, employeeId: string, lang: Lang = 'es') {
    const company = await this.requireAlive(userId, companyId, lang);
    const employee = company.employees.find((entry) => entry.id === employeeId);
    if (!employee) throw new NotFoundException(pick(MSG.employeeNotFound(), lang));
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
      await this.log(tx, company.id, MSG.firedTitle(employee.name), MSG.firedText(severance, employee.salary), 'team', 'neutral', lang);
      await this.rewards.grantMilestone(tx, userId, 'tough-call', company.id, lang);
    });
    return this.getCompany(userId, companyId, lang);
  }

  async installInfrastructure(userId: string, companyId: string, dto: InstallInfrastructureDto, lang: Lang = 'es') {
    const company = await this.requireAlive(userId, companyId, lang);
    const type = await this.prisma.codeStudioInfrastructureType.findUnique({ where: { id: dto.infrastructureTypeId } });
    if (!type || !type.active) throw new NotFoundException(pick(MSG.hostingUnavailable(), lang));
    const scaling = (type.scaling ?? {}) as Record<string, number>;
    if (Number(scaling.minStage ?? 0) > company.stage) {
      throw new BadRequestException(pick(MSG.unlocksAtStage(stageText(Number(scaling.minStage), lang).name), lang));
    }
    const existing = company.infrastructure.find((item) => item.infrastructureTypeId === type.id);
    const nextLevel = (existing?.level ?? 0) + 1;
    if (nextLevel > Number(scaling.maxLevel ?? 5)) throw new BadRequestException(pick(MSG.maxLevel(), lang));
    const cost = type.baseCost * nextLevel;
    const typeName = contentFor(lang)?.hosting[type.slug]?.name ?? type.name;

    await this.prisma.$transaction(async (tx) => {
      await this.spend(tx, company.id, cost, lang);
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
        existing ? MSG.hostingUpgraded(typeName, nextLevel) : MSG.hostingInstalled(typeName),
        MSG.hostingText(Number(scaling.capacity ?? 0), Number(scaling.monthly ?? 0)),
        'infra',
        'neutral',
        lang,
      );
      if (!existing) await this.rewards.grantMilestone(tx, userId, 'first-server', company.id, lang);
    });
    return this.getCompany(userId, companyId, lang);
  }

  async launchCampaign(userId: string, companyId: string, dto: LaunchCampaignDto, lang: Lang = 'es') {
    const company = await this.requireAlive(userId, companyId, lang);
    const campaign = await this.prisma.codeStudioCampaign.findUnique({ where: { id: dto.campaignId } });
    if (!campaign || !campaign.active) throw new NotFoundException(pick(MSG.campaignUnavailable(), lang));
    const multiplier = dto.multiplier ?? 1;
    if (!(CAMPAIGN_BUDGET_MULTIPLIERS as readonly number[]).includes(multiplier)) throw new BadRequestException(pick(MSG.invalidBudget(), lang));
    const minStage = Number((campaign.config as { minStage?: number } | null)?.minStage ?? 1);
    if (minStage > company.stage) throw new BadRequestException(pick(MSG.unlocksAtStage(stageText(minStage, lang).name), lang));
    if (company.infrastructure.length === 0 || company.modules.length === 0) throw new BadRequestException(pick(MSG.appOffline(), lang));

    const quote = await this.quoteCampaign(company, campaign.slug, multiplier);
    if (!quote) throw new BadRequestException(pick(MSG.quoteFailed(), lang));

    await this.prisma.$transaction(async (tx) => {
      await this.spend(tx, company.id, quote.cost, lang);
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
          ? MSG.campaignLosing(quote.cost, quote.cac, metrics.ltv)
          : metrics.ltv > 0
            ? MSG.campaignWinning(quote.cost, quote.cac, metrics.ltv)
            : MSG.campaignNoRevenue(quote.cost);
      await this.log(tx, company.id, MSG.campaignTitle(campaign.name, quote.users), verdict, 'marketing', 'neutral', lang);
      await this.rewards.grantMilestone(tx, userId, 'first-campaign', company.id, lang);
      if (quote.users >= 500) await this.rewards.grantMilestone(tx, userId, 'viral-campaign', company.id, lang);
      await this.rewards.bumpDaily(tx, userId, { campaigns: 1, newUsers: quote.users }, company.id, lang);
    });
    return this.getCompany(userId, companyId, lang);
  }

  async fixBug(userId: string, companyId: string, bugId: string, dto: FixBugDto, lang: Lang = 'es') {
    const company = await this.requireAlive(userId, companyId, lang);
    const bug = company.bugReports.find((entry) => entry.id === bugId);
    if (!bug) throw new NotFoundException(pick(MSG.bugNotFound(), lang));
    if (bug.assignedEmployeeId) throw new BadRequestException(pick(MSG.bugTaken(), lang));
    const base = bug.scenarioKey ? BUG_SCENARIO_BY_KEY.get(bug.scenarioKey) : undefined;
    const scenario = base ? localizeScenario(base, lang) : undefined;
    const weight = BUG_SEVERITY_WEIGHT[bug.severity];

    if (dto.method === 'diagnose') {
      if (!scenario) throw new BadRequestException(pick(MSG.bugLegacy(), lang));
      const option = scenario.options.find((entry) => entry.key === dto.optionKey);
      if (!option) throw new BadRequestException(pick(MSG.pickOption(), lang));

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
        return { result: { correct: false, feedback: option.feedback, cost }, company: await this.getCompany(userId, companyId, lang) };
      }

      const cost = Math.round(bug.fixCost * DIAGNOSE_COST_FACTOR);
      const firstTry = bug.attempts === 0;
      const rawXp = weight * 12 * (firstTry ? 2 : 1);
      let xp = 0;
      await this.prisma.$transaction(async (tx) => {
        await this.spend(tx, company.id, cost, lang, MSG.diagnoseNeedsCash(cost));
        await tx.codeStudioBug.update({ where: { id: bug.id }, data: { status: CodeStudioBugStatus.FIXED, fixedAt: new Date(), resolution: 'diagnose' } });
        await tx.codeStudioCompany.update({ where: { id: company.id }, data: { reputation: clamp(company.reputation + 1, 0, 100) } });
        xp = (await this.rewards.addXp(tx, userId, rawXp, company.id, { bugsDiagnosed: 1, ...(firstTry ? { bugsFirstTry: 1 } : {}) }, lang)).xp;
        await this.log(tx, company.id, MSG.bugFixedTitle(scenario.title), MSG.bugFixedText(scenario.lesson, scenario.preventHint ?? '', xp), 'bug-fixed', 'good', lang);
        await this.rewards.grantMilestone(tx, userId, 'first-bug-diagnosed', company.id, lang);
        const profile = await tx.codeStudioProfile.findUnique({ where: { userId }, select: { bugsFirstTry: true, bugsDiagnosed: true } });
        if ((profile?.bugsFirstTry ?? 0) >= 10) await this.rewards.grantMilestone(tx, userId, 'bug-hunter', company.id, lang);
        if ((profile?.bugsDiagnosed ?? 0) >= 25) await this.rewards.grantMilestone(tx, userId, 'bug-veteran', company.id, lang);
        await this.rewards.bumpDaily(tx, userId, { bugs: 1 }, company.id, lang);
      });
      return {
        result: { correct: true, feedback: option.feedback, lesson: scenario.lesson, preventHint: scenario.preventHint ?? null, xp, cost, firstTry },
        company: await this.getCompany(userId, companyId, lang),
      };
    }

    if (dto.method === 'employee') {
      const employee = company.employees.find((entry) => entry.id === dto.employeeId);
      if (!employee) throw new NotFoundException(pick(MSG.employeeNotFound(), lang));
      if (!BUG_CAPABLE_ROLES.has(employee.employeeType.slug)) {
        throw new BadRequestException(pick(MSG.notTechnical(this.roleName(employee.employeeType.slug, employee.employeeType.name, lang)), lang));
      }
      if (company.bugReports.some((entry) => entry.assignedEmployeeId === employee.id)) throw new BadRequestException(pick(MSG.employeeBusy(employee.name), lang));
      const seconds = this.employeeFixSeconds(employee, weight);
      await this.prisma.codeStudioBug.update({
        where: { id: bug.id },
        data: { assignedEmployeeId: employee.id, fixReadyAt: new Date(Date.now() + seconds * 1000) },
      });
      return { result: { assigned: true, seconds }, company: await this.getCompany(userId, companyId, lang) };
    }

    // Consultora: rápido y caro, pero no aprendes nada (sin XP).
    await this.prisma.$transaction(async (tx) => {
      await this.spend(tx, company.id, bug.fixCost, lang);
      await tx.codeStudioBug.update({ where: { id: bug.id }, data: { status: CodeStudioBugStatus.FIXED, fixedAt: new Date(), resolution: 'cash' } });
      await this.log(tx, company.id, MSG.consultantTitle(scenario?.title ?? bug.title), MSG.consultantText(bug.fixCost, scenario?.lesson ?? ''), 'bug-fixed', 'neutral', lang);
    });
    return { result: { paid: bug.fixCost }, company: await this.getCompany(userId, companyId, lang) };
  }

  async chooseDecision(userId: string, companyId: string, eventId: string, dto: ChooseDecisionDto, lang: Lang = 'es') {
    const company = await this.requireAlive(userId, companyId, lang);
    const event = await this.prisma.codeStudioEventLog.findUnique({ where: { id: eventId } });
    const effects = (event?.effects ?? {}) as Record<string, any>;
    if (!event || event.companyId !== company.id || effects.kind !== 'decision') throw new NotFoundException(pick(MSG.decisionNotFound(), lang));
    if (effects.status !== 'pending') throw new BadRequestException(pick(MSG.decisionTaken(), lang));
    const definition = DECISION_BY_KEY.get(effects.key);
    if (!definition) throw new BadRequestException(pick(MSG.decisionUnknown(), lang));
    if (!(effects.choices ?? []).some((choice: { key: string }) => choice.key === dto.choice)) throw new BadRequestException(pick(MSG.invalidChoice(), lang));

    const ctx = this.eventContext(company, lang);
    const blocked = definition.canChoose?.(ctx, effects.params ?? {}, dto.choice);
    if (blocked) throw new BadRequestException(pick(blocked, lang));
    const outcome = definition.resolve(ctx, effects.params ?? {}, dto.choice, Math.random);

    await this.prisma.$transaction(async (tx) => {
      // Guard: si dos clicks llegan juntos, solo el primero resuelve.
      const claimed = await tx.codeStudioEventLog.updateMany({
        where: { id: event.id, effects: { path: ['status'], equals: 'pending' } },
        data: { effects: { ...effects, status: 'resolved', choice: dto.choice, outcome: pick(outcome.message, lang) } },
      });
      if (claimed.count === 0) throw new BadRequestException(pick(MSG.decisionTaken(), lang));
      await this.applyOutcome(tx, company, outcome, lang);
      await this.rewards.addXp(tx, userId, 10, company.id, {}, lang);
      await this.rewards.bumpDaily(tx, userId, { decisions: 1, newUsers: Math.max(0, outcome.users ?? 0) }, company.id, lang);
    });
    return this.getCompany(userId, companyId, lang);
  }

  async raiseFunding(userId: string, companyId: string, lang: Lang = 'es') {
    const company = await this.requireAlive(userId, companyId, lang);
    const offer = fundingOffer(company.fundingRound, company.valuation);
    if (!offer) throw new BadRequestException(pick(MSG.noMoreRounds(), lang));
    if (company.stage < offer.minStage) throw new BadRequestException(pick(MSG.investorsWantStage(offer.name, stageText(offer.minStage, lang).name), lang));
    if (company.rating < FUNDING_MIN_RATING) throw new BadRequestException(pick(MSG.investorsWantRating(company.rating.toFixed(1), FUNDING_MIN_RATING), lang));
    const newEquity = company.founderEquity * (1 - offer.equity / 100);
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.codeStudioCompany.updateMany({
        where: { id: company.id, fundingRound: company.fundingRound },
        data: { cash: { increment: offer.raise }, fundingRound: { increment: 1 }, founderEquity: newEquity },
      });
      if (updated.count === 0) throw new BadRequestException(pick(MSG.roundClosed(), lang));
      await this.log(tx, company.id, MSG.roundTitle(offer.name, offer.raise), MSG.roundText(offer.equity, newEquity.toFixed(1)), 'finance', 'good', lang);
      await this.rewards.grantMilestone(tx, userId, 'first-funding', company.id, lang);
    });
    return this.getCompany(userId, companyId, lang);
  }

  async setPricing(userId: string, companyId: string, dto: SetPricingDto, lang: Lang = 'es') {
    const company = await this.requireAlive(userId, companyId, lang);
    const level = PRICE_LEVELS.find((entry) => entry.value === dto.level);
    if (!level) throw new BadRequestException(pick(MSG.invalidPrice(), lang));
    await this.prisma.$transaction(async (tx) => {
      await tx.codeStudioCompany.update({ where: { id: company.id }, data: { priceLevel: level.value } });
      await this.log(
        tx,
        company.id,
        MSG.priceTitle(pick(level.label, lang)),
        level.value > 1 ? MSG.priceUp() : level.value < 1 ? MSG.priceDown() : MSG.priceNormal(),
        'finance',
        'neutral',
        lang,
      );
    });
    return this.getCompany(userId, companyId, lang);
  }

  // ─── Simulación ─────────────────────────────────────────────────────────

  private async simulateCompany(userId: string, companyId: string, lang: Lang) {
    const company = await this.requireOwned(userId, companyId, lang);
    if (company.status === CodeStudioCompanyStatus.FAILED) return;
    if (company.simVersion < 2) {
      await this.convertLegacyCompany(company, lang);
      return;
    }
    const elapsed = (Date.now() - company.lastSimulatedAt.getTime()) / 1000;
    if (elapsed < MIN_SIM_SECONDS) return;

    try {
      await this.prisma.$transaction(async (tx) => this.runSimulation(tx, userId, company, Math.min(elapsed, MAX_ELAPSED_SECONDS), lang), {
        timeout: 15_000,
      });
    } catch (error) {
      if (error instanceof SimulationRaceError) return;
      throw error;
    }
  }

  private async runSimulation(tx: Tx, userId: string, company: LoadedCompany, elapsed: number, lang: Lang) {
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
      if (employee) await this.bumpEmployee(tx, employee, { bugsFixed: 1 });
      const base = bug.scenarioKey ? BUG_SCENARIO_BY_KEY.get(bug.scenarioKey) : undefined;
      const scenario = base ? localizeScenario(base, lang) : undefined;
      await this.log(
        tx,
        company.id,
        MSG.employeeFixedTitle(employee?.name ?? pick(MSG.yourTeam(), lang), scenario?.title ?? bug.title),
        MSG.employeeFixedText(scenario?.lesson ?? ''),
        'bug-fixed',
        'good',
        lang,
      );
      await this.rewards.addXp(tx, userId, BUG_SEVERITY_WEIGHT[bug.severity] * 3, company.id, {}, lang);
    }
    const openBugs = company.bugReports.filter((entry) => !(entry.fixReadyAt && entry.fixReadyAt <= now));
    await this.autoAssignBugs(tx, company, openBugs, now, lang);

    await this.officeCountsFor(company);
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
    let released = 0;
    const openKeys = new Set(openBugs.map((bug) => bug.scenarioKey).filter(Boolean) as string[]);
    const spawn = async (trigger: BugTrigger, releasedSlug?: string) => {
      if (openCount >= MAX_OPEN_BUGS) return;
      const scenario = pickScenario(trigger, { installed, openKeys }, Math.random, releasedSlug);
      if (!scenario) return;
      await this.createBug(tx, company.id, scenario, company.stage, lang);
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
      released++;
      await tx.codeStudioCompanyModule.upsert({
        where: { companyId_moduleId: { companyId: company.id, moduleId: task.moduleId } },
        update: {},
        create: { companyId: company.id, moduleId: task.moduleId },
      });
      installed.add(task.module.slug);
      const lesson = contentFor(lang)?.features[task.module.slug]?.lesson ?? (task.module.metadata as { lesson?: string } | null)?.lesson ?? '';
      const xp = (await this.rewards.addXp(tx, userId, task.module.difficulty ** 2 * 4, company.id, {}, lang)).xp;
      await this.log(tx, company.id, MSG.releaseTitle(this.featureName(task.module.slug, lang, task.module.name)), MSG.releaseText(lesson, xp), 'release', 'good', lang);
      await this.rewards.grantMilestone(tx, userId, 'first-feature', company.id, lang);
      const builders = this.builders(company, openBugs);
      for (const builder of builders) await this.bumpEmployee(tx, builder, { featuresShipped: 1 });
      if (Math.random() < Math.min(0.75, releaseBugChance(update.difficulty, metrics.quality, profile.bugSeverityFactor) * this.teamBugRisk(builders))) {
        const before = openCount;
        await spawn('release', task.module.slug);
        const culprit = before < openCount ? this.pickCulprit(builders) : null;
        if (culprit) await this.bumpEmployee(tx, culprit, { bugsCaused: 1 });
      }
      const branch = FEATURES.find((feature) => feature.slug === task.module.slug)?.branch;
      if (branch && FEATURES.filter((feature) => feature.branch === branch).every((feature) => installed.has(feature.slug))) {
        await this.rewards.grantMilestone(tx, userId, 'full-branch', company.id, lang);
      }
    }

    if (released > 0) {
      const builtV2 = FEATURES.filter((feature) => installed.has(feature.slug)).length;
      if (builtV2 >= 20) await this.rewards.grantMilestone(tx, userId, 'half-tree', company.id, lang);
      if (builtV2 >= FEATURES.length) await this.rewards.grantMilestone(tx, userId, 'full-tree', company.id, lang);
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
    const ctx = this.eventContext(company, lang, metrics, installed);
    if (pending) {
      const effects = pending.effects as Record<string, any>;
      if (gameDays >= Number(effects.expiresAtDay ?? 0)) {
        const definition = DECISION_BY_KEY.get(effects.key);
        if (definition) {
          const outcome = definition.resolve(ctx, effects.params ?? {}, definition.defaultChoice, Math.random);
          await tx.codeStudioEventLog.update({
            where: { id: pending.id },
            data: { effects: { ...effects, status: 'expired', choice: definition.defaultChoice, outcome: pick(outcome.message, lang) } },
          });
          this.foldOutcome(next, outcome);
          await this.applySideEffects(tx, company, outcome, lang);
          await this.log(tx, company.id, MSG.decisionExpired(pick(definition.name, lang)), outcome.message, 'market', outcome.tone, lang);
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
            title: pick(decision.name, lang),
            description: pick(built.description, lang),
            effects: {
              kind: 'decision',
              tone: 'neutral',
              status: 'pending',
              key: decision.key,
              params: built.params,
              choices: built.choices.map((choice) => ({ key: choice.key, label: pick(choice.label, lang), hint: pick(choice.hint, lang) })),
              expiresAtDay: gameDays + DECISION_TTL_DAYS,
            },
          },
        });
      } else {
        const passive = pickWeighted(PASSIVE_EVENTS.filter((event) => event.eligible(ctx)), Math.random);
        if (passive) {
          const outcome = passive.resolve(ctx, Math.random);
          this.foldOutcome(next, outcome);
          await this.applySideEffects(tx, company, outcome, lang);
          await this.log(tx, company.id, passive.name, outcome.message, 'market', outcome.tone, lang);
        }
      }
    }

    // Caja, deuda y quiebra.
    const finalCash = company.cash + next.cash;
    const debtDays = finalCash < 0 ? company.debtDays + days : 0;
    if (company.debtDays === 0 && debtDays > 0) {
      await this.log(tx, company.id, MSG.debtTitle(), MSG.debtText(BANKRUPTCY_DEBT_DAYS), 'finance', 'bad', lang);
    }
    if (company.debtDays > 1 && debtDays === 0) await this.rewards.grantMilestone(tx, userId, 'survived-debt', company.id, lang);
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
      const text = stageText(reached, lang);
      next.cash += stage.reward.cash;
      await this.log(
        tx,
        company.id,
        MSG.stageTitle(text.name),
        `${text.tagline}${stage.reward.cash > 0 ? pick(MSG.stageReward(stage.reward.cash), lang) : ''}`,
        'stage',
        'good',
        lang,
      );
      await this.rewards.grantRepeatable(tx, userId, `stage-${reached}`, company.id, lang);
      if (reached === 4 && company.fundingRound === 0) await this.rewards.grantMilestone(tx, userId, 'bootstrapped', company.id, lang);
      if (reached === 3) {
        const profile = await tx.codeStudioProfile.findUnique({ where: { userId }, select: { bankruptcies: true } });
        if ((profile?.bankruptcies ?? 0) >= 1) await this.rewards.grantMilestone(tx, userId, 'second-chance', company.id, lang);
      }
    }
    if (metrics.dailyRevenue > 0) await this.grantOnce(tx, userId, 'first-revenue', company.id, stats, lang);
    if (metrics.dailyProfit > 0 && company.employees.length >= 2) await this.grantOnce(tx, userId, 'first-profitable-day', company.id, stats, lang);
    const usersNow = company.activeUsers + next.users;
    if (usersNow >= 1000) await this.grantOnce(tx, userId, 'users-1k', company.id, stats, lang);
    if (usersNow >= 100_000) await this.grantOnce(tx, userId, 'users-100k', company.id, stats, lang);
    if (company.cash + next.cash >= 1_000_000) await this.grantOnce(tx, userId, 'millionaire', company.id, stats, lang);
    if (usersNow >= 1000 && result.state.rating >= 4.8) await this.grantOnce(tx, userId, 'five-stars', company.id, stats, lang);
    if (FEATURES.filter((feature) => installed.has(feature.slug)).length >= 20 && next.techDebt < 0.5 && openCount === 0) {
      await this.grantOnce(tx, userId, 'clean-code', company.id, stats, lang);
    }
    await this.rewards.bumpDaily(
      tx,
      userId,
      {
        features: released,
        newUsers: Math.max(0, next.newUsers),
        revenue: result.deltas.revenue,
        days,
        stages: newStage - company.stage,
      },
      company.id,
      lang,
    );

    const activeUsers = Math.max(0, company.activeUsers + next.users);
    const status = failed
      ? CodeStudioCompanyStatus.FAILED
      : metrics.launched && activeUsers > 0
        ? CodeStudioCompanyStatus.LIVE
        : company.modules.length > 0 || company.development.length > 0
          ? CodeStudioCompanyStatus.BUILDING
          : CodeStudioCompanyStatus.IDEA;
    const postMortem = failed ? this.postMortem(company, metrics, lang) : null;

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
        ...(failed ? { failedAt: now, failureReason: postMortem } : {}),
      },
    });

    if (failed) {
      await tx.codeStudioEventLog.create({
        data: { companyId: company.id, title: pick(MSG.failedTitle(), lang), description: postMortem, effects: { kind: 'failure', tone: 'bad' } },
      });
      await this.rewards.addXp(tx, userId, 0, company.id, { bankruptcies: 1 }, lang);
      await this.rewards.grantMilestone(tx, userId, 'first-bankruptcy', company.id, lang);
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
  private async convertLegacyCompany(company: LoadedCompany, lang: Lang) {
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
      await this.log(tx, company.id, MSG.legacyTitle(), MSG.legacyText(), 'info', 'neutral', lang);
    });
  }

  // ─── Vista para el cliente ──────────────────────────────────────────────

  private async buildView(userId: string, companyId: string, lang: Lang) {
    const company = await this.requireOwned(userId, companyId, lang);
    const [events, snapshots, catalog, profile, campaignSummary] = await Promise.all([
      this.prisma.codeStudioEventLog.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' }, take: 30 }),
      this.prisma.codeStudioAnalyticsSnapshot.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' }, take: 40 }),
      this.catalogService.catalog(lang),
      this.rewards.getProfile(userId, lang),
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
    const t = contentFor(lang);

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
    const stageIndex = Math.min(company.stage, MAX_STAGE);
    const stage = STAGES[stageIndex];
    const stageLabels = stageText(stageIndex, lang);
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

    const quotesByChannel = await this.campaignQuotes(company, lang);
    const offer = fundingOffer(company.fundingRound, company.valuation);
    const pending = events.find((event) => (event.effects as Record<string, any> | null)?.status === 'pending');
    const pendingEffects = (pending?.effects ?? {}) as Record<string, any>;
    const busyEmployeeIds = new Set(company.bugReports.map((bug) => bug.assignedEmployeeId).filter(Boolean) as string[]);
    const skinNpcs = await this.skinNpcs();
    await this.officeCountsFor(company);

    return {
      id: company.id,
      name: company.name,
      status: company.status,
      appType: {
        id: company.appType.id,
        slug: company.appType.slug,
        name: t?.appTypes[company.appType.slug]?.name ?? company.appType.name,
        color: company.appType.color,
        icon: company.appType.icon,
        description: t?.appTypes[company.appType.slug]?.description ?? company.appType.description,
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
        name: stageLabels.name,
        tagline: stageLabels.tagline,
        goals:
          company.stage < MAX_STAGE
            ? stageProgress(company.stage, stageMetrics).map((goal, position) => ({ ...goal, label: stageLabels.goals[position] ?? goal.label }))
            : [],
        next: nextStage ? { name: stageText(nextStage.index, lang).name, reward: nextStage.reward } : null,
      },
      tree,
      legacyFeatures: company.modules
        .filter((entry) => !(entry.module.metadata as { v2?: boolean } | null)?.v2)
        .map((entry) => ({ name: entry.module.name, category: entry.module.category })),
      development: company.development.map((task, index) => ({
        id: task.id,
        slug: task.module.slug,
        name: this.featureName(task.module.slug, lang, task.module.name),
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
        roleName: this.roleName(employee.employeeType.slug, employee.employeeType.name, lang),
        salary: employee.salary,
        severance: Math.round(employee.salary * SEVERANCE_FACTOR),
        canFixBugs: BUG_CAPABLE_ROLES.has(employee.employeeType.slug),
        busy: busyEmployeeIds.has(employee.id),
        trait: (() => {
          const trait = traitOf(employee);
          return { key: trait.key, tone: trait.tone, name: pick(trait.name, lang), description: pick(trait.description, lang) };
        })(),
        stats: statsOf(employee),
        performance: performanceOf(employee),
        daysInTeam: Math.max(0, Math.floor((Date.now() - employee.hiredAt.getTime()) / 60_000)),
        gender: genderOf(employee),
        age: employee.age,
        card: cardStats(employee),
        skin: (() => {
          const npc = resolveSkin(employee, skinNpcs);
          return npc ? { key: npc.key, spriteSheetUrl: npc.spriteSheetUrl, frameWidth: npc.frameWidth, frameHeight: npc.frameHeight } : null;
        })(),
      })),
      hosting: company.infrastructure.map((item) => {
        const scaling = (item.infrastructureType.scaling ?? {}) as Record<string, number>;
        return {
          typeId: item.infrastructureTypeId,
          slug: item.infrastructureType.slug,
          name: t?.hosting[item.infrastructureType.slug]?.name ?? item.infrastructureType.name,
          level: item.level,
          maxLevel: Number(scaling.maxLevel ?? 5),
          capacity: Number(scaling.capacity ?? 0) * item.level,
          monthly: Number(scaling.monthly ?? 0) * item.level,
          upgradeCost: item.infrastructureType.baseCost * (item.level + 1),
          legacy: !item.infrastructureType.active,
        };
      }),
      bugs: company.bugReports.map((bug) => this.publicBug(bug, now, lang)),
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
            ...(effects.kind === 'milestone' ? { xp: Number(effects.xp ?? 0), coins: Number(effects.coins ?? 0) } : {}),
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
            minStageName: stageText(offer.minStage, lang).name,
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
  private publicBug(bug: LoadedCompany['bugReports'][number], now: number, lang: Lang) {
    const base = bug.scenarioKey ? BUG_SCENARIO_BY_KEY.get(bug.scenarioKey) : undefined;
    const scenario = base ? localizeScenario(base, lang) : undefined;
    return {
      id: bug.id,
      title: scenario?.title ?? bug.title,
      severity: bug.severity,
      symptom: scenario?.symptom ?? bug.description,
      evidence: scenario?.evidence ?? [],
      options: scenario?.options.map((option) => ({ key: option.key, label: option.label })) ?? [],
      attempts: bug.attempts,
      consultantCost: bug.fixCost,
      diagnoseCost: Math.round(bug.fixCost * DIAGNOSE_COST_FACTOR),
      wrongCost: Math.round(bug.fixCost * WRONG_DIAGNOSIS_COST_FACTOR),
      xpReward: Math.round(BUG_SEVERITY_WEIGHT[bug.severity] * 12 * (bug.attempts === 0 ? 2 : 1) * GAME_XP_FACTOR),
      assignedEmployeeId: bug.assignedEmployeeId,
      fixSecondsLeft: bug.fixReadyAt ? Math.max(0, Math.ceil((bug.fixReadyAt.getTime() - now) / 1000)) : null,
      employeeFixSeconds: BUG_SEVERITY_WEIGHT[bug.severity] * EMPLOYEE_FIX_SECONDS_PER_WEIGHT,
      createdAt: bug.createdAt,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private featureName(slug: string, lang: Lang, fallback?: string) {
    return contentFor(lang)?.features[slug]?.name ?? FEATURES.find((feature) => feature.slug === slug)?.name ?? fallback ?? slug;
  }

  // ─── Oficina ──────────────────────────────────────────────────────────

  private officeCache = new Map<string, { at: number; counts: OfficeCounts | null }>();

  /** Cuenta los muebles de oficina de la sala de la empresa (cache 20 s). */
  private async officeCountsFor(company: { id: string; officeRoomId: string | null }): Promise<OfficeCounts | null> {
    if (!company.officeRoomId) {
      this.officeCache.set(company.id, { at: Date.now(), counts: null });
      return null;
    }
    const cached = this.officeCache.get(company.id);
    if (cached && Date.now() - cached.at < 20_000) return cached.counts;
    const items = await this.prisma.roomItem.findMany({
      where: { roomId: company.officeRoomId },
      select: { item: { select: { tags: true } } },
    });
    const room = await this.prisma.room.findUnique({ where: { id: company.officeRoomId }, select: { id: true } });
    const counts = room ? countOffice(items.map((entry) => entry.item.tags ?? [])) : null;
    await this.officeFurnitureExists();
    this.officeCache.set(company.id, { at: Date.now(), counts });
    return counts;
  }

  // El castigo por no tener puesto solo corre si existen muebles de oficina
  // (escritorio, silla y PC marcados en /admin/items): si no, no habría
  // forma de evitarlo. Las comodidades suman igual.
  private furnitureCache: { at: number; exists: boolean } | null = null;

  private async officeFurnitureExists() {
    if (this.furnitureCache && Date.now() - this.furnitureCache.at < 300_000) return this.furnitureCache.exists;
    const [desk, chair, pc] = await Promise.all(
      [OFFICE_TAGS.desk, OFFICE_TAGS.chair, OFFICE_TAGS.pc].map((tag) => this.prisma.item.count({ where: { tags: { has: tag } } })),
    );
    const exists = desk > 0 && chair > 0 && pc > 0;
    this.furnitureCache = { at: Date.now(), exists };
    return exists;
  }

  private officeSummaryOf(company: LoadedCompany) {
    const summary = officeSummary(this.officeCache.get(company.id)?.counts ?? null, company.employees.length);
    if (summary.hasOffice && !this.furnitureCache?.exists) return { ...summary, stations: company.employees.length, seated: company.employees.length, unseated: 0 };
    return summary;
  }

  /** Factor por empleado: los de mejor rendimiento tienen puesto primero. */
  private officeFactorsOf(company: LoadedCompany) {
    const order = [...company.employees].sort((a, b) => performanceOf(b) - performanceOf(a)).map((employee) => employee.id);
    return officeFactors(this.officeSummaryOf(company), order);
  }

  private async officeLayouts() {
    const layouts = await this.prisma.roomLayout.findMany({
      where: { isPublic: true },
      select: { id: true, name: true, previewImageUrl: true, width: true, height: true },
    });
    const smallest = Math.min(...layouts.map((layout) => layout.width * layout.height));
    return layouts
      .map((layout) => ({ ...layout, price: officePrice(layout.width * layout.height, smallest) }))
      .sort((a, b) => a.width * a.height - b.width * b.height);
  }

  /** Estado de la oficina: sala, mapas disponibles, puestos y comodidades. */
  async getOffice(userId: string, companyId: string, lang: Lang = 'es') {
    const company = await this.requireOwned(userId, companyId, lang);
    const counts = await this.officeCountsFor(company);
    const summary = this.officeSummaryOf(company);
    const room = company.officeRoomId
      ? await this.prisma.room.findUnique({ where: { id: company.officeRoomId }, select: { id: true, name: true } })
      : null;
    const kitItems = await this.basicKitItems();
    const stats = (company.stats ?? {}) as Record<string, any>;
    return {
      room,
      layouts: room ? [] : await this.officeLayouts(),
      counts,
      summary,
      tags: OFFICE_TAGS,
      // Hay escritorio, silla y PC en el catálogo: armar puestos es posible (y obligatorio).
      furnitureAvailable: await this.officeFurnitureExists(),
      kit: {
        available: kitItems.length > 0,
        claimed: Number(stats.officeKits ?? 0),
        // Uno por empleado y uno para el fundador (su PC abre CodeStudio).
        pending: Math.max(0, company.employees.length + 1 - Number(stats.officeKits ?? 0)),
      },
    };
  }

  /** Crea la oficina: el mapa más chico es gratis; los grandes cuestan monedas del juego. */
  async createOffice(userId: string, companyId: string, layoutId: string, lang: Lang = 'es') {
    const company = await this.requireOwned(userId, companyId, lang);
    if (company.officeRoomId && (await this.prisma.room.findUnique({ where: { id: company.officeRoomId }, select: { id: true } }))) {
      throw new BadRequestException(pick(L('Tu empresa ya tiene oficina.', 'Your company already has an office.', 'Deine Firma hat schon ein Büro.'), lang));
    }
    const layout = (await this.officeLayouts()).find((entry) => entry.id === layoutId);
    if (!layout) throw new NotFoundException(pick(L('Ese mapa no está disponible.', 'That map is not available.', 'Diese Karte ist nicht verfügbar.'), lang));
    const room = await this.prisma.$transaction(async (tx) => {
      if (layout.price > 0) {
        const paid = await tx.user.updateMany({ where: { id: userId, coins: { gte: layout.price } }, data: { coins: { decrement: layout.price } } });
        if (paid.count === 0) throw new BadRequestException(pick(L(`Necesitas ${layout.price} monedas.`, `You need ${layout.price} coins.`, `Du brauchst ${layout.price} Münzen.`), lang));
        await tx.coinTransaction.create({ data: { userId, amount: -layout.price, reason: `codestudio:office:${company.id}` } });
      }
      const created = await tx.room.create({
        data: {
          ownerId: userId,
          name: `${company.name} HQ`.slice(0, 60),
          description: pick(L('Oficina de CodeStudio', 'CodeStudio office', 'CodeStudio-Büro'), lang),
          isPublic: true,
          maxUsers: 20,
          width: layout.width,
          height: layout.height,
          layoutId: layout.id,
          tags: ['codestudio:office'],
        },
      });
      await tx.codeStudioCompany.update({ where: { id: company.id }, data: { officeRoomId: created.id } });
      return created;
    });
    this.officeCache.delete(company.id);
    return { room: { id: room.id, name: room.name } };
  }

  private basicKitItems() {
    return this.prisma.item.findMany({
      where: { tags: { has: OFFICE_TAGS.basic } },
      select: { id: true, tags: true },
    });
  }

  /** Kit básico gratis (escritorio + silla + PC) por cada empleado sin kit. */
  async claimOfficeKit(userId: string, companyId: string, lang: Lang = 'es') {
    const company = await this.requireOwned(userId, companyId, lang);
    const items = await this.basicKitItems();
    if (items.length === 0) throw new BadRequestException(pick(L('Todavía no hay kit básico.', 'There is no basic kit yet.', 'Es gibt noch kein Basis-Set.'), lang));
    const stats = (company.stats ?? {}) as Record<string, any>;
    const claimed = Number(stats.officeKits ?? 0);
    const pending = Math.max(0, company.employees.length + 1 - claimed);
    if (pending === 0) throw new BadRequestException(pick(L('Ya reclamaste un kit por cada empleado.', 'You already claimed one kit per employee.', 'Du hast schon ein Set pro Angestellten geholt.'), lang));
    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.userItem.upsert({
          where: { userId_itemId: { userId, itemId: item.id } },
          update: { amount: { increment: pending } },
          create: { userId, itemId: item.id, amount: pending, source: 'codestudio-office' },
        });
      }
      await tx.codeStudioCompany.update({ where: { id: company.id }, data: { stats: { ...stats, officeKits: claimed + pending } } });
    });
    return { granted: pending };
  }

  /**
   * Empleados que aparecen en una sala que es oficina (los ve cualquiera que
   * entre): nombre, rol, skin completa y lo que dicen según cómo va la empresa.
   */
  async officeRoomEmployees(roomId: string, lang: Lang = 'es') {
    const company = await this.prisma.codeStudioCompany.findFirst({
      where: { officeRoomId: roomId, status: { not: 'FAILED' } },
      include: {
        employees: { include: { employeeType: true } },
        bugReports: { where: { status: 'OPEN' }, select: { id: true, title: true, scenarioKey: true, assignedEmployeeId: true } },
        development: { where: { status: 'IN_PROGRESS' }, select: { id: true } },
      },
    });
    if (!company) return { company: null, employees: [] };
    // Bugs arreglados en la última media hora: quien lo arregló lo cuenta.
    const recentFixes = await this.prisma.codeStudioBug.findMany({
      where: { companyId: company.id, status: 'FIXED', fixedAt: { gte: new Date(Date.now() - 30 * 60_000) }, assignedEmployeeId: { not: null } },
      orderBy: { fixedAt: 'desc' },
      select: { title: true, scenarioKey: true, assignedEmployeeId: true },
    });
    const bugTitle = (bug: { title: string; scenarioKey: string | null }) => {
      const base = bug.scenarioKey ? BUG_SCENARIO_BY_KEY.get(bug.scenarioKey) : undefined;
      return base ? localizeScenario(base, lang).title : bug.title;
    };
    const npcs = await this.prisma.npcConfig.findMany({
      where: { enabled: true, kind: { in: ['EMPLOYEE', 'BUTLER'] } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    await this.officeCountsFor(company);
    const summary = this.officeSummaryOf(company as unknown as LoadedCompany);
    const stats = (company.stats ?? {}) as Record<string, any>;
    const runs = await this.prisma.codeStudioCampaignRun.count({ where: { companyId: company.id } });
    const lastStage = await this.prisma.codeStudioEventLog.findFirst({
      where: { companyId: company.id, effects: { path: ['kind'], equals: 'stage' }, createdAt: { gte: new Date(Date.now() - 30 * 60_000) } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    const context = {
      activeUsers: company.activeUsers,
      openBugs: company.bugReports.length,
      queued: Math.max(0, company.development.length - 1),
      maxParallel: 1,
      utilization: Number(stats.utilization ?? 0),
      campaigns: runs,
      cash: company.cash,
      dailyCosts: Number(stats.dailyCosts ?? 0),
      stageName: lastStage ? stageText(company.stage, lang).name : null,
      fundingRaised: Boolean(stats.fundingRounds),
      unseated: summary.unseated,
    };
    // Lo de la empresa (sin la queja del escritorio: esa la dice cada uno).
    const lines = officeLines({ ...context, unseated: 0 }).map((line) => pick(line, lang));
    const lineContext = { ...context, rating: company.rating, hasCoffee: summary.amenities.includes('coffee') };
    const ordered = [...company.employees].sort((a, b) => performanceOf(b) - performanceOf(a));
    return {
      company: { id: company.id, name: company.name },
      employees: ordered.map((employee, index) => {
        const skin = resolveSkin(employee, npcs);
        const full = skin ? npcs.find((npc) => npc.key === skin.key) : null;
        // Lo suyo primero (rol, ánimo, su bug); luego un par de cosas de la
        // empresa, distintas para cada uno para que no digan todos lo mismo.
        const fixed = recentFixes.find((bug) => bug.assignedEmployeeId === employee.id);
        const fixing = company.bugReports.find((bug) => bug.assignedEmployeeId === employee.id);
        const personal = employeeLines(
          {
            id: employee.id,
            roleSlug: employee.employeeType.slug,
            traitKey: traitOf(employee).key,
            motivation: employee.motivation,
            stress: employee.stress,
            minutesInTeam: (Date.now() - employee.hiredAt.getTime()) / 60_000,
            seated: !summary.hasOffice || index < summary.stations,
            bugsCaused: statsOf(employee).bugsCaused,
            fixedBug: fixed ? bugTitle(fixed) : null,
            fixingBug: fixing ? bugTitle(fixing) : null,
          },
          lineContext,
        ).map((line) => pick(line, lang));
        const shared = lines.filter((_, offset) => offset % Math.max(1, ordered.length) === index % Math.max(1, ordered.length)).slice(0, 2);
        const own = [...new Set([...personal, ...shared])];
        return {
          id: employee.id,
          name: employee.name,
          roleSlug: employee.employeeType.slug,
          roleName: this.roleName(employee.employeeType.slug, employee.employeeType.name, lang),
          seated: !summary.hasOffice || index < summary.stations,
          // Carta (se abre al hacer clic en el empleado dentro de la sala).
          trait: (() => {
            const trait = traitOf(employee);
            return { key: trait.key, tone: trait.tone, name: pick(trait.name, lang), description: pick(trait.description, lang) };
          })(),
          stats: statsOf(employee),
          performance: performanceOf(employee),
          card: cardStats(employee),
          skin: skin ? { key: skin.key, spriteSheetUrl: skin.spriteSheetUrl, frameWidth: skin.frameWidth, frameHeight: skin.frameHeight } : null,
          npc: full
            ? {
                key: full.key,
                name: employee.name,
                spriteSheetUrl: full.spriteSheetUrl,
                frameWidth: full.frameWidth,
                frameHeight: full.frameHeight,
                directions: full.directions,
                animations: full.animations,
                greetingLines: [own[0]],
                idleLines: own,
              }
            : null,
        };
      }),
    };
  }

  // ─── Equipo: rasgos, estadísticas y Product Manager ──────────────────

  // Skins de empleados (NPC EMPLOYEE + el mayordomo como respaldo). Cambian
  // poco: se cachean un minuto para no consultarlas en cada poll.
  private skinCache: { at: number; npcs: Awaited<ReturnType<CodeStudioService['loadSkinNpcs']>> } | null = null;

  private loadSkinNpcs() {
    return this.prisma.npcConfig.findMany({
      where: { enabled: true, kind: { in: ['EMPLOYEE', 'BUTLER'] } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { key: true, kind: true, gender: true, spriteSheetUrl: true, frameWidth: true, frameHeight: true },
    });
  }

  private async skinNpcs() {
    if (this.skinCache && Date.now() - this.skinCache.at < 60_000) return this.skinCache.npcs;
    const npcs = await this.loadSkinNpcs();
    this.skinCache = { at: Date.now(), npcs };
    return npcs;
  }

  /** Cada Mentor suma 5% a todo el equipo (máximo 2). */
  private mentorBoost(company: LoadedCompany) {
    const mentors = company.employees.filter((employee) => traitOf(employee).key === 'mentor').length;
    return 1 + 0.05 * Math.min(2, mentors);
  }

  /** Quienes programan features ahora (rol que construye y no está con un bug). */
  private builders(company: LoadedCompany, openBugs: LoadedCompany['bugReports']) {
    const busy = new Set(openBugs.map((bug) => bug.assignedEmployeeId).filter(Boolean) as string[]);
    return company.employees.filter((employee) => (ROLE_BY_SLUG.get(employee.employeeType.slug)?.devPower ?? 0) > 0 && !busy.has(employee.id));
  }

  /** Riesgo de bug del equipo que publica: promedio de sus rasgos (1 si no hay nadie). */
  private teamBugRisk(builders: LoadedCompany['employees']) {
    if (builders.length === 0) return 1;
    return builders.reduce((sum, employee) => sum + traitOf(employee).bugRisk, 0) / builders.length;
  }

  /** Quién metió el bug: más probable cuanto más descuidado. */
  private pickCulprit(builders: LoadedCompany['employees']) {
    if (builders.length === 0) return null;
    const total = builders.reduce((sum, employee) => sum + traitOf(employee).bugRisk, 0);
    let roll = Math.random() * total;
    for (const employee of builders) {
      roll -= traitOf(employee).bugRisk;
      if (roll <= 0) return employee;
    }
    return builders[builders.length - 1];
  }

  private employeeFixSeconds(employee: LoadedCompany['employees'][number], weight: number) {
    return Math.round((weight * EMPLOYEE_FIX_SECONDS_PER_WEIGHT) / Math.max(0.5, traitOf(employee).power));
  }

  /** Suma estadísticas al empleado (y guarda su rasgo si era de antes). */
  private async bumpEmployee(tx: Tx, employee: LoadedCompany['employees'][number], delta: Parameters<typeof bumpStats>[1]) {
    const metadata = bumpStats(employee.metadata, delta, traitOf(employee).key);
    employee.metadata = metadata as typeof employee.metadata;
    await tx.codeStudioEmployee.update({ where: { id: employee.id }, data: { metadata: metadata as Prisma.InputJsonValue } });
  }

  /**
   * Con un Product Manager en el equipo, los bugs sin dueño se asignan solos
   * a quien esté libre y pueda arreglarlos (el de mejor rendimiento primero).
   * Se espera un rato para que el jugador pueda diagnosticarlos él mismo
   * (es como se aprende y da más XP). Sin PM, se asignan a mano.
   */
  private async autoAssignBugs(tx: Tx, company: LoadedCompany, openBugs: LoadedCompany['bugReports'], now: Date, lang: Lang) {
    if (!company.employees.some((employee) => employee.employeeType.slug === 'product-manager')) return;
    const busy = new Set(openBugs.map((bug) => bug.assignedEmployeeId).filter(Boolean) as string[]);
    const free = company.employees
      .filter((employee) => BUG_CAPABLE_ROLES.has(employee.employeeType.slug) && !busy.has(employee.id))
      .sort((a, b) => performanceOf(b) - performanceOf(a));
    const waiting = openBugs
      .filter((bug) => !bug.assignedEmployeeId && now.getTime() - bug.createdAt.getTime() >= AUTO_ASSIGN_DELAY_MS)
      .sort((a, b) => BUG_SEVERITY_WEIGHT[b.severity] - BUG_SEVERITY_WEIGHT[a.severity]);
    for (const bug of waiting) {
      const employee = free.shift();
      if (!employee) break;
      const seconds = this.employeeFixSeconds(employee, BUG_SEVERITY_WEIGHT[bug.severity]);
      const fixReadyAt = new Date(now.getTime() + seconds * 1000);
      await tx.codeStudioBug.update({ where: { id: bug.id }, data: { assignedEmployeeId: employee.id, fixReadyAt } });
      bug.assignedEmployeeId = employee.id;
      bug.fixReadyAt = fixReadyAt;
      await this.log(tx, company.id, MSG.autoAssignedTitle(employee.name, bug.title), MSG.autoAssignedText(), 'team', 'neutral', lang);
    }
  }

  private roleName(slug: string, fallback: string, lang: Lang) {
    return contentFor(lang)?.roles[slug]?.name ?? fallback;
  }

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
        productivity: employee.productivity * traitOf(employee).power * this.mentorBoost(company) * (this.officeFactorsOf(company).get(employee.id) ?? 1),
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

  private eventContext(
    company: LoadedCompany,
    lang: Lang,
    metrics = this.metricsOf(company),
    installed = new Set(company.modules.map((entry) => entry.module.slug)),
  ): EventContext {
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
      employees: company.employees.map((employee) => ({
        id: employee.id,
        name: employee.name,
        salary: employee.salary,
        roleName: this.roleName(employee.employeeType.slug, employee.employeeType.name, lang),
        trait: traitOf(employee),
        stats: statsOf(employee),
        performance: performanceOf(employee),
      })),
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

  private async campaignQuotes(company: LoadedCompany, lang: Lang) {
    const catalog = await this.catalogService.catalog(lang);
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

  // El título se guarda en el idioma de quien estaba jugando (la vista lo
  // re-traduce desde el escenario si cambia de idioma después).
  private async createBug(tx: Tx, companyId: string, scenario: BugScenario, stage: number, lang: Lang) {
    const text = localizeScenario(scenario, lang);
    await tx.codeStudioBug.create({
      data: {
        companyId,
        kind: scenario.trigger,
        scenarioKey: scenario.key,
        title: text.title,
        description: text.symptom,
        severity: scenario.severity as CodeStudioBugSeverity,
        fixCost: consultantFixCost(scenario.severity, stage),
      },
    });
    await this.log(tx, companyId, MSG.newBugTitle(text.title), MSG.newBugText(text.symptom), 'bug', 'bad', lang);
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
  private async applyOutcome(tx: Tx, company: LoadedCompany, outcome: EventOutcome, lang: Lang) {
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
    await this.applySideEffects(tx, company, outcome, lang);
    await this.log(tx, company.id, MSG.decisionTakenLog(), outcome.message, 'market', outcome.tone, lang);
  }

  private async applySideEffects(tx: Tx, company: LoadedCompany, outcome: EventOutcome, lang: Lang) {
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
      if (scenario && !alreadyOpen && company.bugReports.length < MAX_OPEN_BUGS) await this.createBug(tx, company.id, scenario, company.stage, lang);
    }
  }

  // Logros que se chequean en cada tick: stats.granted evita pegarle a la
  // base 6 veces por minuto una vez que ya se otorgaron.
  private async grantOnce(tx: Tx, userId: string, key: string, companyId: string, stats: Record<string, any>, lang: Lang) {
    const granted: string[] = Array.isArray(stats.granted) ? (stats.granted as string[]) : [];
    if (granted.includes(key)) return;
    await this.rewards.grantMilestone(tx, userId, key, companyId, lang);
    stats.granted = [...granted, key];
  }

  private postMortem(company: LoadedCompany, metrics: EngineMetrics, lang: Lang) {
    const reasons: Localized[] = [MSG.pmBurn(metrics.dailyCosts, metrics.dailySalaries, metrics.dailyInfra, metrics.dailyRevenue)];
    if (metrics.arpu === 0) reasons.push(MSG.pmNoMonetization());
    if (company.employees.length >= 3 && metrics.dailyRevenue < metrics.dailySalaries * 0.5) reasons.push(MSG.pmOverhired());
    if (metrics.churn > 0.04) reasons.push(MSG.pmChurn((metrics.churn * 100).toFixed(1)));
    if (company.fundingRound === 0 && company.stage >= 2) reasons.push(MSG.pmNoFunding());
    reasons.push(MSG.pmKept());
    return reasons.map((reason) => pick(reason, lang)).join(' ');
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
  private async spend(tx: Tx, companyId: string, amount: number, lang: Lang, message: Localized = MSG.notEnoughCash()) {
    if (amount <= 0) return;
    const result = await tx.codeStudioCompany.updateMany({
      where: { id: companyId, cash: { gte: amount }, status: { not: CodeStudioCompanyStatus.FAILED } },
      data: { cash: { decrement: amount }, expenses: { increment: amount } },
    });
    if (result.count === 0) throw new BadRequestException(pick(message, lang));
  }

  // Acepta texto ya armado o un Localized (se elige el idioma del jugador).
  private log(tx: Tx, companyId: string, title: Localized | string, description: Localized | string, kind: string, tone: string, lang: Lang) {
    return tx.codeStudioEventLog.create({ data: { companyId, title: pick(title, lang), description: pick(description, lang), effects: { kind, tone } } });
  }

  private async requireOwned(userId: string, companyId: string, lang: Lang) {
    const company = await this.prisma.codeStudioCompany.findUnique({ where: { id: companyId }, include: companyInclude });
    if (!company) throw new NotFoundException(pick(MSG.companyNotFound(), lang));
    if (company.userId !== userId) throw new ForbiddenException(pick(MSG.notYourCompany(), lang));
    return company;
  }

  private async requireAlive(userId: string, companyId: string, lang: Lang) {
    const company = await this.requireOwned(userId, companyId, lang);
    if (company.status === CodeStudioCompanyStatus.FAILED) throw new BadRequestException(pick(MSG.companyFailed(), lang));
    return company;
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
