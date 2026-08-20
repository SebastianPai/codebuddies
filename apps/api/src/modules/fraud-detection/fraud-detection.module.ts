import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminFraudDetectionController } from './controllers/admin-fraud-detection.controller';
import { FraudDetectionService } from './fraud-detection.service';

// Solo lee (mismo criterio que ReconciliationModule): agrupa
// CoinTransaction/XPTransaction directo por PrismaService, sin depender de
// la lógica de negocio de los módulos dueños de esas tablas.
@Module({
  imports: [PrismaModule],
  controllers: [AdminFraudDetectionController],
  providers: [FraudDetectionService],
})
export class FraudDetectionModule {}
