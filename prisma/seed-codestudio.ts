import { PrismaClient, Prisma } from '@prisma/client';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const moduleCategories = {
  Autenticacion: ['Login', 'Registro', 'OAuth', '2FA', 'Recuperacion de clave', 'Sesiones', 'Roles', 'Permisos', 'SSO', 'Verificacion email'],
  Perfil: ['Perfil publico', 'Avatar', 'Preferencias', 'Privacidad', 'Biografia', 'Badges', 'Actividad', 'Configuracion', 'Bloqueos', 'Identidad'],
  Catalogo: ['Listado', 'Buscador', 'Filtros', 'Detalle', 'Favoritos', 'Colecciones', 'Etiquetas', 'Comparador', 'Recomendaciones', 'Disponibilidad'],
  Compras: ['Carrito', 'Checkout', 'Pagos', 'Cupones', 'Facturas', 'Suscripciones', 'Reembolsos', 'Impuestos', 'Monedero', 'Ordenes'],
  Social: ['Feed', 'Comentarios', 'Likes', 'Seguidores', 'Mensajes', 'Grupos', 'Menciones', 'Moderacion social', 'Reportes', 'Compartir'],
  Seguridad: ['Firewall app', 'Rate limit', 'Auditoria', 'Antifraude', 'Captcha', 'Cifrado', 'Backups seguros', 'Alertas', 'Permisos avanzados', 'Hardening'],
  Administracion: ['Dashboard admin', 'Usuarios admin', 'CMS', 'Roles admin', 'Logs', 'Configuracion', 'Feature flags', 'Soporte admin', 'Importador', 'Exportador'],
  Analiticas: ['Eventos', 'Embudo', 'Retencion', 'Cohortes', 'A/B testing', 'Revenue analytics', 'Heatmaps', 'Alertas KPI', 'Predicciones', 'Reportes'],
  Comunicacion: ['Email', 'Push', 'Chat en vivo', 'Notificaciones', 'Newsletter', 'Centro ayuda', 'Plantillas', 'Webhooks', 'SMS', 'Bandeja'],
  Multimedia: ['Galeria', 'Video', 'Streaming', 'Compresion imagen', 'Editor media', 'Subtitulos', 'CDN media', 'Transcodificacion', 'Audio', 'Stories'],
  IA: ['Chatbot IA', 'Recomendador IA', 'Moderacion IA', 'Resumen IA', 'Busqueda semantica', 'Clasificador', 'Asistente', 'Generador contenido', 'Forecast IA', 'Soporte IA'],
  Infraestructura: ['Cache app', 'Cola jobs', 'Workers', 'Observabilidad', 'Escalado', 'Balanceo', 'CDN app', 'DB replicas', 'Circuit breaker', 'Performance budget'],
};

const appTypes = [
  { slug: 'social-network', name: 'Red Social', icon: 'network', color: '#38bdf8', category: 'Social', difficulty: 2 },
  { slug: 'ecommerce', name: 'Ecommerce', icon: 'cart', color: '#f59e0b', category: 'Comercio', difficulty: 2 },
  { slug: 'delivery', name: 'Delivery App', icon: 'bike', color: '#22c55e', category: 'Servicios', difficulty: 1 },
  { slug: 'streaming', name: 'Streaming', icon: 'play', color: '#ef4444', category: 'Multimedia', difficulty: 4 },
  { slug: 'saas', name: 'SaaS B2B', icon: 'cloud', color: '#a78bfa', category: 'Productividad', difficulty: 3 },
  { slug: 'ai-assistant', name: 'Asistente IA', icon: 'bot', color: '#06b6d4', category: 'IA', difficulty: 5 },
];

// Lo que hace que el TIPO de app cambie la simulacion de verdad (leido por
// codestudio-engine.service.ts y launchCampaign en codestudio.service.ts).
// channelEffectiveness usa los mismos slugs que las campanas de marketing
// (ver `campaigns` mas abajo: tiktok/instagram/google-ads/facebook/tv/
// youtube/radio/influencers). Valores narrativos, no forzados a ser
// "balanceados" al centavo — son el sabor de cada categoria.
const appTypeSimulationProfiles: Record<string, Record<string, unknown>> = {
  'social-network': {
    growthMultiplier: 1.5,
    retentionBase: 0.65,
    infraCostMultiplier: 1.3,
    networkEffect: 0.7,
    bugTolerance: 0.9,
    channelEffectiveness: { tiktok: 1.8, instagram: 1.6, influencers: 1.5, facebook: 1.1, 'google-ads': 0.7, youtube: 1.2, tv: 0.6, radio: 0.5 },
  },
  ecommerce: {
    growthMultiplier: 1.0,
    retentionBase: 0.7,
    infraCostMultiplier: 1.1,
    networkEffect: 0.1,
    bugTolerance: 0.6,
    channelEffectiveness: { 'google-ads': 1.6, facebook: 1.4, instagram: 1.3, influencers: 1.2, tiktok: 1.1, youtube: 0.9, tv: 0.8, radio: 0.6 },
  },
  delivery: {
    growthMultiplier: 1.3,
    retentionBase: 0.6,
    infraCostMultiplier: 0.9,
    networkEffect: 0.15,
    bugTolerance: 0.65,
    channelEffectiveness: { influencers: 1.4, 'google-ads': 1.3, facebook: 1.3, tiktok: 1.3, instagram: 1.2, tv: 1.0, radio: 0.9, youtube: 0.8 },
  },
  streaming: {
    growthMultiplier: 1.3,
    retentionBase: 0.75,
    infraCostMultiplier: 2.0,
    networkEffect: 0.2,
    bugTolerance: 0.5,
    channelEffectiveness: { youtube: 1.7, tiktok: 1.5, influencers: 1.4, instagram: 1.3, tv: 1.2, facebook: 1.0, 'google-ads': 0.8, radio: 0.5 },
  },
  saas: {
    growthMultiplier: 0.75,
    retentionBase: 0.9,
    infraCostMultiplier: 0.8,
    networkEffect: 0.05,
    bugTolerance: 0.55,
    channelEffectiveness: { 'google-ads': 1.6, facebook: 1.2, influencers: 1.1, youtube: 0.9, instagram: 0.8, tiktok: 0.6, tv: 0.5, radio: 0.4 },
  },
  'ai-assistant': {
    growthMultiplier: 1.1,
    retentionBase: 0.7,
    infraCostMultiplier: 1.6,
    networkEffect: 0.1,
    bugTolerance: 0.6,
    channelEffectiveness: { youtube: 1.5, tiktok: 1.4, influencers: 1.3, 'google-ads': 1.2, instagram: 1.1, facebook: 0.9, tv: 0.6, radio: 0.4 },
  },
};

const technologies = [
  'Cloud', 'Docker', 'Microservicios', 'CDN', 'Cache', 'Balanceador', 'Compresion', 'Optimizacion',
  'Base de Datos', 'Seguridad', 'Observabilidad', 'Serverless', 'WebSockets', 'Machine Learning',
];

const research = [
  'Arquitectura escalable', 'UX de onboarding', 'Growth loops', 'Calidad automatizada', 'IA aplicada',
  'Costos eficientes', 'Privacidad avanzada', 'Monetizacion premium',
];

const campaigns = [
  ['TikTok', 'Social'], ['Instagram', 'Social'], ['Google Ads', 'Search'], ['Facebook', 'Social'],
  ['TV', 'Masivo'], ['YouTube', 'Video'], ['Radio', 'Masivo'], ['Influencers', 'Creator'],
];

const events = [
  'Black Friday', 'Competidor lanza nueva funcion', 'Servidor saturado', 'Nueva regulacion',
  'Tendencia viral', 'Ataque de bots', 'Problemas de pagos', 'Influencer recomienda la App',
  'Cambio de algoritmo', 'Caida mundial',
];

const employeeTypes: Array<[string, string, number]> = [
  ['frontend', 'Frontend', 850], ['backend', 'Backend', 900], ['fullstack', 'FullStack', 1100],
  ['ux', 'UX', 780], ['qa', 'QA', 720], ['marketing', 'Marketing', 760], ['devops', 'DevOps', 1150],
  ['support', 'Soporte', 620], ['data-scientist', 'Data Scientist', 1250], ['product-manager', 'Product Manager', 1200],
  ['community-manager', 'Community Manager', 700],
];

// Costos escalados para que el stack completo (suma ~7100) supere el cash
// inicial del blueprint (6000) — antes sumaban ~2070 y un jugador podia
// comprar las 8 piezas de infraestructura de una sola vez apenas fundaba la
// empresa, sin sentir ninguna decision economica real. Ahora las primeras
// (Backup, Monitorizacion) siguen siendo desbloqueos rapidos y baratos, y las
// de mayor impacto (Balanceador, Base de Datos, Servidor) quedan como metas
// de mediano plazo que hay que ganarse con ingresos, no comprar todas de
// entrada.
const infrastructure: Array<[string, string, number, { capacity: number; latency: number; stability: number }]> = [
  ['backup', 'Backup', 200, { capacity: 500, latency: 180, stability: 99 }],
  ['monitoring', 'Monitorizacion', 260, { capacity: 600, latency: 120, stability: 99 }],
  ['cache', 'Cache', 480, { capacity: 800, latency: 45, stability: 99 }],
  ['firewall', 'Firewall', 620, { capacity: 900, latency: 110, stability: 99 }],
  ['cdn', 'CDN', 780, { capacity: 1500, latency: 55, stability: 99 }],
  ['server', 'Servidor', 1200, { capacity: 1200, latency: 130, stability: 98 }],
  ['database', 'Base de Datos', 1350, { capacity: 1000, latency: 90, stability: 98 }],
  ['load-balancer', 'Balanceador', 2200, { capacity: 1800, latency: 70, stability: 99 }],
];

export async function seedCodeStudio(prisma: PrismaClient) {
  console.log('Seed CodeStudio...');

  const createdModules: Record<string, string> = {};
  let order = 0;
  for (const [category, names] of Object.entries(moduleCategories)) {
    // Cada categoria es una cadena: la feature N exige tener ya INSTALADA
    // (no solo en desarrollo) la feature N-1 de la misma categoria, sin
    // importar cuanto cash tengas (mismo patron que el arbol de tecnologia).
    // "Login" es la primera de Autenticacion, asi que OAuth/2FA/SSO quedan
    // detras de ella en la cadena — es literalmente el ejemplo que pediste.
    let previousSlug: string | null = null;
    for (const name of names) {
      const slug = slugify(`${category}-${name}`);
      const requirements = { requires: previousSlug ? [previousSlug] : [] } as Prisma.InputJsonValue;
      const module = await prisma.codeStudioModule.upsert({
        where: { slug },
        update: { requirements },
        create: {
          slug,
          name,
          description: `${name} para apps de categoria ${category}.`,
          icon: slug,
          category,
          difficulty: 1 + (order % 5),
          cost: 120 + (order % 10) * 45,
          developmentSeconds: 90 + (order % 12) * 35,
          experience: 10 + (order % 8) * 5,
          order,
          requirements,
          effects: {
            growth: Number((0.005 + (order % 6) * 0.003).toFixed(3)),
            revenue: Number((0.002 + (order % 5) * 0.002).toFixed(3)),
            satisfaction: Number((0.1 + (order % 4) * 0.08).toFixed(2)),
          } as Prisma.InputJsonValue,
        },
      });
      createdModules[slug] = module.id;
      previousSlug = slug;
      order++;
    }
  }

  for (const [index, type] of appTypes.entries()) {
    const simulationProfile = appTypeSimulationProfiles[type.slug] as Prisma.InputJsonValue;
    const appType = await prisma.codeStudioAppType.upsert({
      where: { slug: type.slug },
      // simulationProfile SI se actualiza en cada seed (es balance, no
      // contenido fijo) — mismo criterio que baseCost en infrastructure y
      // requirements en technology/module.
      update: { simulationProfile },
      create: {
        ...type,
        description: `Blueprint base para construir una startup tipo ${type.name}.`,
        order: index,
        metadata: { audience: type.category } as Prisma.InputJsonValue,
        simulationProfile,
      },
    });

    const blueprint = await prisma.codeStudioBlueprint.upsert({
      where: { appTypeId: appType.id },
      update: {},
      create: {
        appTypeId: appType.id,
        name: `${type.name} Blueprint`,
        initialStats: { cash: 6000, reputation: 5 + index, innovation: 1 + index * 0.2, satisfaction: 78 } as Prisma.InputJsonValue,
        requirements: { minLevel: 1 } as Prisma.InputJsonValue,
        technologies: technologies.slice(0, 4 + index).map(slugify) as Prisma.InputJsonValue,
        suggestedCosts: { prototype: 1000, launch: 5000 } as Prisma.InputJsonValue,
        suggestedTimes: { prototypeHours: 2, launchHours: 12 } as Prisma.InputJsonValue,
        compatibleEvents: events.map(slugify) as Prisma.InputJsonValue,
        recommendedEmployees: [
          { slug: 'frontend', count: 1 },
          { slug: index % 2 === 0 ? 'backend' : 'marketing', count: 1 },
        ] as Prisma.InputJsonValue,
        initialInfrastructure: [
          { slug: 'server', level: 1 },
          { slug: 'database', level: 1 },
          { slug: 'monitoring', level: 1 },
        ] as Prisma.InputJsonValue,
      },
    });

    const starterSlugs = Object.keys(createdModules).slice(index * 8, index * 8 + 10);
    for (const [moduleOrder, slug] of starterSlugs.entries()) {
      await prisma.codeStudioBlueprintModule.upsert({
        where: { blueprintId_moduleId: { blueprintId: blueprint.id, moduleId: createdModules[slug] } },
        update: {},
        create: {
          blueprintId: blueprint.id,
          moduleId: createdModules[slug],
          order: moduleOrder,
          required: moduleOrder < 3,
          parentIds: moduleOrder === 0 ? [] : [starterSlugs[moduleOrder - 1]] as Prisma.InputJsonValue,
          position: { x: 120 + moduleOrder * 110, y: 120 + (moduleOrder % 3) * 90 } as Prisma.InputJsonValue,
        },
      });
    }
  }

  // Cada categoria (Infraestructura / Plataforma) es una rama del arbol:
  // el nodo N de una rama exige tener desbloqueado el nodo N-1 de la MISMA
  // rama (requirements.requires), asi el jugador avanza en cadena en vez de
  // comprar cualquier tecnologia suelta. cost/effects SI se actualizan en
  // cada seed (a diferencia de la mayoria de upserts de este archivo) porque
  // son valores de balance, igual que baseCost en infrastructure arriba.
  const previousTechSlugByCategory: Record<string, string | null> = {};
  for (const [index, name] of technologies.entries()) {
    const slug = slugify(name);
    const category = index < 8 ? 'Infraestructura' : 'Plataforma';
    const requiresSlug = previousTechSlugByCategory[category] ?? null;
    const cost = 300 + index * 80;
    const effects = { stability: 1 + index * 0.1, latency: -index } as Prisma.InputJsonValue;
    const requirements = { requires: requiresSlug ? [requiresSlug] : [] } as Prisma.InputJsonValue;
    await prisma.codeStudioTechnology.upsert({
      where: { slug },
      update: { cost, effects, requirements },
      create: {
        slug,
        name,
        description: `${name} mejora la escalabilidad y calidad de las apps.`,
        category,
        cost,
        order: index,
        effects,
        requirements,
      },
    });
    previousTechSlugByCategory[category] = slug;
  }

  for (const [index, name] of research.entries()) {
    await prisma.codeStudioResearch.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: {
        slug: slugify(name),
        name,
        description: `Investigacion: ${name}.`,
        durationSeconds: 300 + index * 120,
        cost: 500 + index * 150,
        order: index,
        rewards: { innovation: 0.5 + index * 0.1 } as Prisma.InputJsonValue,
      },
    });
  }

  for (const [index, [name, channel]] of campaigns.entries()) {
    await prisma.codeStudioCampaign.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: {
        slug: slugify(name),
        name,
        channel,
        description: `Campana editable para ${name}.`,
        baseCost: 150 + index * 90,
        order: index,
        config: { minBudget: 100, maxBudget: 50000 } as Prisma.InputJsonValue,
        effects: { growth: 0.02 + index * 0.005 } as Prisma.InputJsonValue,
      },
    });
  }

  for (const [index, name] of events.entries()) {
    await prisma.codeStudioEventTemplate.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: {
        slug: slugify(name),
        name,
        description: `Evento procedural: ${name}.`,
        category: index % 2 === 0 ? 'Oportunidad' : 'Riesgo',
        severity: 1 + (index % 5),
        weight: 10 + index,
        effects: { users: index % 2 === 0 ? 0.12 : -0.08, satisfaction: index % 2 === 0 ? 3 : -5 } as Prisma.InputJsonValue,
      },
    });
  }

  for (const [index, [slug, name, salary]] of employeeTypes.entries()) {
    await prisma.codeStudioEmployeeType.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name,
        category: index < 5 ? 'Producto' : 'Operacion',
        salary: Number(salary),
        order: index,
        baseStats: {
          productivity: 0.8 + (index % 4) * 0.12,
          creativity: 0.7 + (index % 5) * 0.1,
          speed: 0.8 + (index % 3) * 0.15,
          quality: 0.85 + (index % 4) * 0.08,
        } as Prisma.InputJsonValue,
      },
    });
  }

  for (const [index, [slug, name, baseCost, scaling]] of infrastructure.entries()) {
    await prisma.codeStudioInfrastructureType.upsert({
      where: { slug: String(slug) },
      // A diferencia de los demas upserts de este archivo, este SI actualiza
      // en cada seed: baseCost es un valor de balance economico pensado para
      // ajustarse con el tiempo, no contenido fijo — sin esto, re-ejecutar el
      // seed nunca aplicaria cambios de precio a una base de datos que ya
      // tiene las filas creadas.
      update: {
        baseCost: Number(baseCost),
        scaling: scaling as Prisma.InputJsonValue,
      },
      create: {
        slug: String(slug),
        name: String(name),
        category: 'Infraestructura',
        baseCost: Number(baseCost),
        order: index,
        scaling: scaling as Prisma.InputJsonValue,
      },
    });
  }

  for (const [index, name] of ['Primer lanzamiento', '1000 usuarios', 'Rating 4+', 'Empresa rentable', 'Infraestructura solida'].entries()) {
    await prisma.codeStudioAchievement.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: {
        slug: slugify(name),
        name,
        description: `Logro de CodeStudio: ${name}.`,
        order: index,
        conditions: { milestone: slugify(name) } as Prisma.InputJsonValue,
        rewards: { coins: 100 + index * 150, xp: 50 + index * 25 } as Prisma.InputJsonValue,
      },
    });
  }

  console.log(`Seed CodeStudio completado: ${Object.keys(createdModules).length} modulos.`);
}
