import { PrismaClient } from '@prisma/client';

type RewardConfig =
  | { type: 'COINS' | 'XP'; amount: number }
  | { type: 'BADGE' | 'TITLE'; itemId: string; label: string };

// El motor de misiones/logros (GamificationService) ya existía completo —
// condiciones, reclamo, recompensas transaccionales, panel admin, páginas
// /missions y /achievements — pero sin ningún dato cargado quedaba
// invisible en el producto. Esto es lo que le da contenido real, orientado
// pura y exclusivamente al aprendizaje (nada de items del mundo virtual):
// un "pase" simple de misiones diarias/semanales + logros permanentes que
// van dando monedas, XP y, con el tiempo, insignias.
export async function seedLearningGamification(prisma: PrismaClient) {
  const category = await prisma.missionCategory.upsert({
    where: { id: 'learning-missions-category' },
    update: {},
    create: {
      id: 'learning-missions-category',
      name: 'Aprendizaje',
      description: 'Misiones ligadas a tu actividad en los cursos.',
      icon: 'BookOpen',
      color: '#22c55e',
      sortOrder: 0,
    },
  });

  const missions: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    cadence: 'DAILY' | 'WEEKLY';
    condition: string;
    requiredValue: number;
    rewards: RewardConfig[];
  }> = [
    {
      id: 'mission-daily-exercise',
      name: 'Ejercicio del día',
      description: 'Completá al menos 1 ejercicio hoy.',
      icon: 'Code',
      cadence: 'DAILY',
      condition: 'COMPLETE_EXERCISES',
      requiredValue: 1,
      rewards: [{ type: 'COINS', amount: 15 }],
    },
    {
      id: 'mission-daily-lesson',
      name: 'Lección del día',
      description: 'Completá al menos 1 lección hoy.',
      icon: 'BookOpen',
      cadence: 'DAILY',
      condition: 'COMPLETE_LESSONS',
      requiredValue: 1,
      rewards: [{ type: 'COINS', amount: 20 }],
    },
    {
      id: 'mission-weekly-exercises',
      name: 'Semana de código',
      description: 'Completá 10 ejercicios esta semana.',
      icon: 'Flame',
      cadence: 'WEEKLY',
      condition: 'COMPLETE_EXERCISES',
      requiredValue: 10,
      rewards: [
        { type: 'COINS', amount: 80 },
        { type: 'XP', amount: 50 },
      ],
    },
    {
      id: 'mission-weekly-lessons',
      name: 'Progreso semanal',
      description: 'Completá 5 lecciones esta semana.',
      icon: 'Target',
      cadence: 'WEEKLY',
      condition: 'COMPLETE_LESSONS',
      requiredValue: 5,
      rewards: [
        { type: 'COINS', amount: 60 },
        { type: 'XP', amount: 30 },
      ],
    },
  ];

  for (const mission of missions) {
    await prisma.mission.upsert({
      where: { id: mission.id },
      update: {
        name: mission.name,
        description: mission.description,
        icon: mission.icon,
        cadence: mission.cadence,
        condition: mission.condition,
        requiredValue: mission.requiredValue,
        rewards: mission.rewards,
        categoryId: category.id,
        active: true,
        repeatable: true,
      },
      create: {
        id: mission.id,
        name: mission.name,
        description: mission.description,
        icon: mission.icon,
        cadence: mission.cadence,
        condition: mission.condition,
        requiredValue: mission.requiredValue,
        rewards: mission.rewards,
        categoryId: category.id,
        active: true,
        repeatable: true,
      },
    });
  }

  // NF20/NF25: catálogo de insignias/títulos cosméticos ligados a hitos de
  // aprendizaje. La "propiedad" se deriva del RewardLedgerEntry que generan
  // los logros de abajo (ver GamificationService#grantRewards) — no hace
  // falta una tabla de dueños separada.
  const badges: Array<{ id: string; name: string; description: string; icon: string; rarity: string }> = [
    {
      id: 'badge-first-course',
      name: 'Graduado',
      description: 'Completaste tu primer curso entero en CodeBuddies.',
      icon: 'GraduationCap',
      rarity: 'COMMON',
    },
    {
      id: 'badge-streak-7',
      name: 'Constancia de hierro',
      description: 'Mantuviste una racha de aprendizaje de 7 días seguidos.',
      icon: 'Flame',
      rarity: 'RARE',
    },
    {
      id: 'badge-streak-30',
      name: 'Imparable',
      description: 'Mantuviste una racha de aprendizaje de 30 días seguidos.',
      icon: 'Flame',
      rarity: 'EPIC',
    },
  ];

  for (const badge of badges) {
    await prisma.gamificationBadge.upsert({
      where: { id: badge.id },
      update: { name: badge.name, description: badge.description, icon: badge.icon, rarity: badge.rarity, active: true },
      create: { ...badge, active: true },
    });
  }

  const titles: Array<{ id: string; name: string; description: string; rarity: string }> = [
    {
      id: 'title-code-master',
      name: 'Code Master',
      description: 'Alcanzaste el nivel 10 aprendiendo en CodeBuddies.',
      rarity: 'EPIC',
    },
  ];

  for (const title of titles) {
    await prisma.gamificationTitle.upsert({
      where: { id: title.id },
      update: { name: title.name, description: title.description, rarity: title.rarity, active: true },
      create: { ...title, active: true },
    });
  }

  const achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    condition: string;
    requiredValue: number;
    sortOrder: number;
    rewards: RewardConfig[];
  }> = [
    {
      id: 'achievement-first-lesson',
      name: 'Primer paso',
      description: 'Completaste tu primera lección.',
      icon: 'Footprints',
      condition: 'COMPLETE_LESSONS',
      requiredValue: 1,
      sortOrder: 0,
      rewards: [{ type: 'COINS', amount: 20 }],
    },
    {
      id: 'achievement-first-exercise',
      name: 'Primer código',
      description: 'Completaste tu primer ejercicio.',
      icon: 'Code',
      condition: 'COMPLETE_EXERCISES',
      requiredValue: 1,
      sortOrder: 1,
      rewards: [{ type: 'COINS', amount: 20 }],
    },
    {
      id: 'achievement-ten-exercises',
      name: 'Diez ejercicios',
      description: 'Completaste 10 ejercicios.',
      icon: 'Zap',
      condition: 'COMPLETE_EXERCISES',
      requiredValue: 10,
      sortOrder: 2,
      rewards: [{ type: 'COINS', amount: 50 }],
    },
    {
      id: 'achievement-fifty-exercises',
      name: 'Cincuenta ejercicios',
      description: 'Completaste 50 ejercicios.',
      icon: 'Sparkles',
      condition: 'COMPLETE_EXERCISES',
      requiredValue: 50,
      sortOrder: 3,
      rewards: [
        { type: 'COINS', amount: 150 },
        { type: 'XP', amount: 100 },
      ],
    },
    {
      id: 'achievement-first-course',
      name: 'Primer curso completo',
      description: 'Completaste un curso entero.',
      icon: 'GraduationCap',
      condition: 'COMPLETE_COURSES',
      requiredValue: 1,
      sortOrder: 4,
      rewards: [
        { type: 'COINS', amount: 200 },
        { type: 'XP', amount: 150 },
        { type: 'BADGE', itemId: 'badge-first-course', label: 'Graduado' },
      ],
    },
    {
      id: 'achievement-streak-7',
      name: 'Racha de una semana',
      description: 'Mantuviste una racha de 7 días seguidos.',
      icon: 'Flame',
      condition: 'MAINTAIN_STREAK',
      requiredValue: 7,
      sortOrder: 5,
      rewards: [
        { type: 'COINS', amount: 100 },
        { type: 'BADGE', itemId: 'badge-streak-7', label: 'Constancia de hierro' },
      ],
    },
    {
      id: 'achievement-streak-30',
      name: 'Racha de un mes',
      description: 'Mantuviste una racha de 30 días seguidos.',
      icon: 'Flame',
      condition: 'MAINTAIN_STREAK',
      requiredValue: 30,
      sortOrder: 6,
      rewards: [
        { type: 'COINS', amount: 300 },
        { type: 'XP', amount: 200 },
        { type: 'BADGE', itemId: 'badge-streak-30', label: 'Imparable' },
      ],
    },
    {
      id: 'achievement-level-5',
      name: 'Nivel 5',
      description: 'Alcanzaste el nivel 5.',
      icon: 'Star',
      condition: 'REACH_LEVEL',
      requiredValue: 5,
      sortOrder: 7,
      rewards: [{ type: 'COINS', amount: 100 }],
    },
    {
      id: 'achievement-level-10',
      name: 'Nivel 10',
      description: 'Alcanzaste el nivel 10.',
      icon: 'Crown',
      condition: 'REACH_LEVEL',
      requiredValue: 10,
      sortOrder: 8,
      rewards: [
        { type: 'COINS', amount: 250 },
        { type: 'TITLE', itemId: 'title-code-master', label: 'Code Master' },
      ],
    },
    {
      id: 'achievement-xp-1000',
      name: 'Coleccionista de XP',
      description: 'Acumulaste 1000 XP en total.',
      icon: 'Trophy',
      condition: 'GAIN_XP',
      requiredValue: 1000,
      sortOrder: 9,
      rewards: [{ type: 'COINS', amount: 100 }],
    },
  ];

  for (const achievement of achievements) {
    await prisma.gamificationAchievement.upsert({
      where: { id: achievement.id },
      update: {
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        condition: achievement.condition,
        requiredValue: achievement.requiredValue,
        sortOrder: achievement.sortOrder,
        rewards: achievement.rewards,
        visible: true,
      },
      create: {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        condition: achievement.condition,
        requiredValue: achievement.requiredValue,
        sortOrder: achievement.sortOrder,
        rewards: achievement.rewards,
        visible: true,
      },
    });
  }

  console.log(
    `Gamification de aprendizaje: ${missions.length} misiones y ${achievements.length} logros cargados.`,
  );
}
