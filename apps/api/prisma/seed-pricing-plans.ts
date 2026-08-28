import { PrismaClient } from '@prisma/client';

// Antes /pricing era 100% estático en el frontend (PREM4). Esto carga los
// 3 planes reales del modelo de negocio actual (contenido gratis, certificado
// individual $4.99, Premium $9.99/mes con certificados ilimitados) como filas
// editables desde /admin/pricing, usando el mismo texto que ya vivía
// hardcodeado en apps/web/app/(site)/pricing/page.tsx + los namespaces i18n.
export async function seedPricingPlans(prisma: PrismaClient) {
  const plans = [
    {
      key: 'free',
      priceUsd: 0,
      billingInterval: 'NONE' as const,
      featured: false,
      sortOrder: 0,
      ctaHref: '/register',
      icon: 'Sparkles',
      name: { es: 'Gratis', en: 'Free', de: 'Kostenlos' },
      ctaLabel: { es: 'Empezar a aprender', en: 'Start learning', de: 'Jetzt lernen' },
      features: [
        { es: 'Todos los cursos y lecciones, sin restricciones', en: 'All courses and lessons, no restrictions', de: 'Alle Kurse und Lektionen, ohne Einschränkungen' },
        { es: 'XP, monedas y racha', en: 'XP, coins and streak', de: 'XP, Coins und Streak' },
        { es: 'Seguimiento de progreso', en: 'Progress tracking', de: 'Fortschritts-Tracking' },
        { es: 'Rankings de la comunidad', en: 'Community rankings', de: 'Community-Ranglisten' },
      ],
    },
    {
      key: 'premium',
      priceUsd: 9.99,
      billingInterval: 'MONTHLY' as const,
      featured: true,
      sortOrder: 1,
      ctaHref: '/premium',
      icon: 'Crown',
      name: { es: 'Premium', en: 'Premium', de: 'Premium' },
      ctaLabel: { es: 'Mejorar plan', en: 'Upgrade', de: 'Upgraden' },
      features: [
        { es: 'Certificados ilimitados (todos los cursos)', en: 'Unlimited certificates (every course)', de: 'Unbegrenzte Zertifikate (alle Kurse)' },
        { es: 'Recompensas y contenido exclusivo del pase', en: 'Pass rewards and exclusive content', de: 'Pass-Belohnungen und exklusive Inhalte' },
        { es: 'Insignias premium', en: 'Premium badges', de: 'Premium-Abzeichen' },
        { es: 'Cancelás cuando quieras', en: 'Cancel anytime', de: 'Jederzeit kündbar' },
      ],
    },
    {
      key: 'certificate',
      priceUsd: 4.99,
      billingInterval: 'NONE' as const,
      featured: false,
      sortOrder: 2,
      ctaHref: '/courses',
      icon: 'Award',
      name: { es: 'Certificado individual', en: 'Individual Certificate', de: 'Einzelzertifikat' },
      ctaLabel: { es: 'Comprar certificado', en: 'Buy certificate', de: 'Zertifikat kaufen' },
      features: [
        { es: 'Certificado verificable de un curso', en: 'Verifiable certificate for one course', de: 'Verifizierbares Zertifikat für einen Kurs' },
        { es: 'Código QR + URL de verificación pública', en: 'QR code + public verification URL', de: 'QR-Code + öffentliche Verifizierungs-URL' },
        { es: 'Compartible en LinkedIn', en: 'Shareable on LinkedIn', de: 'Teilbar auf LinkedIn' },
        { es: 'Sin suscripción requerida', en: 'No subscription required', de: 'Kein Abo erforderlich' },
      ],
    },
  ];

  for (const plan of plans) {
    await prisma.pricingPlan.upsert({
      where: { key: plan.key },
      update: {
        priceUsd: plan.priceUsd,
        billingInterval: plan.billingInterval,
        featured: plan.featured,
        sortOrder: plan.sortOrder,
        ctaHref: plan.ctaHref,
        icon: plan.icon,
        name: plan.name,
        ctaLabel: plan.ctaLabel,
        features: plan.features,
      },
      create: plan,
    });
  }

  console.log(`Planes de precios: ${plans.length} cargados.`);
}
