import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { APP_TYPES, CAMPAIGN_BUDGET_MULTIPLIERS, CHANNELS, HOSTING, ROLES } from './content/economy';
import { FEATURES, FEATURE_BRANCHES } from './content/features';
import { FUNDING_ROUNDS, GAME_XP_FACTOR, MILESTONES, STAGES } from './content/progression';
import { PRICE_LEVELS } from './content/events';
import { Lang, contentFor, milestoneText, pick, stageText } from './content/i18n';

// El contenido de CodeStudio v2 vive en código (content/*.ts) y se copia a
// la base de datos al arrancar la API: así cada deploy trae el balance nuevo
// sin correr seeds a mano en producción (el release de Heroku solo corre
// `prisma migrate deploy`). Cada fila guarda metadata.contentVersion: si un
// admin la edita desde /admin/codestudio, su cambio se respeta hasta que se
// suba CONTENT_VERSION acá.
export const CONTENT_VERSION = 1;

const CATALOG_TTL_MS = 60_000;

type Json = Prisma.InputJsonValue;

@Injectable()
export class CodeStudioCatalogService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CodeStudioCatalogService.name);
  private cache = new Map<Lang, { at: number; value: Awaited<ReturnType<CodeStudioCatalogService['buildCatalog']>> }>();

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    try {
      await this.syncContent();
    } catch (error) {
      // Nunca tumbar la API por esto: si falla, el juego sigue con lo que
      // ya había en la base y se reintenta en el próximo arranque.
      this.logger.error('No se pudo sincronizar el contenido de CodeStudio', error as Error);
    }
  }

  // force: ignora contentVersion y reescribe todo (lo usa el seed).
  async syncContent({ force = false }: { force?: boolean } = {}) {
    const isCurrent = (metadata: unknown) => !force && (metadata as { contentVersion?: number } | null)?.contentVersion === CONTENT_VERSION;

    // Tipos de app.
    const existingApps = new Map(
      (await this.prisma.codeStudioAppType.findMany({ select: { slug: true, metadata: true } })).map((row) => [row.slug, row.metadata]),
    );
    for (const [order, app] of APP_TYPES.entries()) {
      if (existingApps.has(app.slug) && isCurrent(existingApps.get(app.slug))) continue;
      const data = {
        name: app.name,
        icon: app.icon,
        color: app.color,
        category: app.category,
        difficulty: app.difficulty,
        description: app.description,
        order,
        active: true,
        visible: true,
        simulationProfile: app.profile as unknown as Json,
        metadata: { contentVersion: CONTENT_VERSION } as Json,
      };
      await this.safeUpsert(() =>
        this.prisma.codeStudioAppType.upsert({ where: { slug: app.slug }, update: data, create: { slug: app.slug, ...data } }),
      );
    }

    // Árbol de features (CodeStudioModule). Las 120 features del catálogo
    // viejo se desactivan: siguen existiendo para las empresas que ya las
    // tenían instaladas (el motor las trata como "legacy").
    const existingModules = new Map(
      (await this.prisma.codeStudioModule.findMany({ select: { slug: true, metadata: true } })).map((row) => [row.slug, row.metadata]),
    );
    const branchName = new Map(FEATURE_BRANCHES.map((branch) => [branch.key, branch.name]));
    for (const [order, feature] of FEATURES.entries()) {
      if (existingModules.has(feature.slug) && isCurrent(existingModules.get(feature.slug))) continue;
      const data = {
        name: feature.name,
        description: feature.description,
        category: branchName.get(feature.branch) ?? feature.branch,
        difficulty: feature.difficulty,
        cost: feature.cost,
        developmentSeconds: feature.devSeconds,
        experience: feature.difficulty ** 2 * 4,
        order,
        visible: true,
        active: true,
        effects: feature.effects as Json,
        requirements: { requires: feature.requires, minStage: feature.minStage } as Json,
        metadata: { contentVersion: CONTENT_VERSION, v2: true, branch: feature.branch, lesson: feature.lesson } as Json,
      };
      await this.safeUpsert(() =>
        this.prisma.codeStudioModule.upsert({ where: { slug: feature.slug }, update: data, create: { slug: feature.slug, ...data } }),
      );
    }
    await this.prisma.codeStudioModule.updateMany({
      where: { slug: { notIn: FEATURES.map((feature) => feature.slug) }, active: true },
      data: { active: false, visible: false },
    });

    // Roles.
    const existingRoles = new Map(
      (await this.prisma.codeStudioEmployeeType.findMany({ select: { slug: true, metadata: true } })).map((row) => [row.slug, row.metadata]),
    );
    for (const [order, role] of ROLES.entries()) {
      if (existingRoles.has(role.slug) && isCurrent(existingRoles.get(role.slug))) continue;
      const data = {
        name: role.name,
        description: role.description,
        category: role.category,
        salary: role.salary,
        order,
        active: true,
        baseStats: role.baseStats as Json,
        metadata: { contentVersion: CONTENT_VERSION, devPower: role.devPower } as Json,
      };
      await this.safeUpsert(() =>
        this.prisma.codeStudioEmployeeType.upsert({ where: { slug: role.slug }, update: data, create: { slug: role.slug, ...data } }),
      );
    }

    // Hosting.
    const existingHosting = new Map(
      (await this.prisma.codeStudioInfrastructureType.findMany({ select: { slug: true, metadata: true } })).map((row) => [row.slug, row.metadata]),
    );
    for (const [order, item] of HOSTING.entries()) {
      if (existingHosting.has(item.slug) && isCurrent(existingHosting.get(item.slug))) continue;
      const data = {
        name: item.name,
        description: item.description,
        category: 'Infraestructura',
        baseCost: item.install,
        order,
        active: item.active,
        scaling: {
          capacity: item.capacity,
          latency: item.latency,
          stability: item.stability,
          monthly: item.monthly,
          maxLevel: item.maxLevel,
          minStage: item.minStage,
        } as Json,
        metadata: { contentVersion: CONTENT_VERSION } as Json,
      };
      await this.safeUpsert(() =>
        this.prisma.codeStudioInfrastructureType.upsert({ where: { slug: item.slug }, update: data, create: { slug: item.slug, ...data } }),
      );
    }

    // Canales de marketing.
    const existingChannels = new Map(
      (await this.prisma.codeStudioCampaign.findMany({ select: { slug: true, metadata: true } })).map((row) => [row.slug, row.metadata]),
    );
    for (const [order, channel] of CHANNELS.entries()) {
      if (existingChannels.has(channel.slug) && isCurrent(existingChannels.get(channel.slug))) continue;
      const data = {
        name: channel.name,
        channel: channel.channel,
        description: `Campaña en ${channel.name}.`,
        baseCost: channel.baseCost,
        order,
        active: true,
        config: { baseCac: channel.baseCac, minStage: channel.minStage } as Json,
        metadata: { contentVersion: CONTENT_VERSION } as Json,
      };
      await this.safeUpsert(() =>
        this.prisma.codeStudioCampaign.upsert({ where: { slug: channel.slug }, update: data, create: { slug: channel.slug, ...data } }),
      );
    }

    // El árbol de tecnologías, la investigación y las plantillas de eventos
    // viejas quedan reemplazadas por el árbol de features y los eventos en
    // content/events.ts.
    await Promise.all([
      this.prisma.codeStudioTechnology.updateMany({ where: { active: true }, data: { active: false } }),
      this.prisma.codeStudioResearch.updateMany({ where: { active: true }, data: { active: false } }),
      this.prisma.codeStudioEventTemplate.updateMany({ where: { active: true }, data: { active: false } }),
    ]);

    this.cache.clear();
  }

  // Dos dynos arrancando a la vez pueden intentar crear la misma fila: el
  // segundo choca con el unique de slug. No es un error real.
  private async safeUpsert(run: () => Promise<unknown>) {
    try {
      await run();
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
    }
  }

  async catalog(lang: Lang = 'es') {
    const cached = this.cache.get(lang);
    if (cached && Date.now() - cached.at < CATALOG_TTL_MS) return cached.value;
    const value = await this.buildCatalog(lang);
    this.cache.set(lang, { at: Date.now(), value });
    return value;
  }

  invalidate() {
    this.cache.clear();
  }

  // El español sale de la base (editable por admin); inglés y alemán
  // reemplazan nombres/descripciones por slug desde content/i18n.
  private async buildCatalog(lang: Lang) {
    const t = contentFor(lang);
    const [appTypes, modules, employees, infrastructure, campaigns] = await Promise.all([
      this.prisma.codeStudioAppType.findMany({ where: { active: true, visible: true }, orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
      this.prisma.codeStudioModule.findMany({ where: { active: true, visible: true }, orderBy: { order: 'asc' } }),
      this.prisma.codeStudioEmployeeType.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
      this.prisma.codeStudioInfrastructureType.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
      this.prisma.codeStudioCampaign.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
    ]);

    return {
      appTypes: appTypes.map((type) => {
        const profile = (type.simulationProfile ?? {}) as Record<string, any>;
        return {
          id: type.id,
          slug: type.slug,
          name: t?.appTypes[type.slug]?.name ?? type.name,
          icon: type.icon,
          color: type.color,
          category: t?.appTypes[type.slug]?.category ?? type.category,
          difficulty: type.difficulty,
          description: t?.appTypes[type.slug]?.description ?? type.description,
          minFounderLevel: Number(profile.minFounderLevel ?? 1),
          startingCash: Number(profile.startingCash ?? 6000),
        };
      }),
      branches: FEATURE_BRANCHES.map((branch) => ({ ...branch, ...(t?.branches[branch.key] ?? {}) })),
      features: modules.map((module) => {
        const requirements = (module.requirements ?? {}) as { requires?: string[]; minStage?: number };
        const metadata = (module.metadata ?? {}) as { branch?: string; lesson?: string };
        return {
          id: module.id,
          slug: module.slug,
          name: t?.features[module.slug]?.name ?? module.name,
          description: t?.features[module.slug]?.description ?? module.description,
          branch: metadata.branch ?? 'producto',
          lesson: t?.features[module.slug]?.lesson ?? metadata.lesson ?? '',
          cost: module.cost,
          devSeconds: module.developmentSeconds,
          difficulty: module.difficulty,
          requires: requirements.requires ?? [],
          minStage: requirements.minStage ?? 0,
          // XP real que da (ya regulado: el XP del juego cuenta a la mitad).
          xp: Math.round(module.difficulty ** 2 * 4 * GAME_XP_FACTOR),
          effects: module.effects ?? {},
        };
      }),
      roles: employees.map((type) => ({
        id: type.id,
        slug: type.slug,
        name: t?.roles[type.slug]?.name ?? type.name,
        description: t?.roles[type.slug]?.description ?? type.description,
        category: type.category,
        salary: type.salary,
        hireCost: Math.round(type.salary * 0.5),
        devPower: Number((type.metadata as { devPower?: number } | null)?.devPower ?? 0),
        canFixBugs: ['backend', 'fullstack', 'devops', 'qa', 'data-scientist'].includes(type.slug),
      })),
      hosting: infrastructure.map((type) => {
        const scaling = (type.scaling ?? {}) as Record<string, number>;
        return {
          id: type.id,
          slug: type.slug,
          name: t?.hosting[type.slug]?.name ?? type.name,
          description: t?.hosting[type.slug]?.description ?? type.description,
          install: type.baseCost,
          monthly: Number(scaling.monthly ?? 0),
          capacity: Number(scaling.capacity ?? 0),
          latency: Number(scaling.latency ?? 120),
          stability: Number(scaling.stability ?? 97),
          maxLevel: Number(scaling.maxLevel ?? 5),
          minStage: Number(scaling.minStage ?? 0),
        };
      }),
      channels: campaigns.map((campaign) => ({
        id: campaign.id,
        slug: campaign.slug,
        name: campaign.name,
        channel: t?.channels[campaign.slug] ?? campaign.channel,
        baseCost: campaign.baseCost,
        minStage: Number((campaign.config as { minStage?: number } | null)?.minStage ?? 1),
      })),
      budgetMultipliers: CAMPAIGN_BUDGET_MULTIPLIERS,
      stages: STAGES.map((stage) => ({
        index: stage.index,
        ...stageText(stage.index, lang),
        reward: { ...stage.reward, xp: Math.round(stage.reward.xp * GAME_XP_FACTOR) },
      })),
      milestones: MILESTONES.map((milestone) => ({
        ...milestone,
        ...milestoneText(milestone.key, lang),
        xp: Math.round(milestone.xp * GAME_XP_FACTOR),
      })),
      fundingRounds: FUNDING_ROUNDS,
      priceLevels: PRICE_LEVELS.map((level) => ({ value: level.value, label: pick(level.label, lang) })),
    };
  }
}

export type CodeStudioCatalog = Awaited<ReturnType<CodeStudioCatalogService['catalog']>>;
