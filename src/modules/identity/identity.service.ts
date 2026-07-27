import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { attachReferralToRegistration } from '../referrals/referrals.registration';
import { GamificationService } from '../gamification/gamification.service';
import { EmailService } from '../email/email.service';

type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: Role;
  experience?: number;
  coins?: number;
  level?: number;
  streak?: number;
  bestStreak?: number;
  lastLoginAt?: Date | null;
  marketingEmailsEnabled?: boolean;
};

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private gamificationService: GamificationService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const hashed = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const createdUser = await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          password: hashed,
          streak: 1,
          bestStreak: 1,
          lastLoginAt: now,
        },
        select: this.authUserSelect(),
      });

      await attachReferralToRegistration(tx, {
        userId: createdUser.id,
        username: createdUser.username,
        referralCode: dto.referralCode,
      });

      return createdUser;
    });

    await this.gamificationService.getMissionsForUser(user.id);

    this.emailService
      .sendWelcomeEmail({
        id: user.id,
        email: user.email,
        username: user.username,
      })
      .catch((err) =>
        this.logger.error('Error enviando correo de bienvenida', err),
      );

    return this.generateAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        ...this.authUserSelect(),
        password: true,
      },
    });

    if (!user) throw new UnauthorizedException('Credenciales invalidas');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciales invalidas');

    const loginUser = await this.applyDailyLoginStreak(user.id);

    await this.gamificationService.getMissionsForUser(loginUser.id);

    const userSafe = {
      id: loginUser.id,
      username: loginUser.username,
      email: loginUser.email,
      role: loginUser.role,
      experience: loginUser.experience,
      coins: loginUser.coins,
      level: loginUser.level,
      streak: loginUser.streak,
      bestStreak: loginUser.bestStreak,
      lastLoginAt: loginUser.lastLoginAt,
      marketingEmailsEnabled: loginUser.marketingEmailsEnabled,
    };
    return this.generateAuthResponse(userSafe);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        country: dto.country,
      },
      select: { birthDate: true, country: true },
    });
  }

  async getProfile(userId: string) {
    await this.applyDailyLoginStreak(userId);
    await this.gamificationService.getMissionsForUser(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...this.authUserSelect(),
        birthDate: true,
        country: true,
        _count: {
          select: {
            completions: true,
            certificates: true,
            enrollments: true,
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    return {
      id: user.id,
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      experience: user.experience,
      coins: user.coins,
      level: user.level,
      streak: user.streak,
      bestStreak: user.bestStreak,
      lastLoginAt: user.lastLoginAt,
      marketingEmailsEnabled: user.marketingEmailsEnabled,
      birthDate: user.birthDate,
      country: user.country,
      completions: user._count.completions,
      certificates: user._count.certificates,
      enrollments: user._count.enrollments,
    };
  }

  private authUserSelect() {
    return {
      id: true,
      username: true,
      email: true,
      role: true,
      experience: true,
      coins: true,
      level: true,
      streak: true,
      bestStreak: true,
      lastLoginAt: true,
      marketingEmailsEnabled: true,
    } as const;
  }

  private async applyDailyLoginStreak(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.authUserSelect(),
    });

    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const now = new Date();
    const today = this.startOfUtcDay(now);
    const lastLoginDay = user.lastLoginAt
      ? this.startOfUtcDay(user.lastLoginAt)
      : null;

    if (lastLoginDay?.getTime() === today.getTime()) {
      return user;
    }

    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const nextStreak =
      lastLoginDay?.getTime() === yesterday.getTime() ? user.streak + 1 : 1;

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        streak: nextStreak,
        bestStreak: Math.max(user.bestStreak ?? 0, nextStreak),
        lastLoginAt: now,
      },
      select: this.authUserSelect(),
    });
  }

  private startOfUtcDay(date: Date) {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
  }

  private generateAuthResponse(user: AuthUser) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        experience: user.experience ?? 0,
        coins: user.coins ?? 0,
        level: user.level ?? 1,
        streak: user.streak ?? 0,
        bestStreak: user.bestStreak ?? 0,
        lastLoginAt: user.lastLoginAt ?? null,
        marketingEmailsEnabled: user.marketingEmailsEnabled ?? true,
      },
    };
  }
}
