import { PrismaClient } from '@prisma/client';

const DATABASE_URL = process.env.PROD_DATABASE_URL;
const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL });

const templates = [
  {
    type: 'PREMIUM_ACTIVATED',
    language: 'es',
    name: 'Premium activado',
    subject: '⭐ ¡Ya sos Premium, {{username}}!',
    body: `<h1>⭐ ¡Bienvenido a Premium, {{username}}!</h1>
<p>Tu suscripción ya está activa. Ahora tenés acceso completo a certificados, contenido exclusivo y todos los beneficios Premium de CodeBuddies.</p>
<p>¡Gracias por apoyar el proyecto! 🚀</p>`,
    variables: ['username', 'email'],
    active: true,
  },
  {
    type: 'COIN_PURCHASE',
    language: 'es',
    name: 'Compra de monedas',
    subject: '🪙 ¡Recibiste {{coins}} monedas!',
    body: `<h1>🪙 ¡Gracias por tu compra, {{username}}!</h1>
<p>Ya acreditamos <strong>{{coins}} monedas</strong> a tu cuenta. Usalas en la tienda, el marketplace o para personalizar tu perfil.</p>`,
    variables: ['username', 'email', 'coins'],
    active: true,
  },
];

async function main() {
  for (const template of templates) {
    const saved = await prisma.emailTemplate.upsert({
      where: { type_language: { type: template.type, language: template.language } },
      create: template,
      update: template,
    });
    console.log('Upserted', saved.type, saved.language, saved.id);
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
