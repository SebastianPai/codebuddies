import { Injectable } from '@nestjs/common';
import { Prisma, RewardSourceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { MILESTONES, MILESTONE_BY_KEY, REPEAT_XP_FACTOR, founderLevelForXp, startingCashBonus, xpForFounderLevel } from './content/progression';
import { DAILY_BONUS, DailyCounter, dailyKey, dailyMilestoneKey, minutesUntilReset, missionsFor } from './content/daily';
import { Lang, MSG, milestoneText, pick } from './content/i18n';

type Tx = Prisma.TransactionClient;
type Stats = Partial<Record<'bugsDiagnosed' | 'bugsFirstTry' | 'companiesFounded' | 'bankruptcies', number>>;

// Recompensas de CodeStudio v2:
// - XP de fundador (CodeStudioProfile.xp): por cada cosa que haces, escalada
//   por dificultad. Sube el nivel de fundador, que desbloquea tipos de app y
//   da más caja inicial. Sobrevive a las quiebras.
// - Logros (CodeStudioMilestone): una sola vez por usuario. Pagan coins de
//   la plataforma vía GamificationService.grantRewards (mismo ledger que
//   misiones y Battle Pass, sourceType CODESTUDIO).
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
    const [profile, milestones, counters] = await Promise.all([
      client.codeStudioProfile.findUnique({ where: { userId } }),
      // Los diarios se acumulan (~4 por día): solo interesan los de hoy.
      client.codeStudioMilestone.findMany({
        where: { userId, OR: [{ NOT: { key: { startsWith: 'daily:' } } }, { key: { startsWith: `daily:${day}:` } }] },
        select: { key: true, createdAt: true },
      }),
      client.codeStudioDailyCounter.findMany({ where: { userId, day } }),
    ]);
    const xp = profile?.xp ?? 0;
    const level = founderLevelForXp(xp);
    const earned = new Set(milestones.map((entry) => entry.key));
    const value = new Map(counters.map((entry) => [entry.counter, entry.value]));
    const missions = missionsFor(userId, day).map((mission) => ({
      key: mission.key,
      label: pick(mission.label(mission.target), lang),
      target: mission.target,
      progress: Math.min(mission.target, Math.floor(value.get(mission.counter) ?? 0)),
      done: earned.has(dailyMilestoneKey(day, mission.key)),
      xp: mission.xp,
      coins: mission.coins,
    }));
    return {
      xp,
      level,
      levelXp: xpForFounderLevel(level),
      nextLevelXp: xpForFounderLevel(level + 1),
      startingCashBonus: startingCashBonus(level),
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
        bonus: { ...DAILY_BONUS, done: earned.has(dailyMilestoneKey(day, 'all')) },
        resetsInMinutes: minutesUntilReset(),
      },
    };
  }

  // Suma XP de fundador y, si subió de nivel, deja un evento visible en la
  // empresa (el cliente lo muestra como celebración).
  async addXp(tx: Tx, userId: string, amount: number, companyId: string | null, stats: Stats = {}, lang: Lang = 'es') {
    const xp = Math.max(0, Math.round(amount));
    const increments = Object.fromEntries(Object.entries(stats).map(([key, value]) => [key, { increment: value }]));
    const before = await tx.codeStudioProfile.findUnique({ where: { userId }, select: { xp: true } });
    const profile = await tx.codeStudioProfile.upsert({
      where: { userId },
      update: { xp: { increment: xp }, ...increments },
      create: { userId, xp, ...stats },
    });
    const oldLevel = founderLevelForXp(before?.xp ?? 0);
    const newLevel = founderLevelForXp(profile.xp);
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
    return { xp, level: newLevel, leveledUp: newLevel > oldLevel };
  }

  // Paga una recompensa única por clave. createMany + skipDuplicates respeta
  // el @@unique aunque dos requests lleguen a la vez: una gana, la otra no
  // paga nada. Devuelve true solo la primera vez.
  private async grantOnceKey(tx: Tx, userId: string, key: string, reward: { title: string; description: string; xp: number; coins: number; label: string }, companyId: string | null, lang: Lang) {
    const created = await tx.codeStudioMilestone.createMany({ data: [{ userId, key, companyId }], skipDuplicates: true });
    if (created.count === 0) return false;
    if (reward.coins > 0) {
      await this.gamification.grantRewards(tx, userId, RewardSourceType.CODESTUDIO, key, `CodeStudio: ${reward.label}`, [{ type: 'COINS', amount: reward.coins }]);
    }
    await this.addXp(tx, userId, reward.xp, companyId, {}, lang);
    if (companyId) {
      await tx.codeStudioEventLog.create({
        data: {
          companyId,
          title: reward.title,
          description: `${reward.description}${pick(MSG.rewardSuffix(reward.xp, reward.coins), lang)}`.trim(),
          effects: { kind: 'milestone', tone: 'good', key, xp: reward.xp, coins: reward.coins },
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

  // Para lo que se puede repetir con otra empresa (llegar a una etapa):
  // la primera vez paga el logro completo; las siguientes, solo una
  // fracción de XP y nada de coins.
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
      await this.grantOnceKey(
        tx,
        userId,
        dailyMilestoneKey(day, 'all'),
        { title: pick(MSG.dailyAllTitle(), lang), description: pick(MSG.dailyAllText(), lang), xp: DAILY_BONUS.xp, coins: DAILY_BONUS.coins, label: 'Misiones diarias' },
        companyId,
        lang,
      );
    }
  }
}

export type CodeStudioProfileView = Awaited<ReturnType<CodeStudioRewardsService['getProfile']>>;
