import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CertificateAccessType,
  NotificationType,
  PremiumSubscriptionStatus,
  Role,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { paginate } from '../../../common/dto/pagination.dto';
import {
  AdminUserAction,
  AdminUserActionDto,
} from '../dto/admin-user-action.dto';
import {
  CertificateAccessAction,
  CertificateAccessActionDto,
} from '../dto/certificate-access-action.dto';
import { NotificationsService } from '../../notifications/notifications.service';
import { AdminAuditService } from './admin-audit.service';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly adminAudit: AdminAuditService,
  ) {}

  async listUsers(query = '', page = 1, limit = 20) {
    const where = query
      ? {
          OR: [
            { email: { contains: query, mode: 'insensitive' as const } },
            { username: { contains: query, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
        where,
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
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async updateUser(adminId: string, userId: string, dto: AdminUserActionDto) {
    switch (dto.action) {
      case AdminUserAction.GRANT_ADMIN:
        return this.prisma.$transaction(async (tx) => {
          const user = await tx.user.update({
            where: { id: userId },
            data: { role: Role.ADMIN },
          });
          await this.adminAudit.log(tx, {
            adminId,
            action: dto.action,
            targetUserId: userId,
            targetType: 'User',
            targetId: userId,
          });
          return user;
        });
      case AdminUserAction.REMOVE_ADMIN:
        return this.prisma.$transaction(async (tx) => {
          const user = await tx.user.update({
            where: { id: userId },
            data: { role: Role.STUDENT },
          });
          await this.adminAudit.log(tx, {
            adminId,
            action: dto.action,
            targetUserId: userId,
            targetType: 'User',
            targetId: userId,
          });
          return user;
        });
      case AdminUserAction.GRANT_PREMIUM:
        return this.grantPremium(adminId, userId);
      case AdminUserAction.REVOKE_PREMIUM:
        return this.prisma.$transaction(async (tx) => {
          const result = await tx.premiumSubscription.updateMany({
            where: { userId, status: PremiumSubscriptionStatus.ACTIVE },
            data: { status: PremiumSubscriptionStatus.CANCELLED },
          });
          await this.adminAudit.log(tx, {
            adminId,
            action: dto.action,
            targetUserId: userId,
            targetType: 'PremiumSubscription',
          });
          return result;
        });
      case AdminUserAction.ADD_XP:
      case AdminUserAction.REMOVE_XP:
        return this.adjustXp(adminId, userId, dto);
      case AdminUserAction.ADD_COINS:
      case AdminUserAction.REMOVE_COINS:
        return this.adjustCoins(adminId, userId, dto);
      default:
        throw new BadRequestException('Unsupported action');
    }
  }

  async listCertificateAccesses(page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      this.prisma.certificateAccess.findMany({
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true } },
          course: {
            include: {
              translations: { include: { language: true }, take: 3 },
            },
          },
        },
      }),
      this.prisma.certificateAccess.count(),
    ]);

    return paginate(items, total, page, limit);
  }

  async updateCertificateAccess(
    adminId: string,
    dto: CertificateAccessActionDto,
  ) {
    const accessType =
      dto.action === CertificateAccessAction.SIMULATE_PAID
        ? CertificateAccessType.PAID
        : (dto.accessType ?? CertificateAccessType.SCHOLARSHIP);

    return this.prisma.$transaction(async (tx) => {
      let result;

      if (dto.action === CertificateAccessAction.REVOKE) {
        result = await tx.certificateAccess.deleteMany({
          where: {
            userId: dto.userId,
            courseId: dto.courseId,
            accessType,
          },
        });
      } else {
        result = await tx.certificateAccess.upsert({
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

      await this.adminAudit.log(tx, {
        adminId,
        action: `CERTIFICATE_ACCESS_${dto.action}`,
        targetUserId: dto.userId,
        targetType: 'Course',
        targetId: dto.courseId,
        metadata: { accessType },
      });

      return result;
    });
  }

  private async grantPremium(adminId: string, userId: string) {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const subscription = await this.prisma.$transaction(async (tx) => {
      const created = await tx.premiumSubscription.create({
        data: {
          userId,
          status: PremiumSubscriptionStatus.ACTIVE,
          expiresAt,
        },
      });
      await this.adminAudit.log(tx, {
        adminId,
        action: AdminUserAction.GRANT_PREMIUM,
        targetUserId: userId,
        targetType: 'PremiumSubscription',
        targetId: created.id,
      });
      return created;
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

  private adjustXp(adminId: string, userId: string, dto: AdminUserActionDto) {
    const amount = this.signedAmount(dto);
    return this.prisma.$transaction(async (tx) => {
      await tx.xPTransaction.create({
        data: {
          userId,
          amount,
          reason: dto.reason ?? `Admin action: ${dto.action}`,
        },
      });
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          experience:
            amount > 0
              ? { increment: amount }
              : { decrement: Math.abs(amount) },
        },
      });
      await this.adminAudit.log(tx, {
        adminId,
        action: dto.action,
        targetUserId: userId,
        targetType: 'User',
        metadata: { amount, reason: dto.reason },
      });
      return user;
    });
  }

  private adjustCoins(
    adminId: string,
    userId: string,
    dto: AdminUserActionDto,
  ) {
    const amount = this.signedAmount(dto);
    return this.prisma.$transaction(async (tx) => {
      await tx.coinTransaction.create({
        data: {
          userId,
          amount,
          reason: dto.reason ?? `Admin action: ${dto.action}`,
        },
      });
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          coins:
            amount > 0
              ? { increment: amount }
              : { decrement: Math.abs(amount) },
        },
      });
      await this.adminAudit.log(tx, {
        adminId,
        action: dto.action,
        targetUserId: userId,
        targetType: 'User',
        metadata: { amount, reason: dto.reason },
      });
      return user;
    });
  }

  private signedAmount(dto: AdminUserActionDto) {
    if (!dto.amount) throw new BadRequestException('Amount is required');
    return dto.action.startsWith('REMOVE') ? -dto.amount : dto.amount;
  }
}
