import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CertificateAccessType,
  NotificationType,
  PremiumOrigin,
  PremiumSubscriptionStatus,
  Prisma,
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

// Todo tx.user.update() de este servicio debe usar esto -- sin él, Prisma
// devuelve el registro completo (incluyendo el hash bcrypt de password) y
// eso terminaba viajando tal cual como respuesta HTTP de PATCH
// /admin/users/:id, aunque ningún frontend lo usa (ambas pantallas que
// llaman esta acción solo hacen un refetch después, nunca leen el body).
const SAFE_USER_SELECT = {
  id: true,
  username: true,
  email: true,
  role: true,
  experience: true,
  coins: true,
  level: true,
  suspended: true,
  suspendedAt: true,
  suspendedReason: true,
} as const;

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly adminAudit: AdminAuditService,
  ) {}

  async listUsers(
    query = '',
    page = 1,
    limit = 20,
    filters: {
      role?: Role;
      premiumOnly?: boolean;
      suspendedOnly?: boolean;
      sortBy?: 'createdAt' | 'coins' | 'experience' | 'lastLoginAt';
      sortOrder?: 'asc' | 'desc';
    } = {},
  ) {
    const where: Prisma.UserWhereInput = {
      ...(query
        ? {
            OR: [
              { email: { contains: query, mode: 'insensitive' as const } },
              { username: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(filters.role ? { role: filters.role } : {}),
      ...(filters.suspendedOnly ? { suspended: true } : {}),
      ...(filters.premiumOnly
        ? {
            premiumSubscriptions: {
              some: {
                status: PremiumSubscriptionStatus.ACTIVE,
                expiresAt: { gt: new Date() },
              },
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { [filters.sortBy ?? 'createdAt']: filters.sortOrder ?? 'desc' },
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
          lastLoginAt: true,
          suspended: true,
          premiumSubscriptions: {
            where: {
              status: PremiumSubscriptionStatus.ACTIVE,
              expiresAt: { gt: new Date() },
            },
            take: 1,
            select: { id: true, expiresAt: true, origin: true },
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

  // "User 360": todo lo que un admin necesita ver de un usuario en un solo
  // request, en vez de ir a buscarlo a media docena de pantallas distintas.
  // Cada bloque trae solo lo más reciente (con su total) -- el detalle
  // completo de cada uno vive en su propia lista paginada ya existente
  // (coins ledger, audit log, etc.), esto es un resumen de entrada.
  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatarUrl: true,
        experience: true,
        coins: true,
        level: true,
        streak: true,
        bestStreak: true,
        energy: true,
        country: true,
        createdAt: true,
        lastLoginAt: true,
        suspended: true,
        suspendedAt: true,
        suspendedReason: true,
        suspendedByAdminId: true,
      },
    });
    if (!user) throw new BadRequestException('User not found');

    const [
      premiumSubscriptions,
      certificates,
      certificateOrders,
      coinPurchases,
      recentCoinTransactions,
      recentXpTransactions,
      recentAuditLog,
      referralProfile,
    ] = await Promise.all([
      this.prisma.premiumSubscription.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.certificate.findMany({
        where: { userId },
        orderBy: { issuedAt: 'desc' },
        take: 10,
      }),
      this.prisma.certificateOrder.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.coinPurchase.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.coinTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.xPTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.adminActionLog.findMany({
        where: { targetUserId: userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.referralProfile.findUnique({ where: { userId } }),
    ]);

    return {
      user,
      premiumSubscriptions,
      certificates,
      certificateOrders,
      coinPurchases,
      recentCoinTransactions,
      recentXpTransactions,
      recentAuditLog,
      referralProfile,
    };
  }

  async updateUser(adminId: string, userId: string, dto: AdminUserActionDto) {
    switch (dto.action) {
      case AdminUserAction.GRANT_ADMIN:
        return this.prisma.$transaction(async (tx) => {
          const user = await tx.user.update({
            where: { id: userId },
            data: { role: Role.ADMIN },
            select: SAFE_USER_SELECT,
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
            select: SAFE_USER_SELECT,
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
        return this.grantPremium(adminId, userId, dto.reason);
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
      case AdminUserAction.SUSPEND_USER:
        return this.suspendUser(adminId, userId, dto.reason);
      case AdminUserAction.UNSUSPEND_USER:
        return this.unsuspendUser(adminId, userId);
      default:
        throw new BadRequestException('Unsupported action');
    }
  }

  // Bloquea LOGIN nuevo de inmediato (ver IdentityService#login). Un token
  // ya emitido antes de la suspensión sigue siendo válido hasta que expira
  // -- el resto de la app no consulta la base en cada request (JwtStrategy
  // solo valida la firma), así que revocar sesiones activas al instante
  // requeriría una lista de tokens invalidados que hoy no existe en ningún
  // lado de este codebase. Documentado, no escondido.
  private async suspendUser(adminId: string, userId: string, reason?: string) {
    if (!reason) throw new BadRequestException('Reason is required to suspend a user');

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          suspended: true,
          suspendedAt: new Date(),
          suspendedReason: reason,
          suspendedByAdminId: adminId,
        },
        select: SAFE_USER_SELECT,
      });
      await this.adminAudit.log(tx, {
        adminId,
        action: AdminUserAction.SUSPEND_USER,
        targetUserId: userId,
        targetType: 'User',
        targetId: userId,
        metadata: { reason },
      });
      return user;
    });
  }

  private async unsuspendUser(adminId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          suspended: false,
          suspendedAt: null,
          suspendedReason: null,
          suspendedByAdminId: null,
        },
        select: SAFE_USER_SELECT,
      });
      await this.adminAudit.log(tx, {
        adminId,
        action: AdminUserAction.UNSUSPEND_USER,
        targetUserId: userId,
        targetType: 'User',
        targetId: userId,
      });
      return user;
    });
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

  private async grantPremium(adminId: string, userId: string, reason?: string) {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const subscription = await this.prisma.$transaction(async (tx) => {
      const created = await tx.premiumSubscription.create({
        data: {
          userId,
          status: PremiumSubscriptionStatus.ACTIVE,
          expiresAt,
          origin: PremiumOrigin.ADMIN,
          grantedByAdminId: adminId,
          reason,
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
        select: SAFE_USER_SELECT,
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
        select: SAFE_USER_SELECT,
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
