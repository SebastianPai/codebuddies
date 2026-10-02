import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { AdminBoostsController, BoostsController } from './boosts.controller';
import { CoinBoostsService } from './coin-boosts.service';

// Global: el multiplicador lo usan módulos de recompensas (progreso,
// gamificación) y el webhook de Paddle; así ninguno tiene que importarlo.
@Global()
@Module({
  imports: [PrismaModule, PaymentsModule],
  controllers: [BoostsController, AdminBoostsController],
  providers: [CoinBoostsService],
  exports: [CoinBoostsService],
})
export class BoostsModule {}
