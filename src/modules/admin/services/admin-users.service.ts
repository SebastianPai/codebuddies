import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CertificateAccessType,
  NotificationType,
  PremiumSubscriptionStatus,
  Role,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AdminUserAction,
  AdminUserActionDto,
} from '../dto/admin-user-action.dto';
import {
  CertificateAccessAction,
  CertificateAccessActionDto,
} from '../dto/certificate-access-action.dto';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listUsers(query = '') {
    return this.prisma.user.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      where: query
        ? {
            OR: [
              { email: { contains: query, mode: 'insensitive' } },
              { username: { contains: query, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        experience: true,
        coins: true,
        level: true,
        streak: true,
        createdAt: true,
        premiumSubscriptions: {
          where: {
            status: PremiumSubscriptionStatus.ACTIVE,
            expiresAt: { gt: new Date() },
          },
          take: 1,
          select: { id: true, expiresAt: true },
        },
        _count: {
          select: {
            certificates: true,
            certificateAccesses: true,
            completions: true,
          },
        },
      },
    });
  }

  async updateUser(userId: string, dto: AdminUserActionDto) {
    switch (dto.action) {
      case AdminUserAction.GRANT_ADMIN:
        return this.prisma.user.update({
          where: { id: userId },
          data: { role: Role.ADMIN },
        });
      case AdminUserAction.REMOVE_ADMIN:
        return this.prisma.user.update({
          where: { id: userId },
          data: { role: Role.STUDENT },
        });
      case AdminUserAction.GRANT_PREMIUM:
        return this.grantPremium(userId);
      case AdminUserAction.REVOKE_PREMIUM:
        return this.prisma.premiumSubscription.updateMany({
          where: { userId, status: PremiumSubscriptionStatus.ACTIVE },
          data: { status: PremiumSubscriptionStatus.CANCELLED },
        });
      case AdminUserAction.ADD_XP:
      case AdminUserAction.REMOVE_XP:
        return this.adjustXp(userId, dto);
      case AdminUserAction.ADD_COINS:
      case AdminUserAction.REMOVE_COINS:
        return this.adjustCoins(userId, dto);
      default:
        throw new BadRequestException('Unsupported action');
    }
  }

  async listCertificateAccesses() {
    return this.prisma.certificateAccess.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, email: true } },
        course: {
          include: {
            translations: { include: { language: true }, take: 3 },
          },
        },
      },
    });
  }

  async updateCertificateAccess(dto: CertificateAccessActionDto) {
    const accessType =
      dto.action === CertificateAccessAction.SIMULATE_PAID
        ? CertificateAccessType.PAID
        : (dto.accessType ?? CertificateAccessType.SCHOLARSHIP);

    if (dto.action === CertificateAccessAction.REVOKE) {
      return this.prisma.certificateAccess.deleteMany({
        where: {
          userId: dto.userId,
          courseId: dto.courseId,
          accessType,
        },
      });
    }

    return this.prisma.certificateAccess.upsert({
      where: {
        userId_courseId_accessType: {
          userId: dto.userId,
          courseId: dto.courseId,
          accessType,
        },
      },
      create: {
        userId: dto.userId,
        courseId: dto.courseId,
        accessType,
      },
      update: { expiresAt: null },
    });
  }

  private async grantPremium(userId: string) {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const subscription = await this.prisma.premiumSubscription.create({
      data: {
        userId,
        status: PremiumSubscriptionStatus.ACTIVE,
        expiresAt,
      },
    });
    await this.notificationsService.create({
      userId,
      type: NotificationType.PREMIUM_ACTIVATED,
      title: 'Premium activated',
      body: 'Premium access has been activated on your account.',
      metadata: { subscriptionId: subscription.id },
    });
    return subscription;
  }

  private adjustXp(userId: string, dto: AdminUserActionDto) {
    const amount = this.signedAmount(dto);
    return this.prisma.$transaction(async (tx) => {
      await tx.xPTransaction.create({
        data: {
          userId,
          amount,
          reason: dto.reason ?? `Admin action: ${dto.action}`,
        },
      });
      return tx.user.update({
        where: { id: userId },
        data: {
          experience:
            amount > 0
              ? { increment: amount }
              : { decrement: Math.abs(amount) },
        },
      });
    });
  }

  private adjustCoins(userId: string, dto: AdminUserActionDto) {
    const amount = this.signedAmount(dto);
    return this.prisma.$transaction(async (tx) => {
      await tx.coinTransaction.create({
        data: {
          userId,
          amount,
          reason: dto.reason ?? `Admin action: ${dto.action}`,
        },
      });
      return tx.user.update({
        where: { id: userId },
        data: {
          coins:
            amount > 0
              ? { increment: amount }
              : { decrement: Math.abs(amount) },
        },
      });
    });
  }

  private signedAmount(dto: AdminUserActionDto) {
    if (!dto.amount) throw new BadRequestException('Amount is required');
    return dto.action.startsWith('REMOVE') ? -dto.amount : dto.amount;
  }
}
