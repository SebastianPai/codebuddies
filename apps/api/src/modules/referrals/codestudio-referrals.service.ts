import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { publicReferralLink } from './referral.helpers';

// Referidos en CodeStudio: quien invita gana cuando su amigo avanza de
// verdad (no solo por registrarse), y el amigo arranca con ventaja.
//
//   - Funda su primera startup  → quien invita +200 monedas; el amigo
//     arranca con +$1.500 de caja.
//   - Su startup llega a Product-Market Fit (mitad del camino) → +400.
//   - Su startup llega a Unicornio (el final) → +1.500 monedas.
//   - Hace su primera compra (monedas, premium o boost) → +500 monedas.
//   - Red de contactos: cada amigo que fundó abarata un 3% tus campañas
//     (hasta 15%).
//
// Cada premio se paga una sola vez por amigo: la razón del CoinTransaction
// es la llave (los webhooks de pago pueden llegar repetidos).

export type ReferralMilestone = 'founded' | 'pmf' | 'unicorn' | 'purchase';

export const REFERRAL_MILESTONES: Record<ReferralMilestone, { coins: number; title: string; body: (friend: string) => string }> = {
  founded: { coins: 200, title: 'Tu amigo fundó su startup', body: (friend) => `${friend} fundó su primera startup en CodeStudio: +200 monedas.` },
  pmf: { coins: 400, title: 'La startup de tu amigo encontró su mercado', body: (friend) => `La startup de ${friend} llegó a Product-Market Fit: +400 monedas.` },
  unicorn: { coins: 1500, title: '¡Tu amigo creó un unicornio!', body: (friend) => `La startup de ${friend} llegó a Unicornio: +1.500 monedas.` },
  purchase: { coins: 500, title: 'Tu amigo apoyó CodeBuddies', body: (friend) => `${friend} hizo su primera compra: +500 monedas.` },
};

export const REFERRED_STARTING_BONUS = 1500;
export const NETWORK_DISCOUNT_PER_FRIEND = 0.03;
export const NETWORK_DISCOUNT_MAX = 0.15;

const BLOCKED = ['REJECTED', 'FRAUD', 'REVOKED'] as const;

type Client = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CodeStudioReferralsService {
  private readonly logger = new Logger(CodeStudioReferralsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private reasonFor(milestone: ReferralMilestone, referredUserId: string) {
    return `referral:codestudio:${milestone}:${referredUserId}`;
  }

  /** Quién invitó a este usuario (si la invitación sigue siendo válida). */
  async referrerOf(referredUserId: string, client: Client = this.prisma) {
    const referral = await client.referral.findUnique({
      where: { referredUserId },
      select: { referrerUserId: true, status: true },
    });
    if (!referral || (BLOCKED as readonly string[]).includes(referral.status)) return null;
    return referral.referrerUserId;
  }

  /** Paga el premio del hito a quien invitó (una sola vez). Nunca rompe el flujo que lo llama. */
  async reward(referredUserId: string, milestone: ReferralMilestone, client: Client = this.prisma) {
    try {
      const referrerId = await this.referrerOf(referredUserId, client);
      if (!referrerId) return null;
      const reason = this.reasonFor(milestone, referredUserId);
      const already = await client.coinTransaction.findFirst({ where: { userId: referrerId, reason }, select: { id: true } });
      if (already) return null;
      const friend = await client.user.findUnique({ where: { id: referredUserId }, select: { username: true } });
      const config = REFERRAL_MILESTONES[milestone];
      await client.user.update({ where: { id: referrerId }, data: { coins: { increment: config.coins } } });
      await client.coinTransaction.create({ data: { userId: referrerId, amount: config.coins, reason } });
      await client.notification.create({
        data: {
          userId: referrerId,
          type: NotificationType.REFERRAL_REWARD_UNLOCKED,
          title: config.title,
          body: config.body(friend?.username ?? 'Tu amigo'),
          metadata: { source: 'codestudio', milestone, referredUserId, coins: config.coins } as Prisma.InputJsonValue,
        },
      });
      return { referrerId, coins: config.coins };
    } catch (error) {
      this.logger.warn(`No se pudo pagar el premio de referido ${milestone} (${referredUserId}): ${String(error)}`);
      return null;
    }
  }

  /** Descuento de campañas por la red de contactos de este usuario. */
  async networkDiscount(userId: string) {
    const founders = await this.foundingFriends(userId);
    return Math.min(NETWORK_DISCOUNT_MAX, founders * NETWORK_DISCOUNT_PER_FRIEND);
  }

  private async foundingFriends(userId: string) {
    return this.prisma.coinTransaction.count({ where: { userId, reason: { startsWith: 'referral:codestudio:founded:' } } });
  }

  /** Lo que ve el jugador en CodeStudio: sus amigos invitados y qué hito alcanzó cada uno. */
  async overview(userId: string) {
    const [profile, referrals, myReferral] = await Promise.all([
      this.prisma.referralProfile.findUnique({ where: { userId }, select: { referralCode: true, referralLink: true } }),
      this.prisma.referral.findMany({
        where: { referrerUserId: userId, status: { notIn: [...BLOCKED] } },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { referredUserId: true, referred: { select: { username: true, avatarUrl: true } } },
      }),
      this.referrerOf(userId),
    ]);
    const paid = await this.prisma.coinTransaction.findMany({
      where: { userId, reason: { startsWith: 'referral:codestudio:' } },
      select: { reason: true, amount: true },
    });
    const done = new Set(paid.map((row) => row.reason));
    const friends = referrals.map((referral) => ({
      username: referral.referred.username,
      avatarUrl: referral.referred.avatarUrl,
      founded: done.has(this.reasonFor('founded', referral.referredUserId)),
      pmf: done.has(this.reasonFor('pmf', referral.referredUserId)),
      unicorn: done.has(this.reasonFor('unicorn', referral.referredUserId)),
      purchase: done.has(this.reasonFor('purchase', referral.referredUserId)),
    }));
    const founders = friends.filter((friend) => friend.founded).length;
    return {
      link: profile ? publicReferralLink(profile.referralLink, profile.referralCode) : null,
      code: profile?.referralCode ?? null,
      milestones: Object.fromEntries(Object.entries(REFERRAL_MILESTONES).map(([key, value]) => [key, value.coins])),
      friendStartingBonus: REFERRED_STARTING_BONUS,
      networkDiscount: Math.min(NETWORK_DISCOUNT_MAX, founders * NETWORK_DISCOUNT_PER_FRIEND),
      networkDiscountPerFriend: NETWORK_DISCOUNT_PER_FRIEND,
      networkDiscountMax: NETWORK_DISCOUNT_MAX,
      coinsEarned: paid.reduce((sum, row) => sum + row.amount, 0),
      friends,
      invitedBySomeone: Boolean(myReferral),
    };
  }
}

@Global()
@Module({
  imports: [PrismaModule],
  providers: [CodeStudioReferralsService],
  exports: [CodeStudioReferralsService],
})
export class CodeStudioReferralsModule {}
