import { PrismaClient } from '@prisma/client';
import { seedCodeStudio } from './seed-codestudio';
import { seedJsCourse } from './seed-js-course';
import { seedLearningGamification } from './seed-learning-gamification';
import { seedPricingPlans } from './seed-pricing-plans';
import { seedBattlePass } from './seed-battle-pass';
import { seedEffectItems } from './seed-effect-items';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed...');

  // Crear idiomas básicos (upsert para que no duplique si ya existen)
  await prisma.language.upsert({
    where: { code: 'es' },
    update: {},
    create: {
      code: 'es',
      name: 'Español',
      direction: 'ltr',
    },
  });

  await prisma.language.upsert({
    where: { code: 'en' },
    update: {},
    create: {
      code: 'en',
      name: 'English',
      direction: 'ltr',
    },
  });

  // Opcional: agrega más idiomas si quieres (ej: alemán)
  await prisma.language.upsert({
    where: { code: 'de' },
    update: { name: 'Deutsch' },
    create: {
      code: 'de',
      name: 'Deutsch',
      direction: 'ltr',
    },
  });

  // Opcional: crear un usuario ADMIN de prueba (para poder crear módulos/cursos desde Postman)
  const hashedPassword = await import('bcrypt').then((b) =>
    b.hash('admin123', 10),
  ); // usa bcrypt como en tu auth

  await prisma.user.upsert({
    where: { email: 'admin@codebuddies.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@codebuddies.com',
      password: hashedPassword,
      role: 'ADMIN', // importante: ADMIN
      preferredLanguage: {
        connect: { code: 'es' },
      },
    },
  });

  await prisma.emailTemplate.upsert({
    where: { type_language: { type: 'WELCOME', language: 'es' } },
    update: {},
    create: {
      type: 'WELCOME',
      language: 'es',
      name: 'Bienvenida',
      subject: '¡Bienvenido a CodeBuddies, {{username}}!',
      body: `
        <h1>¡Hola {{username}}!</h1>
        <p>Gracias por registrarte en CodeBuddies. Tu cuenta ({{email}}) ya está lista.</p>
        <p>¡Nos vemos dentro! 🚀</p>
      `,
      variables: ['username', 'email'],
      active: true,
    },
  });

  await prisma.emailTemplate.upsert({
    where: { type_language: { type: 'BIRTHDAY', language: 'es' } },
    update: {},
    create: {
      type: 'BIRTHDAY',
      language: 'es',
      name: 'Cumpleaños',
      subject: '¡Feliz cumpleaños, {{username}}! 🎉',
      body: `
        <h1>¡Feliz cumpleaños, {{username}}!</h1>
        <p>Todo el equipo de CodeBuddies te desea un día increíble. ¡Gracias por aprender con nosotros!</p>
      `,
      variables: ['username', 'email'],
      active: true,
    },
  });

  await prisma.emailTemplate.upsert({
    where: { type_language: { type: 'CHRISTMAS', language: 'es' } },
    update: {},
    create: {
      type: 'CHRISTMAS',
      language: 'es',
      name: 'Navidad',
      subject: '¡Feliz Navidad, {{username}}!',
      body: `
        <h1>¡Feliz Navidad, {{username}}!</h1>
        <p>Que esta temporada esté llena de alegría y nuevos aprendizajes. ¡Gracias por ser parte de CodeBuddies!</p>
      `,
      variables: ['username', 'email'],
      active: true,
    },
  });

  await prisma.emailTemplate.upsert({
    where: { type_language: { type: 'NEW_YEAR', language: 'es' } },
    update: {},
    create: {
      type: 'NEW_YEAR',
      language: 'es',
      name: 'Año Nuevo',
      subject: '¡Feliz Año Nuevo, {{username}}!',
      body: `
        <h1>¡Feliz Año Nuevo, {{username}}!</h1>
        <p>Que este año esté lleno de nuevos retos y logros. ¡Sigamos aprendiendo juntos en CodeBuddies!</p>
      `,
      variables: ['username', 'email'],
      active: true,
    },
  });

  await seedCodeStudio(prisma);
  await seedJsCourse(prisma);
  await seedLearningGamification(prisma);
  await seedPricingPlans(prisma);
  await seedBattlePass(prisma);
  await seedEffectItems(prisma);

  console.log(
    'Seed completado! Idiomas, usuario ADMIN y templates de email creados.',
  );
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
