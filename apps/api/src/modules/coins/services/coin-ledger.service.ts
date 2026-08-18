import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { paginate } from '../../../common/dto/pagination.dto';

@Injectable()
export class CoinLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  // CoinTransaction ya ES el ledger (ver AdminUsersService.adjustCoins y
  // MarketplaceService.buyContent, que crean una fila acá en cada
  // movimiento) -- este servicio solo le da lectura paginada/filtrada para
  // el admin, no inventa un modelo nuevo.
  async listForAdmin(page = 1, limit = 50, userId?: string) {
    const where: Prisma.CoinTransactionWhereInput = userId ? { userId } : {};

    const [items, total] = await Promise.all([
      this.prisma.coinTransaction.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, email: true } } },
      }),
      this.prisma.coinTransaction.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  // Para el tab de Economía en User 360: además de listar movimientos,
  // calcula el saldo acumulado hasta cada fila (running balance) contra el
  // saldo actual del usuario, para poder mostrar "tenía X antes de esto".
  async getUserLedger(userId: string, page = 1, limit = 50) {
    const [user, page1] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { coins: true } }),
      this.listForAdmin(page, limit, userId),
    ]);

    return { currentBalance: user?.coins ?? 0, ...page1 };
  }
}
