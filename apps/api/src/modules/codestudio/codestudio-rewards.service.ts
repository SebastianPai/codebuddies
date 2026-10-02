import { Injectable } from '@nestjs/common';
import { Prisma, RewardSourceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import {
  DAILY_GAME_XP_CAP,
  GAME_XP_FACTOR,
  MILESTONES,
  MILESTONE_BY_KEY,
  REPEAT_XP_FACTOR,
  levelForXp,
  startingCashBonus,
  xpForLevel,
} from './content/progression';
import { DAILY_BONUS, DailyCounter, dailyKey, dailyMilestoneKey, minutesUntilReset, missionsFor } from './content/daily';
import { Lang, MSG, milestoneText, pick } from './content/i18n';

type Tx = Prisma.TransactionClient;
type Stats = Partial<Record<'bugsDiagnosed' | 'bugsFirstTry' | 'companiesFounded' | 'bankruptcies', number>>;

// Contador interno (en CodeStudioDailyCounter) del XP repetible que el juego
// ya entregó hoy; no es una misión.
const XP_COUNTER = 'xp';

// Recompensas de CodeStudio:
// - XP: es el XP GLOBAL de la cuenta (User.experience/level), el mismo que
//   sube estudiando. Se entrega con GamificationService.grantRewards (queda
//   en XPTransaction y en el historial de recompensas, sourceType
//   CODESTUDIO). Regulado: cuenta a la mitad, y lo repetible tiene un tope
//   diario (ver GAME_XP_FACTOR / DAILY_GAME_XP_CAP).
// - Nivel: el de la cuenta. Desbloquea tipos de app y da más caja inicial.
// - Logros (CodeStudioMilestone): una sola vez por usuario; pagan coins y XP.
// - Misiones diarias (content/daily.ts): contadores por día en
//   CodeStudioDailyCounter; el pago usa la misma tabla de logros con clave
//   "daily:<día>:<misión>", así tampoco se puede cobrar dos veces.
@Injectable()
export class CodeStudioRewardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
  ) {}

  async getProfile(userId: string, lang: Lang = 'es', client: Tx | PrismaService = this.prisma) {
    const day = dailyKey();
    const [user, profile, milestones, counters] = await Promise.all([
      client.user.findUnique({ where: { id: userId }, select: { experience: true } }),
      client.codeStudioProfile.findUnique({ where: { userId } }),
      // Los diarios se acumulan (~4 por día): solo interesan los de hoy.
      client.codeStudioMilestone.findMany({
        where: { userId, OR: [{ NOT: { key: { startsWith: 'daily:' } } }, { key: { startsWith: `daily:${day}:` } }] },
        select: { key: true, createdAt: true },
      }),
      client.codeStudioDailyCounter.findMany({ where: { userId, day } }),
    ]);
    const xp = user?.experience ?? 0;
    const level = levelForXp(xp);
    const earned = new Set(milestones.map((entry) => entry.key));
    const value = new Map(counters.map((entry) => [entry.counter, entry.value]));
    const missions = missionsFor(userId, day).map((mission) => ({
      key: mission.key,
      label: pick(mission.label(mission.target), lang),
      target: mission.target,
      progress: Math.min(mission.target, Math.floor(value.get(mission.counter) ?? 0)),
      done: earned.has(dailyMilestoneKey(day, mission.key)),
      xp: Math.round(mission.xp * GAME_XP_FACTOR),
      coins: mission.coins,
    }));
    return {
      xp,
      level,
      levelXp: xpForLevel(level),
      nextLevelXp: xpForLevel(level + 1),
      startingCashBonus: startingCashBonus(level),
      gameXpToday: Math.round(value.get(XP_COUNTER) ?? 0),
      gameXpCap: DAILY_GAME_XP_CAP,
      codestudioXp: profile?.xp ?? 0,
      companiesFounded: profile?.companiesFounded ?? 0,
      bankruptcies: profile?.bankruptcies ?? 0,
      bugsDiagnosed: profile?.bugsDiagnosed ?? 0,
      bugsFirstTry: profile?.bugsFirstTry ?? 0,
      bestValuation: profile?.bestValuation ?? 0,
      // Solo logros "de verdad" (los diarios tienen su propia sección).
      milestones: milestones.filter((entry) => MILESTONE_BY_KEY.has(entry.key)).map((entry) => ({ key: entry.key, at: entry.createdAt })),
      totalMilestones: MILESTONES.length,
      daily: {
        day,
        missions,
        bonus: { xp: Math.round(DAILY_BONUS.xp * GAME_XP_FACTOR), coins: DAILY_BONUS.coins, done: earned.has(dailyMilestoneKey(day, 'all')) },
        resetsInMinutes: minutesUntilReset(),
      },
    };
  }

  // Logros de CodeStudio para la web (/achievements): livianos, sin
  // catálogo ni simulación. Incluye la pista de cómo desbloquear cada uno.
  async achievements(userId: string, lang: Lang = 'es') {
    const [profile, unlocked] = await Promise.all([
      this.getProfile(userId, lang),
      this.prisma.codeStudioMilestone.findMany({
        where: { userId, key: { in: MILESTONES.map((milestone) => milestone.key) } },
        select: { key: true, createdAt: true },
      }),
    ]);
    const unlockedAt = new Map(unlocked.map((entry) => [entry.key, entry.createdAt]));
    const items = MILESTONES.map((milestone) => ({
      key: milestone.key,
      ...milestoneText(milestone.key, lang),
      xp: Math.round(milestone.xp * GAME_XP_FACTOR),
      coins: milestone.coins,
      unlocked: unlockedAt.has(milestone.key),
      unlockedAt: unlockedAt.get(milestone.key) ?? null,
    }));
    return {
      summary: { total: items.length, unlocked: unlocked.length, locked: items.length - unlocked.length },
      level: profile.level,
      daily: profile.daily,
      hasPlayed: profile.companiesFounded > 0,
      items,
    };
  }

  // Suma XP global (regulado) y estadísticas de CodeStudio. capped=true para
  // lo repetible (entra en el tope diario); los logros y misiones no.
  async addXp(
    tx: Tx,
    userId: string,
    amount: number,
    companyId: string | null,
    stats: Stats = {},
    lang: Lang = 'es',
    capped = true,
  ) {
    let xp = Math.max(0, Math.round(amount * GAME_XP_FACTOR));
    if (capped && xp > 0) {
      const day = dailyKey();
      const used = await tx.codeStudioDailyCounter.findUnique({ where: { userId_day_counter: { userId, day, counter: XP_COUNTER } } });
      xp = Math.min(xp, Math.max(0, DAILY_GAME_XP_CAP - (used?.value ?? 0)));
      if (xp > 0) {
        await tx.codeStudioDailyCounter.upsert({
          where: { userId_day_counter: { userId, day, counter: XP_COUNTER } },
          update: { value: { increment: xp } },
          create: { userId, day, counter: XP_COUNTER, value: xp },
        });
      }
    }

    const increments = Object.fromEntries(Object.entries(stats).map(([key, value]) => [key, { increment: value }]));
    if (xp > 0 || Object.keys(stats).length > 0) {
      await tx.codeStudioProfile.upsert({
        where: { userId },
        update: { xp: { increment: xp }, ...increments },
        create: { userId, xp, ...stats },
      });
    }
    if (xp === 0) return { xp: 0, leveledUp: false };

    const before = await tx.user.findUnique({ where: { id: userId }, select: { experience: true } });
    await this.gamification.grantRewards(tx, userId, RewardSourceType.CODESTUDIO, 'codestudio-xp', 'CodeStudio', [{ type: 'XP', amount: xp }]);
    const oldLevel = levelForXp(before?.experience ?? 0);
    const newLevel = levelForXp((before?.experience ?? 0) + xp);
    if (newLevel > oldLevel && companyId) {
      await tx.codeStudioEventLog.create({
        data: {
          companyId,
          title: pick(MSG.levelUpTitle(newLevel), lang),
          description: pick(MSG.levelUpText(startingCashBonus(newLevel)), lang),
          effects: { kind: 'level-up', tone: 'good', level: newLevel },
        },
      });
    }
    return { xp, leveledUp: newLevel > oldLevel };
  }

  // Paga una recompensa única por clave. createMany + skipDuplicates respeta
  // el @@unique aunque dos requests lleguen a la vez: una gana, la otra no
  // paga nada. Devuelve true solo la primera vez.
  private async grantOnceKey(
    tx: Tx,
    userId: string,
    key: string,
    reward: { title: string; description: string; xp: number; coins: number; label: string },
    companyId: string | null,
    lang: Lang,
  ) {
    const created = await tx.codeStudioMilestone.createMany({ data: [{ userId, key, companyId }], skipDuplicates: true });
    if (created.count === 0) return false;
    if (reward.coins > 0) {
      await this.gamification.grantRewards(tx, userId, RewardSourceType.CODESTUDIO, key, `CodeStudio: ${reward.label}`, [{ type: 'COINS', amount: reward.coins }]);
    }
    const { xp } = await this.addXp(tx, userId, reward.xp, companyId, {}, lang, false);
    if (companyId) {
      await tx.codeStudioEventLog.create({
        data: {
          companyId,
          title: reward.title,
          description: `${reward.description}${pick(MSG.rewardSuffix(xp, reward.coins), lang)}`.trim(),
          effects: { kind: 'milestone', tone: 'good', key, xp, coins: reward.coins },
        },
      });
    }
    return true;
  }

  async grantMilestone(tx: Tx, userId: string, key: string, companyId: string | null, lang: Lang = 'es') {
    const milestone = MILESTONE_BY_KEY.get(key);
    if (!milestone) return false;
    const text = milestoneText(key, lang);
    return this.grantOnceKey(
      tx,
      userId,
      key,
      { title: pick(MSG.achievementTitle(text.name), lang), description: text.description, xp: milestone.xp, coins: milestone.coins, label: milestone.name },
      companyId,
      lang,
    );
  }

  async hasMilestone(tx: Tx, userId: string, key: string) {
    return (await tx.codeStudioMilestone.count({ where: { userId, key } })) > 0;
  }

  // Para lo que se puede repetir con otra empresa (llegar a una etapa):
  // la primera vez paga el logro completo; las siguientes, solo una
  // fracción de XP (con tope diario) y nada de coins.
  async grantRepeatable(tx: Tx, userId: string, key: string, companyId: string, lang: Lang = 'es') {
    const first = await this.grantMilestone(tx, userId, key, companyId, lang);
    if (!first) {
      const milestone = MILESTONE_BY_KEY.get(key);
      if (milestone) await this.addXp(tx, userId, milestone.xp * REPEAT_XP_FACTOR, companyId, {}, lang);
    }
    return first;
  }

  // Suma a los contadores de hoy y paga las misiones que se completen.
  async bumpDaily(tx: Tx, userId: string, amounts: Partial<Record<DailyCounter, number>>, companyId: string | null, lang: Lang = 'es') {
    const entries = Object.entries(amounts).filter(([, amount]) => typeof amount === 'number' && amount > 0) as Array<[DailyCounter, number]>;
    if (entries.length === 0) return;
    const day = dailyKey();
    const missions = missionsFor(userId, day);
    const values = new Map<string, number>();
    for (const [counter, amount] of entries) {
      const row = await tx.codeStudioDailyCounter.upsert({
        where: { userId_day_counter: { userId, day, counter } },
        update: { value: { increment: amount } },
        create: { userId, day, counter, value: amount },
      });
      values.set(counter, row.value);
    }
    let completedNow = false;
    for (const mission of missions) {
      const value = values.get(mission.counter);
      if (value === undefined || value < mission.target) continue;
      const label = pick(mission.label(mission.target), lang);
      const paid = await this.grantOnceKey(
        tx,
        userId,
        dailyMilestoneKey(day, mission.key),
        { title: pick(MSG.dailyTitle(label), lang), description: '', xp: mission.xp, coins: mission.coins, label: pick(mission.label(mission.target), 'es') },
        companyId,
        lang,
      );
      completedNow = completedNow || paid;
    }
    if (!completedNow) return;
    const keys = missions.map((mission) => dailyMilestoneKey(day, mission.key));
    const done = await tx.codeStudioMilestone.count({ where: { userId, key: { in: keys } } });
    if (done === missions.length) {
      const paidAll = await this.grantOnceKey(
        tx,
        userId,
        dailyMilestoneKey(day, 'all'),
        { title: pick(MSG.dailyAllTitle(), lang), description: pick(MSG.dailyAllText(), lang), xp: DAILY_BONUS.xp, coins: DAILY_BONUS.coins, label: 'Misiones diarias' },
        companyId,
        lang,
      );
      if (paidAll) {
        const fullDays = await tx.codeStudioMilestone.count({ where: { userId, key: { startsWith: 'daily:', endsWith: ':all' } } });
        if (fullDays >= 7) await this.grantMilestone(tx, userId, 'daily-7', companyId, lang);
      }
    }
  }
}

export type CodeStudioProfileView = Awaited<ReturnType<CodeStudioRewardsService['getProfile']>>;
