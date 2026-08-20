import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type FraudAlertType = 'XP_SPIKE_24H' | 'COIN_SPIKE_24H';

export interface FraudAlert {
  type: FraudAlertType;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  data: Record<string, unknown>;
}

// Umbrales heurísticos (no una fórmula "oficial" del juego): un usuario
// normal gana XP/coins en decenas o cientos por día vía lecciones y
// ejercicios (ver ProgressService), así que ganar miles en 24h ya es fuera
// de lo esperable y vale la pena que un admin lo revise -- no significa
// automáticamente que sea trampa, por eso la severidad es MEDIUM y no HIGH.
//
// Nota: NO incluye un chequeo de "balance guardado vs suma del ledger"
// (User.coins/experience contra CoinTransaction/XPTransaction) porque hoy
// existen compras legítimas históricas (fondos de sala, items de la
// tienda) que restaban coins sin escribir ledger -- ya corregido para
// compras nuevas (ver BackgroundsService/ItemsService), pero el historial
// viejo seguiría marcando falsos positivos en cada usuario que compró algo
// antes de este fix. Agregar ese chequeo requiere primero decidir cómo
// tratar (o hacer backfill de) esas compras históricas.
const XP_SPIKE_THRESHOLD_24H = 5000;
const COIN_SPIKE_THRESHOLD_24H = 5000;

@Injectable()
export class FraudDetectionService {
  constructor(private readonly prisma: PrismaService) {}

  async getAlerts(): Promise<{
    alerts: FraudAlert[];
    summary: Record<FraudAlertType, number>;
  }> {
    const [xpSpikes, coinSpikes] = await Promise.all([
      this.findXpSpikes(),
      this.findCoinSpikes(),
    ]);

    const alerts: FraudAlert[] = [...xpSpikes, ...coinSpikes];

    const summary: Record<FraudAlertType, number> = {
      XP_SPIKE_24H: xpSpikes.length,
      COIN_SPIKE_24H: coinSpikes.length,
    };

    return { alerts, summary };
  }

  private async findXpSpikes(): Promise<FraudAlert[]> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const grouped = await this.prisma.xPTransaction.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since }, amount: { gt: 0 } },
      _sum: { amount: true },
    });
    const spikes = grouped.filter(
      (g) => (g._sum.amount ?? 0) > XP_SPIKE_THRESHOLD_24H,
    );
    if (spikes.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: spikes.map((s) => s.userId) } },
      select: {
        id: true,
        username: true,
        email: true,
        level: true,
        experience: true,
      },
    });
    const userById = new Map(users.map((u) => [u.id, u]));

    return spikes
      .sort((a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0))
      .map((s) => {
        const user = userById.get(s.userId);
        return {
          type: 'XP_SPIKE_24H' as const,
          severity: 'MEDIUM' as const,
          description: `${user?.username ?? s.userId} ganó ${s._sum.amount} XP en las últimas 24h`,
          data: {
            userId: s.userId,
            username: user?.username,
            email: user?.email,
            xpGained24h: s._sum.amount,
            currentLevel: user?.level,
            currentExperience: user?.experience,
          },
        };
      });
  }

  private async findCoinSpikes(): Promise<FraudAlert[]> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const grouped = await this.prisma.coinTransaction.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since }, amount: { gt: 0 } },
      _sum: { amount: true },
    });
    const spikes = grouped.filter(
      (g) => (g._sum.amount ?? 0) > COIN_SPIKE_THRESHOLD_24H,
    );
    if (spikes.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: spikes.map((s) => s.userId) } },
      select: { id: true, username: true, email: true, coins: true },
    });
    const userById = new Map(users.map((u) => [u.id, u]));

    return spikes
      .sort((a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0))
      .map((s) => {
        const user = userById.get(s.userId);
        return {
          type: 'COIN_SPIKE_24H' as const,
          severity: 'MEDIUM' as const,
          description: `${user?.username ?? s.userId} ganó ${s._sum.amount} monedas en las últimas 24h`,
          data: {
            userId: s.userId,
            username: user?.username,
            email: user?.email,
            coinsGained24h: s._sum.amount,
            currentBalance: user?.coins,
          },
        };
      });
  }
}
