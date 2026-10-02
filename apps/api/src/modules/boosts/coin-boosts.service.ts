import { BadRequestException, Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { CoinBoostScope, CoinPurchaseStatus, Currency, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PAYMENT_PROVIDER } from '../payments/types/payment-provider.types';
import type { PaymentProvider } from '../payments/types/payment-provider.types';
import { getActivePaymentProviderType } from '../payments/utils/active-payment-provider.util';
import { BOOST_PACKAGES, BOOST_PRODUCT_ENV, MAX_COIN_MULTIPLIER, boostedCoins, findBoostPackage } from './boost-packages';

type Db = PrismaService | Prisma.TransactionClient;

// El boost comunitario lo consulta cada recompensa de cualquier jugador:
// se cachea unos segundos para no sumar una query por cada moneda ganada.
const COMMUNITY_CACHE_MS = 15_000;

@Injectable()
export class CoinBoostsService {
  private readonly logger = new Logger(CoinBoostsService.name);
  private communityCache: { at: number; multiplier: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
  ) {}

  catalog() {
    return {
      // Sin product de Paddle configurado (y con Paddle activo) no se puede
      // cobrar: la web muestra los boosts como "pronto" en vez de fallar.
      available: !process.env.PADDLE_API_KEY || !!process.env[BOOST_PRODUCT_ENV],
      maxMultiplier: MAX_COIN_MULTIPLIER,
      packages: BOOST_PACKAGES.map(({ key, scope, multiplier, durationMinutes, priceUsd }) => ({ key, scope, multiplier, durationMinutes, priceUsd })),
    };
  }

  // ─── Multiplicador ────────────────────────────────────────────────────

  async multiplierFor(userId: string, db: Db = this.prisma) {
    const now = new Date();
    const [personal, community] = await Promise.all([
      db.coinBoost.findFirst({
        where: { userId, scope: CoinBoostScope.PERSONAL, status: CoinPurchaseStatus.COMPLETED, startsAt: { lte: now }, endsAt: { gt: now } },
        select: { multiplier: true },
      }),
      this.communityMultiplier(db, now),
    ]);
    return Math.min(MAX_COIN_MULTIPLIER, (personal?.multiplier ?? 1) * community);
  }

  private async communityMultiplier(db: Db, now: Date) {
    if (this.communityCache && Date.now() - this.communityCache.at < COMMUNITY_CACHE_MS) return this.communityCache.multiplier;
    const active = await db.coinBoost.findFirst({
      where: { scope: CoinBoostScope.COMMUNITY, status: CoinPurchaseStatus.COMPLETED, startsAt: { lte: now }, endsAt: { gt: now } },
      select: { multiplier: true },
    });
    const multiplier = active?.multiplier ?? 1;
    this.communityCache = { at: Date.now(), multiplier };
    return multiplier;
  }

  /**
   * Suma el extra del boost a monedas que el usuario YA recibió (base).
   * Va como movimiento aparte en el ledger (`boost:`) para que se vea
   * cuánto vino del boost. Devuelve el extra entregado (0 sin boost).
   */
  async grantBonus(tx: Prisma.TransactionClient, userId: string, baseCoins: number, label: string) {
    if (baseCoins <= 0) return 0;
    const multiplier = await this.multiplierFor(userId, tx);
    const extra = boostedCoins(baseCoins, multiplier) - baseCoins;
    if (extra <= 0) return 0;
    await tx.user.update({ where: { id: userId }, data: { coins: { increment: extra } } });
    await tx.coinTransaction.create({ data: { userId, amount: extra, reason: `boost:x${multiplier}:${label}`.slice(0, 190) } });
    return extra;
  }

  // ─── Estado público ───────────────────────────────────────────────────

  async status(userId?: string) {
    const now = new Date();
    const [community, personal] = await Promise.all([
      this.prisma.coinBoost.findFirst({
        where: { scope: CoinBoostScope.COMMUNITY, status: CoinPurchaseStatus.COMPLETED, startsAt: { lte: now }, endsAt: { gt: now } },
        orderBy: { startsAt: 'asc' },
        select: { multiplier: true, endsAt: true, user: { select: { id: true, username: true, avatarUrl: true } } },
      }),
      userId
        ? this.prisma.coinBoost.findFirst({
            where: { userId, scope: CoinBoostScope.PERSONAL, status: CoinPurchaseStatus.COMPLETED, startsAt: { lte: now }, endsAt: { gt: now } },
            select: { multiplier: true, endsAt: true },
          })
        : null,
    ]);
    // Cuánto falta encadenado: si hay más boosts comunitarios en cola, el
    // final real es el del último.
    const communityQueueEnd = community
      ? await this.prisma.coinBoost.aggregate({
          where: { scope: CoinBoostScope.COMMUNITY, status: CoinPurchaseStatus.COMPLETED, endsAt: { gt: now } },
          _max: { endsAt: true },
        })
      : null;
    const multiplier = Math.min(MAX_COIN_MULTIPLIER, (personal?.multiplier ?? 1) * (community?.multiplier ?? 1));
    return {
      multiplier,
      community: community
        ? {
            multiplier: community.multiplier,
            endsAt: community.endsAt,
            queueEndsAt: communityQueueEnd?._max.endsAt ?? community.endsAt,
            sponsor: community.user,
          }
        : null,
      personal: personal ? { multiplier: personal.multiplier, endsAt: personal.endsAt } : null,
    };
  }

  /** Ids de quienes hoy son Mecenas (boost comunitario activo o en cola). */
  async activeSponsorIds() {
    const rows = await this.prisma.coinBoost.findMany({
      where: { scope: CoinBoostScope.COMMUNITY, status: CoinPurchaseStatus.COMPLETED, endsAt: { gt: new Date() } },
      select: { userId: true },
    });
    return new Set(rows.map((row) => row.userId));
  }

  // ─── Compra ───────────────────────────────────────────────────────────

  async purchase(userId: string, packageKey: string, customerEmail?: string) {
    const pkg = findBoostPackage(packageKey);
    if (!pkg) throw new NotFoundException('Boost not found');
    if (!this.catalog().available) throw new ServiceUnavailableException('Boosts are not available yet');

    const boost = await this.prisma.coinBoost.create({
      data: {
        userId,
        scope: pkg.scope,
        package: pkg.key,
        multiplier: pkg.multiplier,
        durationMinutes: pkg.durationMinutes,
        amount: pkg.priceUsd,
        currency: Currency.USD,
        provider: getActivePaymentProviderType(),
      },
    });

    const checkout = await this.paymentProvider.createCheckout({
      orderId: boost.id,
      amount: pkg.priceUsd,
      currency: Currency.USD,
      description: pkg.scope === CoinBoostScope.COMMUNITY ? `Community coin boost x${pkg.multiplier} (1h)` : `Coin boost x${pkg.multiplier} (24h)`,
      kind: 'coin_boost',
      productIdEnvVar: BOOST_PRODUCT_ENV,
      customerEmail,
    });

    await this.prisma.coinBoost.update({ where: { id: boost.id }, data: { providerTransactionId: checkout.providerPaymentId } });
    return { boost: { id: boost.id, package: boost.package, status: boost.status }, checkout };
  }

  async getUserBoost(id: string, userId: string) {
    const boost = await this.prisma.coinBoost.findUnique({ where: { id } });
    if (!boost || boost.userId !== userId) throw new NotFoundException('Boost not found');
    return boost;
  }

  /**
   * Activa un boost pagado. Idempotente: el UPDATE ... WHERE status=PENDING
   * es un compare-and-swap, así que dos webhooks del mismo pago activan una
   * sola vez. Encadena después del último boost del mismo alcance.
   */
  async activate(boostId: string, providerTransactionId: string | null) {
    return this.prisma.$transaction(
      async (tx) => {
        const boost = await tx.coinBoost.findUnique({ where: { id: boostId } });
        if (!boost) {
          this.logger.warn(`CoinBoost ${boostId} no encontrado`);
          return null;
        }
        if (boost.status !== CoinPurchaseStatus.PENDING) return boost;

        const startsAt = await this.queueStart(tx, boost.scope, boost.userId);
        const endsAt = new Date(startsAt.getTime() + boost.durationMinutes * 60_000);
        const moved = await tx.coinBoost.updateMany({
          where: { id: boostId, status: CoinPurchaseStatus.PENDING },
          data: {
            status: CoinPurchaseStatus.COMPLETED,
            completedAt: new Date(),
            startsAt,
            endsAt,
            ...(providerTransactionId ? { providerTransactionId } : {}),
          },
        });
        if (moved.count === 0) return tx.coinBoost.findUnique({ where: { id: boostId } });
        this.communityCache = null;
        return tx.coinBoost.findUnique({ where: { id: boostId } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /** Regalo de admin (promos, eventos, compensaciones): sin pago. */
  async gift(userId: string, packageKey: string) {
    const pkg = findBoostPackage(packageKey);
    if (!pkg) throw new BadRequestException('Unknown boost package');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');
    const boost = await this.prisma.coinBoost.create({
      data: {
        userId,
        scope: pkg.scope,
        package: pkg.key,
        multiplier: pkg.multiplier,
        durationMinutes: pkg.durationMinutes,
        amount: 0,
        gifted: true,
        provider: getActivePaymentProviderType(),
      },
    });
    return this.activate(boost.id, null);
  }

  markFailed(boostId: string) {
    return this.prisma.coinBoost.updateMany({
      where: { id: boostId, status: CoinPurchaseStatus.PENDING },
      data: { status: CoinPurchaseStatus.FAILED },
    });
  }

  private async queueStart(tx: Prisma.TransactionClient, scope: CoinBoostScope, userId: string) {
    const now = new Date();
    const last = await tx.coinBoost.aggregate({
      where: {
        scope,
        status: CoinPurchaseStatus.COMPLETED,
        endsAt: { gt: now },
        ...(scope === CoinBoostScope.PERSONAL ? { userId } : {}),
      },
      _max: { endsAt: true },
    });
    return last._max.endsAt && last._max.endsAt > now ? last._max.endsAt : now;
  }
}
