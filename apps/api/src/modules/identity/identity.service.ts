import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { PremiumAccessService } from '../premium-access/premium-access.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { computeStreakUpdate } from '../../common/utils/streak.util';

// Espejo de CHAT_BUBBLE_THEMES en apps/game/.../hud/nameplateStyles.ts — el
// DTO ya valida que sea un id conocido (@IsIn), esto solo decide cuáles de
// esos ids exigen una suscripción Premium activa.
const PREMIUM_CHAT_BUBBLE_THEMES = new Set([
  'gold',
  'violet',
  'electricBlue',
  'emerald',
  'rose',
  'sunset',
]);
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
  uiLanguage?: string;
  pcTheme?: string;
  chatBubbleThemeId?: string | null;
};

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private gamificationService: GamificationService,
    private emailService: EmailService,
    private premiumAccessService: PremiumAccessService,
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
      uiLanguage: loginUser.uiLanguage,
      pcTheme: loginUser.pcTheme,
      chatBubbleThemeId: loginUser.chatBubbleThemeId,
    };
    return this.generateAuthResponse(userSafe);
  }

  // Delegar en PremiumAccessService.hasPremiumAccess() -- única fuente de
  // verdad de acceso premium en toda la app, ver ese servicio. Antes esto
  // duplicaba la misma query acá.
  hasPremium(userId: string): Promise<boolean> {
    return this.premiumAccessService.hasPremiumAccess(userId);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // El DTO ya validó que sea un id conocido (@IsIn) — acá solo falta
    // confirmar que, si es un tema Premium, el usuario realmente lo tenga.
    if (
      dto.chatBubbleThemeId &&
      PREMIUM_CHAT_BUBBLE_THEMES.has(dto.chatBubbleThemeId)
    ) {
      const premium = await this.hasPremium(userId);
      if (!premium) {
        throw new ForbiddenException('Este tema de chat requiere Premium');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        country: dto.country,
        uiLanguage: dto.uiLanguage,
        pcTheme: dto.pcTheme,
        chatBubbleThemeId: dto.chatBubbleThemeId,
      },
      select: {
        birthDate: true,
        country: true,
        uiLanguage: true,
        pcTheme: true,
        chatBubbleThemeId: true,
      },
    });
  }

  async updateUsername(userId: string, username: string) {
    const trimmed = username.trim();

    const existing = await this.prisma.user.findUnique({
      where: { username: trimmed },
      select: { id: true },
    });

    if (existing && existing.id !== userId) {
      throw new ConflictException('Ese nombre de usuario ya está en uso.');
    }

    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: { username: trimmed },
        select: { username: true },
      });
    } catch (err: any) {
      // Red de seguridad ante una carrera entre el chequeo de arriba y el
      // update (dos personas cambiando al mismo nombre casi al mismo tiempo).
      if (err?.code === 'P2002') {
        throw new ConflictException('Ese nombre de usuario ya está en uso.');
      }
      throw err;
    }
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

    const isPremium = await this.hasPremium(userId);

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
      uiLanguage: user.uiLanguage,
      pcTheme: user.pcTheme,
      chatBubbleThemeId: user.chatBubbleThemeId,
      isPremium,
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
      uiLanguage: true,
      pcTheme: true,
      chatBubbleThemeId: true,
    } as const;
  }

  private async applyDailyLoginStreak(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...this.authUserSelect(),
        lastLearningActivityAt: true,
      },
    });

    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const now = new Date();
    // La racha se comparte con progress.service.ts (completar una lección o
    // ejercicio también cuenta): un mismo campo (lastLearningActivityAt) y
    // una misma definición de "día" (UTC) para ambos triggers, para que
    // loguearse y luego completar un ejercicio el mismo día no la resetee.
    const update = computeStreakUpdate({
      streak: user.streak,
      bestStreak: user.bestStreak ?? 0,
      lastActivityAt: user.lastLearningActivityAt,
    });

    if (!update) {
      // Ya se contó actividad hoy — igual actualizamos lastLoginAt (es
      // informativo, no maneja la racha) sin tocar streak/bestStreak.
      return this.prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: now },
        select: this.authUserSelect(),
      });
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        streak: update.streak,
        bestStreak: update.bestStreak,
        lastLearningActivityAt: update.lastActivityAt,
        lastLoginAt: now,
      },
      select: this.authUserSelect(),
    });
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
