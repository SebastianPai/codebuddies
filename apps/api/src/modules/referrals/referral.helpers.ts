import {
  NotificationType,
  Prisma,
  ReferralProgramConfig,
  ReferralSeasonStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaExecutor } from './referral.types';

const DEFAULT_BASE_URL = 'http://localhost:3000/register';

export async function getOrCreateReferralProgramConfig(
  client: PrismaExecutor,
) {
  const existing = await client.referralProgramConfig.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (existing) return existing;

  return client.referralProgramConfig.create({
    data: {},
  });
}

export function buildReferralLink(baseUrl: string, referralCode: string) {
  const safeBaseUrl = (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  return `${safeBaseUrl}?ref=${encodeURIComponent(referralCode)}`;
}

export function createReferralPeriodKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

export function getMonthRange(date: Date) {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );

  return { start, end };
}

export function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  );
}

function sanitizeReferralFragment(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

export async function generateUniqueReferralCode(
  client: PrismaExecutor,
  username: string,
  config: ReferralProgramConfig,
) {
  const prefix = sanitizeReferralFragment(config.codePrefix ?? '');
  const base = sanitizeReferralFragment(username).slice(0, Math.max(config.codeLength - prefix.length, 3));
  const targetLength = Math.max(config.codeLength, prefix.length + 3);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const randomPart = sanitizeReferralFragment(randomUUID()).slice(0, 10);
    const candidate = `${prefix}${base}${randomPart}`
      .slice(0, targetLength)
      .padEnd(targetLength, 'X');

    const existing = await client.referralProfile.findUnique({
      where: { referralCode: candidate },
      select: { id: true },
    });

    if (!existing) return candidate;
  }

  throw new ConflictException(
    'No fue posible generar un código de referido único',
  );
}

export async function ensureReferralProfile(
  client: PrismaExecutor,
  input: { userId: string; username: string },
) {
  const existing = await client.referralProfile.findUnique({
    where: { userId: input.userId },
  });

  if (existing) return existing;

  const config = await getOrCreateReferralProgramConfig(client);
  const referralCode = await generateUniqueReferralCode(
    client,
    input.username,
    config,
  );

  return client.referralProfile.create({
    data: {
      userId: input.userId,
      referralCode,
      referralLink: buildReferralLink(config.baseUrl, referralCode),
    },
  });
}

export async function ensureActiveReferralSeason(client: PrismaExecutor) {
  const now = new Date();
  const periodKey = createReferralPeriodKey(now);
  const { start, end } = getMonthRange(now);

  const current = await client.referralSeason.findFirst({
    where: {
      status: ReferralSeasonStatus.ACTIVE,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
  });

  if (current) return current;

  const existingByPeriod = await client.referralSeason.findUnique({
    where: { periodKey },
  });

  if (existingByPeriod) {
    return client.referralSeason.update({
      where: { id: existingByPeriod.id },
      data: {
        status: ReferralSeasonStatus.ACTIVE,
      },
    });
  }

  return client.referralSeason.create({
    data: {
      name: `Temporada ${periodKey}`,
      periodKey,
      startsAt: start,
      endsAt: end,
      status: ReferralSeasonStatus.ACTIVE,
    },
  });
}

export async function attachReferralToRegistration(
  client: PrismaExecutor,
  input: {
    userId: string;
    username: string;
    referralCode?: string | null;
  },
) {
  const config = await getOrCreateReferralProgramConfig(client);
  const profile = await ensureReferralProfile(client, {
    userId: input.userId,
    username: input.username,
  });

  const normalizedCode = input.referralCode?.trim().toUpperCase();

  if (!normalizedCode) {
    return { profile, referral: null };
  }

  if (!config.enabled) {
    throw new BadRequestException('El programa de referidos está deshabilitado');
  }

  if (normalizedCode === profile.referralCode) {
    throw new ConflictException('No puedes usar tu propio código de referido');
  }

  const referrerProfile = await client.referralProfile.findUnique({
    where: { referralCode: normalizedCode },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (!referrerProfile) {
    throw new BadRequestException('El código de referido no existe');
  }

  if (referrerProfile.userId === input.userId) {
    throw new ConflictException('No puedes referirte a ti mismo');
  }

  const existingReferral = await client.referral.findUnique({
    where: { referredUserId: input.userId },
    select: { id: true },
  });

  if (existingReferral) {
    throw new ConflictException('El usuario ya tiene un invitador registrado');
  }

  const todayStart = startOfUtcDay(new Date());
  const dailyCount = await client.referral.count({
    where: {
      referrerUserId: referrerProfile.userId,
      createdAt: {
        gte: todayStart,
      },
    },
  });

  if (dailyCount >= config.maxReferralsPerDay) {
    throw new ConflictException(
      'El invitador alcanzó el máximo diario de referidos permitidos',
    );
  }

  const season = config.rankingEnabled
    ? await ensureActiveReferralSeason(client)
    : null;

  const referral = await client.referral.create({
    data: {
      referrerUserId: referrerProfile.userId,
      referredUserId: input.userId,
      referralCodeUsed: normalizedCode,
      source: 'REGISTER',
      seasonId: season?.id,
      validationSnapshot: {
        createdFrom: 'identity.register',
        requireVerifiedEmail: config.requireVerifiedEmail,
      } as Prisma.InputJsonValue,
    },
  });

  await client.notification.create({
    data: {
      userId: referrerProfile.userId,
      type: NotificationType.REFERRAL_PENDING,
      title: 'Nuevo referido pendiente',
      body: `${input.username} se registró con tu código.`,
      metadata: {
        referralId: referral.id,
        referredUserId: input.userId,
      } as Prisma.InputJsonValue,
    },
  });

  return { profile, referral };
}
