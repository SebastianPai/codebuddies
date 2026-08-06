import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async create(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        metadata: input.metadata,
      },
    });
    this.emitCreated(notification);
    return notification;
  }

  emitCreated(notification: {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string | null;
    metadata: Prisma.JsonValue | null;
    readAt: Date | null;
    createdAt: Date;
  }) {
    this.realtimeService.emitToUser(notification.userId, {
      type: 'notification:new',
      payload: { notification: this.enrichNotification(notification) },
    });
  }

  async listForUser(userId: string) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return { items: items.map((item) => this.enrichNotification(item)), unreadCount };
  }

  markRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  private enrichNotification(notification: {
    id: string;
    type: NotificationType;
    title: string;
    body: string | null;
    metadata: Prisma.JsonValue | null;
    readAt: Date | null;
    createdAt: Date;
  }) {
    const metadata =
      notification.metadata && typeof notification.metadata === 'object' && !Array.isArray(notification.metadata)
        ? (notification.metadata as Record<string, unknown>)
        : {};
    const defaults = this.notificationDefaults(notification.type);

    return {
      ...notification,
      category: String(metadata.category ?? defaults.category),
      priority: String(metadata.priority ?? defaults.priority),
      icon: String(metadata.icon ?? defaults.icon),
      link: typeof metadata.link === 'string' ? metadata.link : defaults.link,
      actionLabel: typeof metadata.actionLabel === 'string' ? metadata.actionLabel : defaults.actionLabel,
      relativeTime: this.relativeTime(notification.createdAt),
      read: Boolean(notification.readAt),
    };
  }

  private notificationDefaults(type: NotificationType) {
    if (String(type).startsWith('REFERRAL')) {
      return { category: 'REFERIDOS', priority: 'HIGH', icon: 'Users', link: '/referrals', actionLabel: 'Ver referidos' };
    }
    if (String(type).startsWith('MISSION')) {
      return { category: 'MISIONES', priority: 'HIGH', icon: 'Target', link: '/missions', actionLabel: 'Ver misiones' };
    }
    if (type === 'ACHIEVEMENT_UNLOCKED') {
      return { category: 'LOGROS', priority: 'HIGH', icon: 'Trophy', link: '/achievements', actionLabel: 'Ver logro' };
    }
    if (type === 'NEW_MESSAGE') {
      return { category: 'AMIGOS', priority: 'NORMAL', icon: 'MessageSquare', link: '/messages', actionLabel: 'Abrir' };
    }
    if (type === 'CERTIFICATE_ISSUED') {
      return { category: 'CURSOS', priority: 'NORMAL', icon: 'Award', link: '/certificates', actionLabel: 'Ver certificado' };
    }
    if (type === 'REWARD_GRANTED') {
      return { category: 'RECOMPENSAS', priority: 'HIGH', icon: 'Gift', link: '/rewards', actionLabel: 'Ver recompensa' };
    }
    if (type === 'ROOM_JOIN_REQUEST') {
      return { category: 'SALAS', priority: 'NORMAL', icon: 'DoorOpen', link: '/notifications', actionLabel: 'Ver solicitud' };
    }
    if (type === 'ROOM_JOIN_APPROVED') {
      return { category: 'SALAS', priority: 'NORMAL', icon: 'DoorOpen', link: '/notifications', actionLabel: 'Ver' };
    }
    if (type === 'ROOM_INVITE') {
      return { category: 'SALAS', priority: 'HIGH', icon: 'DoorOpen', link: '/notifications', actionLabel: 'Ver invitación' };
    }
    if (type === 'STREAK_AT_RISK') {
      return { category: 'RACHA', priority: 'HIGH', icon: 'Flame', link: '/dashboard', actionLabel: 'Seguir aprendiendo' };
    }

    return { category: 'SISTEMA', priority: 'NORMAL', icon: 'Bell', link: '/notifications', actionLabel: 'Ver' };
  }

  private relativeTime(date: Date) {
    const seconds = Math.max(Math.floor((Date.now() - date.getTime()) / 1000), 0);
    if (seconds < 60) return 'Ahora';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} d`;
  }
}
