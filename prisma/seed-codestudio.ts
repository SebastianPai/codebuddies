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

const infrastructure: Array<[string, string, number, { capacity: number; latency: number; stability: number }]> = [
  ['server', 'Servidor', 300, { capacity: 1200, latency: 130, stability: 98 }],
  ['database', 'Base de Datos', 350, { capacity: 1000, latency: 90, stability: 98 }],
  ['cache', 'Cache', 220, { capacity: 800, latency: 45, stability: 99 }],
  ['cdn', 'CDN', 280, { capacity: 1500, latency: 55, stability: 99 }],
  ['load-balancer', 'Balanceador', 320, { capacity: 1800, latency: 70, stability: 99 }],
  ['firewall', 'Firewall', 260, { capacity: 900, latency: 110, stability: 99 }],
  ['monitoring', 'Monitorizacion', 180, { capacity: 600, latency: 120, stability: 99 }],
  ['backup', 'Backup', 160, { capacity: 500, latency: 180, stability: 99 }],
];

export async function seedCodeStudio(prisma: PrismaClient) {
  console.log('Seed CodeStudio...');

  const createdModules: Record<string, string> = {};
  let order = 0;
  for (const [category, names] of Object.entries(moduleCategories)) {
    for (const name of names) {
      const slug = slugify(`${category}-${name}`);
      const module = await prisma.codeStudioModule.upsert({
        where: { slug },
        update: {},
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
          effects: {
            growth: Number((0.005 + (order % 6) * 0.003).toFixed(3)),
            revenue: Number((0.002 + (order % 5) * 0.002).toFixed(3)),
            satisfaction: Number((0.1 + (order % 4) * 0.08).toFixed(2)),
          } as Prisma.InputJsonValue,
        },
      });
      createdModules[slug] = module.id;
      order++;
    }
  }

  for (const [index, type] of appTypes.entries()) {
    const appType = await prisma.codeStudioAppType.upsert({
      where: { slug: type.slug },
      update: {},
      create: {
        ...type,
        description: `Blueprint base para construir una startup tipo ${type.name}.`,
        order: index,
        metadata: { audience: type.category } as Prisma.InputJsonValue,
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

  for (const [index, name] of technologies.entries()) {
    await prisma.codeStudioTechnology.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: {
        slug: slugify(name),
        name,
        description: `${name} mejora la escalabilidad y calidad de las apps.`,
        category: index < 8 ? 'Infraestructura' : 'Plataforma',
        cost: 300 + index * 80,
        order: index,
        effects: { stability: 1 + index * 0.1, latency: -index } as Prisma.InputJsonValue,
      },
    });
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
      update: {},
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
