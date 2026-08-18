import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CoinPurchaseStatus, Currency } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CoinPurchasesRepository } from '../repositories/coin-purchases.repository';
import { PAYMENT_PROVIDER } from '../../payments/types/payment-provider.types';
import type { PaymentProvider } from '../../payments/types/payment-provider.types';
import { PurchaseCoinsDto } from '../dto/purchase-coins.dto';
import { findCoinPackage } from '../constants/coin-packages';

@Injectable()
export class CoinPurchasesService {
  private readonly logger = new Logger(CoinPurchasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: CoinPurchasesRepository,
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: PaymentProvider,
  ) {}

  async getUserPurchase(id: string, userId: string) {
    const purchase = await this.repository.findById(id);
    if (!purchase || purchase.userId !== userId) {
      throw new NotFoundException('Coin purchase not found');
    }
    return purchase;
  }

  // Igual que PaymentsService.purchaseCertificate: precio y cantidad de
  // coins se resuelven server-side desde el catálogo, nunca desde el
  // cliente -- evita que alguien manipule el monto a cobrar o los coins a
  // recibir.
  async purchaseCoins(
    userId: string,
    dto: PurchaseCoinsDto,
    customerEmail?: string,
  ) {
    const coinPackage = findCoinPackage(dto.packageKey);
    if (!coinPackage) {
      throw new NotFoundException('Coin package not found');
    }

    const purchase = await this.repository.create({
      userId,
      package: coinPackage.key,
      coins: coinPackage.coins,
      amount: coinPackage.priceUsd,
      currency: Currency.USD,
      status: CoinPurchaseStatus.PENDING,
    });

    const checkout = await this.paymentProvider.createCheckout({
      orderId: purchase.id,
      amount: coinPackage.priceUsd,
      currency: Currency.USD,
      description: `${coinPackage.coins} coins`,
      kind: 'coin_purchase',
      priceIdEnvVar: coinPackage.paddlePriceEnvVar,
      customerEmail,
    });

    await this.repository.updateProviderTransactionId(
      purchase.id,
      checkout.providerPaymentId,
    );

    return { purchase, checkout };
  }

  // Entrega idempotente de las monedas: el UPDATE...WHERE status=PENDING es
  // un compare-and-swap real -- si dos deliveries del mismo webhook (o dos
  // eventos distintos apuntando a la misma compra) llegan a la vez, sólo
  // uno de los dos logra transicionar PENDING -> COMPLETED y por lo tanto
  // sólo uno entrega coins. El segundo ve 0 filas afectadas y no hace nada.
  async completePurchase(
    coinPurchaseId: string,
    providerTransactionId: string | null,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.coinPurchase.findUnique({
        where: { id: coinPurchaseId },
      });
      if (!purchase) {
        this.logger.warn(`CoinPurchase ${coinPurchaseId} no encontrada`);
        return null;
      }

      const transitioned = await tx.coinPurchase.updateMany({
        where: { id: coinPurchaseId, status: CoinPurchaseStatus.PENDING },
        data: {
          status: CoinPurchaseStatus.COMPLETED,
          completedAt: new Date(),
          ...(providerTransactionId ? { providerTransactionId } : {}),
        },
      });

      if (transitioned.count === 0) {
        this.logger.debug(
          `CoinPurchase ${coinPurchaseId} ya estaba en estado ${purchase.status} -- no se vuelven a entregar coins`,
        );
        return purchase;
      }

      await tx.user.update({
        where: { id: purchase.userId },
        data: { coins: { increment: purchase.coins } },
      });

      await tx.coinTransaction.create({
        data: {
          userId: purchase.userId,
          amount: purchase.coins,
          reason: `coinpurchase:${purchase.id}`,
        },
      });

      return tx.coinPurchase.findUnique({ where: { id: coinPurchaseId } });
    });
  }

  markFailed(coinPurchaseId: string) {
    return this.prisma.coinPurchase.updateMany({
      where: { id: coinPurchaseId, status: CoinPurchaseStatus.PENDING },
      data: { status: CoinPurchaseStatus.FAILED },
    });
  }
}
