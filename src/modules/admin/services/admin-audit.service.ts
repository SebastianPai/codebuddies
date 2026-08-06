import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { paginate } from '../../../common/dto/pagination.dto';

interface LogAdminActionInput {
  adminId: string;
  action: string;
  targetUserId?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  // Siempre se llama dentro del mismo $transaction que la acción que audita,
  // para que la acción y su registro no puedan divergir (una sin la otra).
  log(tx: Prisma.TransactionClient, input: LogAdminActionInput) {
    return tx.adminActionLog.create({
      data: {
        adminId: input.adminId,
        action: input.action,
        targetUserId: input.targetUserId,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: input.metadata,
      },
    });
  }

  // Variante sin transacción, para acciones administrativas sensibles
  // (borrados de contenido, cambios de estado, revocaciones) cuyo código de
  // negocio no está envuelto en un $transaction propio. La garantía de
  // atomicidad estricta (log() de arriba) queda reservada a mutaciones de
  // dinero/permisos; acá alcanza con "casi siempre junto".
  logStandalone(input: LogAdminActionInput) {
    return this.prisma.adminActionLog.create({
      data: {
        adminId: input.adminId,
        action: input.action,
        targetUserId: input.targetUserId,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: input.metadata,
      },
    });
  }

  async listRecent(page = 1, limit = 50) {
    const [items, total] = await Promise.all([
      this.prisma.adminActionLog.findMany({
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminActionLog.count(),
    ]);
    return paginate(items, total, page, limit);
  }
}
