import { Injectable } from '@nestjs/common';
import { Prisma, RewardSourceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import {
  MILESTONES,
  MILESTONE_BY_KEY,
  REPEAT_XP_FACTOR,
  founderLevelForXp,
  startingCashBonus,
  xpForFounderLevel,
} from './content/progression';

type Tx = Prisma.TransactionClient;

// Recompensas de CodeStudio v2:
// - XP de fundador (CodeStudioProfile.xp): por cada cosa que haces, escalada
//   por dificultad. Sube el nivel de fundador, que desbloquea tipos de app y
//   da más caja inicial. Sobrevive a las quiebras.
// - Logros (CodeStudioMilestone): una sola vez por usuario. Pagan coins de
//   la plataforma vía GamificationService.grantRewards (mismo ledger que
//   misiones y Battle Pass, sourceType CODESTUDIO).
@Injectable()
export class CodeStudioRewardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
  ) {}

  async getProfile(userId: string, client: Tx | PrismaService = this.prisma) {
    const [profile, milestones] = await Promise.all([
      client.codeStudioProfile.findUnique({ where: { userId } }),
      client.codeStudioMilestone.findMany({ where: { userId }, select: { key: true, createdAt: true } }),
    ]);
    const xp = profile?.xp ?? 0;
    const level = founderLevelForXp(xp);
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
      milestones: milestones.map((entry) => ({ key: entry.key, at: entry.createdAt })),
      totalMilestones: MILESTONES.length,
    };
  }

  // Suma XP de fundador y, si subió de nivel, deja un evento visible en la
  // empresa (el cliente lo muestra como celebración).
  async addXp(tx: Tx, userId: string, amount: number, companyId: string | null, stats: Partial<Record<'bugsDiagnosed' | 'bugsFirstTry' | 'companiesFounded' | 'bankruptcies', number>> = {}) {
    const xp = Math.max(0, Math.round(amount));
    const increments = Object.fromEntries(Object.entries(stats).map(([key, value]) => [key, { increment: value }]));
    const before = await tx.codeStudioProfile.findUnique({ where: { userId }, select: { xp: true } });
    const profile = await tx.codeStudioProfile.upsert({
      where: { userId },
      update: { xp: { increment: xp }, ...increments },
      create: { userId, xp, ...Object.fromEntries(Object.entries(stats)) },
    });
    const oldLevel = founderLevelForXp(before?.xp ?? 0);
    const newLevel = founderLevelForXp(profile.xp);
    if (newLevel > oldLevel && companyId) {
      await tx.codeStudioEventLog.create({
        data: {
          companyId,
          title: `¡Subiste a fundador nivel ${newLevel}!`,
          description: `Tu próxima startup arrancará con $${startingCashBonus(newLevel)} extra.`,
          effects: { kind: 'level-up', tone: 'good', level: newLevel },
        },
      });
    }
    return { xp, level: newLevel, leveledUp: newLevel > oldLevel };
  }

  // Otorga un logro si el usuario todavía no lo tenía. Devuelve true solo la
  // primera vez. createMany + skipDuplicates respeta el @@unique aunque dos
  // requests intenten otorgarlo a la vez (una gana, la otra no paga nada).
  async grantMilestone(tx: Tx, userId: string, key: string, companyId: string | null) {
    const milestone = MILESTONE_BY_KEY.get(key);
    if (!milestone) return false;
    const created = await tx.codeStudioMilestone.createMany({ data: [{ userId, key, companyId }], skipDuplicates: true });
    if (created.count === 0) return false;

    if (milestone.coins > 0) {
      await this.gamification.grantRewards(tx, userId, RewardSourceType.CODESTUDIO, key, `CodeStudio: ${milestone.name}`, [
        { type: 'COINS', amount: milestone.coins },
      ]);
    }
    await this.addXp(tx, userId, milestone.xp, companyId);
    if (companyId) {
      await tx.codeStudioEventLog.create({
        data: {
          companyId,
          title: `Logro: ${milestone.name}`,
          description: `${milestone.description} +${milestone.xp} XP${milestone.coins > 0 ? ` · +${milestone.coins} coins` : ''}`,
          effects: { kind: 'milestone', tone: 'good', key, xp: milestone.xp, coins: milestone.coins },
        },
      });
    }
    return true;
  }

  // Para lo que se puede repetir con otra empresa (llegar a una etapa):
  // la primera vez paga el logro completo; las siguientes, solo una
  // fracción de XP y nada de coins.
  async grantRepeatable(tx: Tx, userId: string, key: string, companyId: string) {
    const first = await this.grantMilestone(tx, userId, key, companyId);
    if (!first) {
      const milestone = MILESTONE_BY_KEY.get(key);
      if (milestone) await this.addXp(tx, userId, milestone.xp * REPEAT_XP_FACTOR, companyId);
    }
    return first;
  }

  async hasMilestone(userId: string, key: string, client: Tx | PrismaService = this.prisma) {
    return (await client.codeStudioMilestone.count({ where: { userId, key } })) > 0;
  }
}
