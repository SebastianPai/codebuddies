import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminWebhookEventsController } from './controllers/admin-webhook-events.controller';
import { WebhookEventsRepository } from './webhook-events.repository';
import { WebhookEventsService } from './webhook-events.service';

// Módulo genérico, sin conocimiento de ningún provider concreto -- lo usan
// PaddleWebhookModule (para loggear/idempotizar sus eventos) y el futuro
// ReconciliationModule (para leer el estado de los webhooks). No importa
// ningún módulo de dominio (Payments/Subscriptions/etc.), así que puede ser
// importado libremente sin riesgo de ciclos.
@Module({
  imports: [PrismaModule],
  controllers: [AdminWebhookEventsController],
  providers: [WebhookEventsRepository, WebhookEventsService],
  exports: [WebhookEventsRepository, WebhookEventsService],
})
export class WebhooksModule {}
