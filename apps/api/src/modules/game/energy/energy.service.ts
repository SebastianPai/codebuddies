import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface EnergyStatus {
  current: number;
  max: number;
  regenMinutes: number;
  // null cuando ya está al máximo (no hay próximo tick que esperar).
  nextRegenAt: string | null;
}

@Injectable()
export class EnergyService {
  private readonly MAX_ENERGY = 5;
  private readonly REGEN_MINUTES = 30;

  constructor(private prisma: PrismaService) {}

  // Antes acá se usaba `user.updatedAt` (el timestamp genérico de la fila,
  // que Prisma pisa en CUALQUIER escritura del usuario: cambiar de nombre,
  // sumar coins, actualizar el avatar, el login streak diario...) como
  // referencia para calcular cuánta energía se regeneró. Cada una de esas
  // escrituras ajenas reiniciaba el reloj de regeneración sin que el
  // jugador hubiera gastado ni recuperado energía real. `energyUpdatedAt`
  // es un campo dedicado que solo este servicio toca, así que el cálculo de
  // acá en más refleja el tiempo real transcurrido desde el último cambio
  // de energía.
  private computeRegenerated(energy: number, energyUpdatedAt: Date, now: Date) {
    const diffMinutes = (now.getTime() - energyUpdatedAt.getTime()) / 1000 / 60;
    const regenerated = Math.floor(diffMinutes / this.REGEN_MINUTES);
    return Math.min(this.MAX_ENERGY - energy, Math.max(0, regenerated));
  }

  // Lectura de solo consulta (no gasta ni persiste nada) — para mostrar el
  // estado real en la UI (ver player:stats) sin efectos secundarios.
  async getStatus(userId: string): Promise<EnergyStatus> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { energy: true, energyUpdatedAt: true },
    });
    if (!user) throw new BadRequestException('User not found');

    const now = new Date();
    const regenerated = this.computeRegenerated(user.energy, user.energyUpdatedAt, now);
    const current = Math.min(this.MAX_ENERGY, user.energy + regenerated);

    const nextRegenAt =
      current >= this.MAX_ENERGY
        ? null
        : new Date(
            user.energyUpdatedAt.getTime() + (regenerated + 1) * this.REGEN_MINUTES * 60 * 1000,
          ).toISOString();

    return {
      current,
      max: this.MAX_ENERGY,
      regenMinutes: this.REGEN_MINUTES,
      nextRegenAt,
    };
  }

  // Regenera y consume 1 punto de energía en una sola operación atómica.
  // Antes esto eran dos pasos (regenerate() calculaba un valor "efectivo"
  // sin persistirlo, luego consume() lo escribía como valor absoluto): dos
  // peticiones concurrentes podían regenerar y consumir la "misma" energía
  // dos veces. El WHERE con energy/energyUpdatedAt actúa como
  // compare-and-swap: solo aplica si la fila no cambió desde que la leímos.
  async regenerateAndConsume(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const now = new Date();
    const regenerated = this.computeRegenerated(user.energy, user.energyUpdatedAt, now);
    const currentEnergy = Math.min(this.MAX_ENERGY, user.energy + regenerated);

    if (currentEnergy <= 0) {
      throw new BadRequestException('No energy available');
    }

    // Solo se mueve el reloj hacia adelante si de verdad hubo ticks de
    // regeneración — si no, se conserva el mismo energyUpdatedAt para no
    // perder el progreso parcial hacia el próximo punto.
    const newEnergyUpdatedAt =
      regenerated > 0
        ? new Date(user.energyUpdatedAt.getTime() + regenerated * this.REGEN_MINUTES * 60 * 1000)
        : user.energyUpdatedAt;

    const result = await this.prisma.user.updateMany({
      where: { id: userId, energy: user.energy, energyUpdatedAt: user.energyUpdatedAt },
      data: { energy: currentEnergy - 1, energyUpdatedAt: newEnergyUpdatedAt },
    });

    if (result.count === 0) {
      throw new ConflictException(
        'No se pudo consumir energía, intenta de nuevo',
      );
    }

    return currentEnergy;
  }
}
