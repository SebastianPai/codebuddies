import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { CoinPurchasesController } from './controllers/coin-purchases.controller';
import { AdminCoinsController } from './controllers/admin-coins.controller';
import { CoinPurchasesRepository } from './repositories/coin-purchases.repository';
import { CoinPurchasesService } from './services/coin-purchases.service';
import { CoinLedgerService } from './services/coin-ledger.service';

@Module({
  // Reutiliza PAYMENT_PROVIDER de PaymentsModule (mock/Paddle según
  // PADDLE_API_KEY) en vez de duplicar la fábrica de providers -- la compra
  // de coins es, para efectos de checkout, un producto más del mismo
  // proveedor de pagos que ya usan los certificados.
  imports: [PrismaModule, PaymentsModule],
  controllers: [CoinPurchasesController, AdminCoinsController],
  providers: [CoinPurchasesRepository, CoinPurchasesService, CoinLedgerService],
  exports: [CoinPurchasesRepository, CoinPurchasesService, CoinLedgerService],
})
export class CoinsModule {}
