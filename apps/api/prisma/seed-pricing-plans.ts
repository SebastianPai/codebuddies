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
      name: { es: 'Gratis', en: 'Free', zh: '免费版' },
      ctaLabel: { es: 'Empezar a aprender', en: 'Start learning', zh: '开始学习' },
      features: [
        { es: 'Todos los cursos y lecciones, sin restricciones', en: 'All courses and lessons, no restrictions', zh: '所有课程和课时，无限制' },
        { es: 'XP, monedas y racha', en: 'XP, coins and streak', zh: 'XP、金币和连续学习天数' },
        { es: 'Seguimiento de progreso', en: 'Progress tracking', zh: '学习进度跟踪' },
        { es: 'Rankings de la comunidad', en: 'Community rankings', zh: '社区排名' },
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
      name: { es: 'Premium', en: 'Premium', zh: '高级版' },
      ctaLabel: { es: 'Mejorar plan', en: 'Upgrade', zh: '升级' },
      features: [
        { es: 'Certificados ilimitados (todos los cursos)', en: 'Unlimited certificates (every course)', zh: '无限证书（所有课程）' },
        { es: 'Recompensas y contenido exclusivo del pase', en: 'Pass rewards and exclusive content', zh: '通行证奖励和专属内容' },
        { es: 'Insignias premium', en: 'Premium badges', zh: '高级徽章' },
        { es: 'Cancelás cuando quieras', en: 'Cancel anytime', zh: '随时可以取消' },
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
      name: { es: 'Certificado individual', en: 'Individual Certificate', zh: '单个证书' },
      ctaLabel: { es: 'Comprar certificado', en: 'Buy certificate', zh: '购买证书' },
      features: [
        { es: 'Certificado verificable de un curso', en: 'Verifiable certificate for one course', zh: '单个课程的可验证证书' },
        { es: 'Código QR + URL de verificación pública', en: 'QR code + public verification URL', zh: '二维码 + 公开验证链接' },
        { es: 'Compartible en LinkedIn', en: 'Shareable on LinkedIn', zh: '可分享到领英' },
        { es: 'Sin suscripción requerida', en: 'No subscription required', zh: '无需订阅' },
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
