import { PrismaClient } from '@prisma/client';

type Track = 'FREE' | 'PREMIUM';
type BattlePassTierSeed = {
  id: string;
  level: number;
  track: Track;
  rewardType: 'COINS' | 'XP' | 'BADGE' | 'TITLE';
  amount?: number;
  itemId?: string;
  label: string;
  sortOrder?: number;
};

// Temporada 1 del Battle Pass -- 30 niveles / 30 días, dos tracks (FREE y
// PREMIUM). Objetivo de economía (ver auditoría/plan): el track FREE debe
// entregar ~350-400 coins por temporada completa y el PREMIUM ~800-1000
// coins ADICIONALES, sin agregar packs de coins ni precios de Paddle nuevos
// -- todo lo demás (badges/títulos/XP extra) es flavor sin impacto en el
// sink de coins. Las cuentas exactas quedan documentadas acá porque son la
// única fuente de verdad de que el diseño respeta esos topes:
//   FREE:    niveles 5/10/15/20/25/30 dan coins 25+50+50+75+75+100 = 375
//   PREMIUM: niveles pares (2,4,...,30 = 15 niveles) dan 60 coins c/u = 900
export async function seedBattlePass(prisma: PrismaClient) {
  const badges = [
    {
      id: 'battle-pass-s1-badge-bronze',
      name: 'Battle Pass: Bronce',
      description: 'Insignia de temporada -- nivel 10 del track gratuito del Battle Pass.',
      icon: 'Medal',
      rarity: 'BRONZE',
    },
    {
      id: 'battle-pass-s1-badge-silver',
      name: 'Battle Pass: Plata',
      description: 'Insignia de temporada -- nivel 20 del track gratuito del Battle Pass.',
      icon: 'Medal',
      rarity: 'SILVER',
    },
    {
      id: 'battle-pass-s1-badge-gold',
      name: 'Battle Pass: Oro',
      description: 'Insignia de temporada -- nivel 10 del track premium del Battle Pass.',
      icon: 'Medal',
      rarity: 'GOLD',
    },
    {
      id: 'battle-pass-s1-badge-legendary',
      name: 'Battle Pass: Legendaria',
      description: 'Insignia de temporada -- nivel máximo del Battle Pass.',
      icon: 'Sparkles',
      rarity: 'LEGENDARY',
    },
  ];

  for (const badge of badges) {
    await prisma.gamificationBadge.upsert({
      where: { id: badge.id },
      update: { name: badge.name, description: badge.description, icon: badge.icon, rarity: badge.rarity, active: true },
      create: { ...badge, active: true },
    });
  }

  const title = {
    id: 'battle-pass-s1-title-legend',
    name: 'Leyenda de Temporada 1',
    description: 'Título otorgado al alcanzar el nivel máximo del Battle Pass, Temporada 1.',
    rarity: 'LEGENDARY',
  };

  await prisma.gamificationTitle.upsert({
    where: { id: title.id },
    update: { name: title.name, description: title.description, rarity: title.rarity, active: true },
    create: { ...title, active: true },
  });

  const season = await prisma.battlePassSeason.upsert({
    where: { seasonNumber: 1 },
    update: {},
    create: {
      id: 'battle-pass-season-1',
      name: 'Temporada 1: Primeros Pasos',
      description: 'La primera temporada del Battle Pass de CodeBuddies -- 30 niveles, 30 días.',
      seasonNumber: 1,
      status: 'ACTIVE',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalLevels: 30,
      xpPerLevel: 1000,
    },
  });

  const FREE_COIN_MILESTONES: Record<number, number> = { 5: 25, 10: 50, 15: 50, 20: 75, 25: 75, 30: 100 };
  const tiers: BattlePassTierSeed[] = [];

  for (let level = 1; level <= 30; level++) {
    const coins = FREE_COIN_MILESTONES[level];
    if (coins) {
      tiers.push({
        id: `battle-pass-s1-free-l${level}`,
        level,
        track: 'FREE',
        rewardType: 'COINS',
        amount: coins,
        label: `${coins} coins`,
      });
    } else {
      tiers.push({
        id: `battle-pass-s1-free-l${level}`,
        level,
        track: 'FREE',
        rewardType: 'XP',
        amount: 15,
        label: '15 XP extra',
      });
    }
  }
  tiers.push({ id: 'battle-pass-s1-free-l10-badge', level: 10, track: 'FREE', rewardType: 'BADGE', itemId: badges[0].id, label: 'Insignia: Battle Pass Bronce', sortOrder: 1 });
  tiers.push({ id: 'battle-pass-s1-free-l20-badge', level: 20, track: 'FREE', rewardType: 'BADGE', itemId: badges[1].id, label: 'Insignia: Battle Pass Plata', sortOrder: 1 });
  tiers.push({ id: 'battle-pass-s1-free-l30-badge', level: 30, track: 'FREE', rewardType: 'BADGE', itemId: badges[3].id, label: 'Insignia: Battle Pass Legendaria', sortOrder: 1 });
  tiers.push({ id: 'battle-pass-s1-free-l30-title', level: 30, track: 'FREE', rewardType: 'TITLE', itemId: title.id, label: 'Título: Leyenda de Temporada 1', sortOrder: 2 });

  for (let level = 1; level <= 30; level++) {
    if (level % 2 === 0) {
      tiers.push({
        id: `battle-pass-s1-premium-l${level}`,
        level,
        track: 'PREMIUM',
        rewardType: 'COINS',
        amount: 60,
        label: '60 coins',
      });
    } else {
      tiers.push({
        id: `battle-pass-s1-premium-l${level}`,
        level,
        track: 'PREMIUM',
        rewardType: 'XP',
        amount: 25,
        label: '25 XP extra',
      });
    }
  }
  tiers.push({ id: 'battle-pass-s1-premium-l10-badge', level: 10, track: 'PREMIUM', rewardType: 'BADGE', itemId: badges[2].id, label: 'Insignia: Battle Pass Oro', sortOrder: 1 });
  tiers.push({ id: 'battle-pass-s1-premium-l20-badge', level: 20, track: 'PREMIUM', rewardType: 'BADGE', itemId: badges[3].id, label: 'Insignia: Battle Pass Legendaria (Premium)', sortOrder: 1 });
  tiers.push({ id: 'battle-pass-s1-premium-l30-title', level: 30, track: 'PREMIUM', rewardType: 'TITLE', itemId: title.id, label: 'Título: Leyenda de Temporada 1', sortOrder: 1 });

  for (const tier of tiers) {
    await prisma.battlePassTier.upsert({
      where: { id: tier.id },
      update: {
        level: tier.level,
        track: tier.track,
        rewardType: tier.rewardType,
        amount: tier.amount ?? null,
        itemId: tier.itemId ?? null,
        label: tier.label,
        sortOrder: tier.sortOrder ?? 0,
      },
      create: {
        id: tier.id,
        seasonId: season.id,
        level: tier.level,
        track: tier.track,
        rewardType: tier.rewardType,
        amount: tier.amount ?? null,
        itemId: tier.itemId ?? null,
        label: tier.label,
        sortOrder: tier.sortOrder ?? 0,
      },
    });
  }
}
