// src/modules/apps/apps.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppType, AppStatus, SubscriptionType } from '@prisma/client';
import { AppValidationService } from './app-validation.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: AppValidationService,
  ) {}

  // Verificar si el usuario puede crear más apps según su suscripción
  async canCreateApp(userId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, active: true },
      orderBy: { expiresAt: 'desc' },
    });

    const count = await this.prisma.app.count({
      where: { ownerId: userId },
    });

    if (!sub || sub.type === SubscriptionType.FREE) return count < 3;
    if (sub.type === SubscriptionType.PREMIUM) return count < 5;
    if (sub.type === SubscriptionType.VIP) return true;

    return false;
  }

  // Crear una nueva app
  async createApp(userId: string, type: AppType) {
    const canCreate = await this.canCreateApp(userId);

    if (!canCreate) {
      throw new BadRequestException(
        'Límite de apps alcanzado según tu suscripción',
      );
    }

    return this.prisma.app.create({
      data: {
        ownerId: userId,
        type,
        logic: {
          nodes: [],
          edges: [],
        }, // ← Estructura lista para React Flow
        status: AppStatus.DRAFT,
        revenue: 0,
        retention: 0,
      },
    });
  }

  // Actualizar la lógica (el grafo)
  async updateLogic(appId: string, logic: any) {
    const app = await this.prisma.app.findUnique({
      where: { id: appId },
    });

    if (!app) throw new NotFoundException('App no encontrada');

    if (app.status === AppStatus.PUBLISHED) {
      throw new BadRequestException(
        'No puedes editar la lógica de una app ya publicada',
      );
    }

    // Validación ligera antes de guardar
    if (logic && logic.nodes) {
      if (logic.nodes.length > 50) {
        throw new BadRequestException('Demasiados nodos (máximo 50 por app)');
      }
    }

    return this.prisma.app.update({
      where: { id: appId },
      data: {
        logic,
        updatedAt: new Date(),
      },
    });
  }

  // Publicar la app
  async publishApp(appId: string) {
    const app = await this.prisma.app.findUnique({
      where: { id: appId },
    });

    if (!app) throw new NotFoundException('App no encontrada');

    const result = this.validation.validate(app.logic);

    if (!result.valid) {
      throw new BadRequestException(
        `App inválida: ${result.errors.join(', ')}`,
      );
    }

    return this.prisma.app.update({
      where: { id: appId },
      data: {
        status: AppStatus.PUBLISHED,
        updatedAt: new Date(),
      },
    });
  }

  // Obtener apps del usuario
  async getUserApps(userId: string) {
    return this.prisma.app.findMany({
      where: { ownerId: userId },
      include: {
        metrics: true,
        snapshots: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        translations: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Obtener una app por ID (con todo el detalle)
  async getAppById(appId: string) {
    const app = await this.prisma.app.findUnique({
      where: { id: appId },
      include: {
        metrics: true,
        snapshots: {
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        translations: true,
      },
    });

    if (!app) throw new NotFoundException('App no encontrada');

    return app;
  }

  // Obtener apps publicadas (para leaderboard o mercado futuro)
  async getPublishedApps() {
    return this.prisma.app.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        type: true,
        activeUsers: true,
        successRate: true,
        revenue: true,
        retention: true,
        avgRating: true,
        owner: {
          select: { username: true },
        },
      },
      orderBy: { activeUsers: 'desc' },
      take: 50,
    });
  }
}
