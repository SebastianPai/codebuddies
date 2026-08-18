import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminReconciliationController } from './controllers/admin-reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';

// Solo lee (PrismaService directo, cruzando CertificateOrder/Certificate/
// WebhookEvent/CoinPurchase/CoinTransaction) -- no importa los módulos de
// esos dominios porque no necesita su lógica de negocio, solo consultar sus
// tablas. Evita acoplar este módulo transversal a media app.
@Module({
  imports: [PrismaModule],
  controllers: [AdminReconciliationController],
  providers: [ReconciliationService],
})
export class ReconciliationModule {}
