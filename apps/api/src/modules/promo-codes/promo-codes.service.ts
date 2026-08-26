import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  PremiumOrigin,
  PremiumSubscriptionStatus,
  PromoRewardType,
  RewardSourceType,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { PremiumAccessService } from '../premium-access/premium-access.service';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PromoCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamificationService: GamificationService,
    private readonly premiumAccessService: PremiumAccessService,
  ) {}

  create(adminId: string, dto: CreatePromoCodeDto) {
    if (dto.rewardType === PromoRewardType.PREMIUM_DAYS && dto.rewardAmount > 365) {
      throw new BadRequestException('rewardAmount para PREMIUM_DAYS debe ser <= 365 días');
    }

    return this.prisma.promoCode.create({
      data: {
        code: (dto.code ?? this.generateCode()).toUpperCase(),
        name: dto.name,
        description: dto.description,
        rewardType: dto.rewardType,
        rewardAmount: dto.rewardAmount,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        maxRedemptions: dto.maxRedemptions,
        createdById: adminId,
      },
    });
  }

  list() {
    return this.prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
  }

  deactivate(id: string) {
    return this.prisma.promoCode.update({
      where: { id },
      data: { active: false },
    });
  }

  // Canje self-service por código: valida vigencia/cupo bajo carrera (ver
  // comentarios en cada guarda) y entrega la recompensa vía el mismo camino
  // que el regalo directo de cumpleaños (applyReward).
  async redeem(code: string, userId: string) {
    const normalizedCode = code.trim().toUpperCase();

    return this.prisma.$transaction(async (tx) => {
      const promoCode = await tx.promoCode.findUnique({
        where: { code: normalizedCode },
      });

      if (!promoCode || !promoCode.active) {
        throw new NotFoundException('Código de promoción inválido');
      }
      if (promoCode.expiresAt && promoCode.expiresAt < new Date()) {
        throw new BadRequestException('Este código ya venció');
      }

      // Guarda #1: un canje por usuario por código. El insert único es la
      // guarda real contra una carrera de doble canje, mismo patrón que
      // BattlePassClaim -- no un chequeo previo que pueda perder la carrera.
      try {
        await tx.promoCodeRedemption.create({
          data: { promoCodeId: promoCode.id, userId },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new BadRequestException('Ya canjeaste este código');
        }
        throw error;
      }

      // Guarda #2: cupo máximo, a prueba de carrera vía update condicional
      // (en vez de leer redeemedCount y comparar antes de escribir, que
      // podría perder contra otro canje concurrente).
      const updated = await tx.promoCode.updateMany({
        where: {
          id: promoCode.id,
          active: true,
          OR: [{ maxRedemptions: null }, { redeemedCount: { lt: promoCode.maxRedemptions ?? 0 } }],
        },
        data: { redeemedCount: { increment: 1 } },
      });
      if (updated.count === 0) {
        throw new BadRequestException('Este código ya alcanzó su cupo máximo de canjes');
      }

      const granted = await this.applyReward(
        tx,
        userId,
        promoCode.rewardType,
        promoCode.rewardAmount,
        RewardSourceType.SPECIAL,
        promoCode.id,
        promoCode.name,
      );

      return { promoCode, granted };
    });
  }

  // Regalo directo sin código: lo usa el cron de cumpleaños. Comparte la
  // misma lógica de entrega que redeem() (applyReward) para no duplicar el
  // otorgamiento de monedas/premium en dos lugares distintos.
  grantDirect(
    tx: Prisma.TransactionClient,
    userId: string,
    rewardType: PromoRewardType,
    rewardAmount: number,
    sourceType: RewardSourceType,
    sourceId: string,
    sourceLabel: string,
  ) {
    return this.applyReward(tx, userId, rewardType, rewardAmount, sourceType, sourceId, sourceLabel);
  }

  private async applyReward(
    tx: Prisma.TransactionClient,
    userId: string,
    rewardType: PromoRewardType,
    rewardAmount: number,
    sourceType: RewardSourceType,
    sourceId: string,
    sourceLabel: string,
  ) {
    if (rewardType === PromoRewardType.COINS) {
      return this.gamificationService.grantRewards(tx, userId, sourceType, sourceId, sourceLabel, [
        { type: 'COINS', amount: rewardAmount, label: sourceLabel },
      ]);
    }

    // PREMIUM_DAYS: si ya tiene premium activo, extiende esa fila; si no,
    // crea una nueva con origin PROMO (nunca se mezcla con ADMIN/PAYMENT,
    // ver comentario en el enum PremiumOrigin del schema).
    const hasPremium = await this.premiumAccessService.hasPremiumAccess(userId, tx);
    if (hasPremium) {
      const active = await tx.premiumSubscription.findFirst({
        where: { userId, status: PremiumSubscriptionStatus.ACTIVE, expiresAt: { gt: new Date() } },
        orderBy: { expiresAt: 'desc' },
      });
      if (active) {
        return tx.premiumSubscription.update({
          where: { id: active.id },
          data: { expiresAt: new Date(active.expiresAt.getTime() + rewardAmount * DAY_MS) },
        });
      }
    }

    return tx.premiumSubscription.create({
      data: {
        userId,
        status: PremiumSubscriptionStatus.ACTIVE,
        origin: PremiumOrigin.PROMO,
        expiresAt: new Date(Date.now() + rewardAmount * DAY_MS),
        reason: sourceLabel,
      },
    });
  }

  private generateCode(): string {
    return randomBytes(5).toString('hex').toUpperCase();
  }
}
