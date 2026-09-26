// Catálogo económico de CodeStudio v2 (tipos de app, roles, hosting y
// canales de marketing). Vive en código y se sincroniza a la base de datos
// al arrancar la API (codestudio-catalog-sync.service.ts) — así un deploy
// trae el balance nuevo sin correr seeds a mano en producción.

export type AppTypeContent = {
  slug: string;
  name: string;
  icon: string;
  color: string;
  category: string;
  difficulty: number;
  description: string;
  profile: {
    growthMultiplier: number;
    // 0..1 — más alto = los usuarios se van menos (ver engine).
    retentionBase: number;
    infraCostMultiplier: number;
    networkEffect: number;
    bugTolerance: number;
    // Tamaño del mercado: el crecimiento se frena al acercarse.
    tam: number;
    startingCash: number;
    minFounderLevel: number;
    // Multiplicador sobre los efectos positivos de cada feature: lo que
    // hace que construir "Publicidad" en una red social rinda el doble que
    // en un SaaS B2B.
    featureFit: Record<string, number>;
    channelEffectiveness: Record<string, number>;
  };
};

export const APP_TYPES: AppTypeContent[] = [
  {
    slug: 'delivery',
    name: 'Delivery App',
    icon: 'bike',
    color: '#22c55e',
    category: 'Servicios',
    difficulty: 1,
    description: 'Pedidos a domicilio. Crecimiento rápido, clientes poco fieles y cobro por comisión.',
    profile: {
      growthMultiplier: 1.3,
      retentionBase: 0.55,
      infraCostMultiplier: 0.9,
      networkEffect: 0.15,
      bugTolerance: 0.6,
      tam: 8_000_000,
      startingCash: 6000,
      minFounderLevel: 1,
      featureFit: { payments: 1.6, 'mobile-app': 1.5, push: 1.4, ads: 0.6, 'teams-plan': 0.5 },
      channelEffectiveness: { influencers: 1.4, 'google-ads': 1.3, facebook: 1.3, tiktok: 1.3, instagram: 1.2, tv: 1.0, radio: 1.1, youtube: 0.8 },
    },
  },
  {
    slug: 'ecommerce',
    name: 'Ecommerce',
    icon: 'cart',
    color: '#f59e0b',
    category: 'Comercio',
    difficulty: 2,
    description: 'Tienda online. Vive de la búsqueda, los pagos y de que el checkout no falle.',
    profile: {
      growthMultiplier: 1.0,
      retentionBase: 0.65,
      infraCostMultiplier: 1.1,
      networkEffect: 0.1,
      bugTolerance: 0.5,
      tam: 15_000_000,
      startingCash: 6500,
      minFounderLevel: 1,
      featureFit: { payments: 1.8, search: 1.5, personalization: 1.4, seo: 1.4, ads: 0.7, 'teams-plan': 0.5 },
      channelEffectiveness: { 'google-ads': 1.6, facebook: 1.4, instagram: 1.3, influencers: 1.2, tiktok: 1.1, youtube: 0.9, tv: 0.8, radio: 0.6 },
    },
  },
  {
    slug: 'social-network',
    name: 'Red Social',
    icon: 'network',
    color: '#38bdf8',
    category: 'Social',
    difficulty: 2,
    description: 'Todo depende del efecto red: vacía no le sirve a nadie, llena es imparable. Vive de anuncios.',
    profile: {
      growthMultiplier: 1.4,
      retentionBase: 0.6,
      infraCostMultiplier: 1.3,
      networkEffect: 0.8,
      bugTolerance: 0.8,
      tam: 40_000_000,
      startingCash: 6000,
      minFounderLevel: 2,
      featureFit: { ads: 2.2, 'social-sharing': 1.6, community: 1.6, referrals: 1.3, profiles: 1.5, subscriptions: 0.5, 'teams-plan': 0.3, payments: 0.6 },
      channelEffectiveness: { tiktok: 1.8, instagram: 1.6, influencers: 1.5, facebook: 1.1, 'google-ads': 0.7, youtube: 1.2, tv: 0.6, radio: 0.5 },
    },
  },
  {
    slug: 'saas',
    name: 'SaaS B2B',
    icon: 'cloud',
    color: '#a78bfa',
    category: 'Productividad',
    difficulty: 3,
    description: 'Software para empresas. Pocos usuarios pero fieles y que pagan bien. Crecer es lento.',
    profile: {
      growthMultiplier: 0.7,
      retentionBase: 0.85,
      infraCostMultiplier: 0.8,
      networkEffect: 0.05,
      bugTolerance: 0.45,
      tam: 2_000_000,
      startingCash: 7000,
      minFounderLevel: 3,
      featureFit: { subscriptions: 1.8, 'teams-plan': 2.2, 'annual-plans': 1.5, 'free-trial': 1.4, compliance: 1.5, ads: 0.3, 'social-sharing': 0.5, 'mobile-app': 0.6 },
      channelEffectiveness: { 'google-ads': 1.6, facebook: 1.0, influencers: 1.1, youtube: 1.0, instagram: 0.7, tiktok: 0.5, tv: 0.5, radio: 0.4 },
    },
  },
  {
    slug: 'streaming',
    name: 'Streaming',
    icon: 'play',
    color: '#ef4444',
    category: 'Multimedia',
    difficulty: 4,
    description: 'Video bajo demanda. Suscripciones fuertes, pero servir video es carísimo.',
    profile: {
      growthMultiplier: 1.2,
      retentionBase: 0.7,
      infraCostMultiplier: 2.0,
      networkEffect: 0.2,
      bugTolerance: 0.4,
      tam: 25_000_000,
      startingCash: 9000,
      minFounderLevel: 4,
      featureFit: { subscriptions: 1.6, cdn: 1.8, personalization: 1.6, 'ai-recommendations': 1.5, ads: 0.8 },
      channelEffectiveness: { youtube: 1.7, tiktok: 1.5, influencers: 1.4, instagram: 1.3, tv: 1.3, facebook: 1.0, 'google-ads': 0.8, radio: 0.5 },
    },
  },
  {
    slug: 'ai-assistant',
    name: 'Asistente IA',
    icon: 'bot',
    color: '#06b6d4',
    category: 'IA',
    difficulty: 5,
    description: 'Un asistente inteligente. Los usuarios pagan bien, pero cada consulta cuesta servidores.',
    profile: {
      growthMultiplier: 1.1,
      retentionBase: 0.65,
      infraCostMultiplier: 1.8,
      networkEffect: 0.1,
      bugTolerance: 0.5,
      tam: 20_000_000,
      startingCash: 9000,
      minFounderLevel: 5,
      featureFit: { subscriptions: 1.5, 'support-bot': 1.6, 'ai-recommendations': 1.8, personalization: 1.4, 'teams-plan': 1.3, ads: 0.4 },
      channelEffectiveness: { youtube: 1.5, tiktok: 1.4, influencers: 1.3, 'google-ads': 1.2, instagram: 1.1, facebook: 0.9, tv: 0.6, radio: 0.4 },
    },
  },
];

export const APP_TYPE_BY_SLUG = new Map(APP_TYPES.map((type) => [type.slug, type]));

// Roles: cada uno cambia la simulación de una forma distinta y explicable
// (ver ROLE_EFFECTS en el engine). "devPower" es cuánto aporta a construir
// features (el fundador solo aporta 0.6).
export type RoleContent = {
  slug: string;
  name: string;
  category: 'Producto' | 'Operación';
  salary: number;
  devPower: number;
  description: string;
  baseStats: { productivity: number; speed: number; quality: number; creativity: number };
};

export const ROLES: RoleContent[] = [
  { slug: 'fullstack', name: 'FullStack', category: 'Producto', salary: 1300, devPower: 1.25, description: 'Construye features rápido, de punta a punta.', baseStats: { productivity: 1.1, speed: 1.15, quality: 0.9, creativity: 1 } },
  { slug: 'frontend', name: 'Frontend', category: 'Producto', salary: 900, devPower: 1, description: 'Construye features. +2 satisfacción por la interfaz pulida.', baseStats: { productivity: 1, speed: 1, quality: 0.95, creativity: 1.1 } },
  { slug: 'backend', name: 'Backend', category: 'Producto', salary: 1000, devPower: 1, description: 'Construye features. Puede arreglar bugs de servidor y +10% capacidad.', baseStats: { productivity: 1, speed: 1, quality: 1, creativity: 0.9 } },
  { slug: 'qa', name: 'QA', category: 'Producto', salary: 800, devPower: 0.3, description: 'Cada QA baja la probabilidad de bugs al publicar y limpia deuda técnica.', baseStats: { productivity: 0.8, speed: 0.9, quality: 1.3, creativity: 0.8 } },
  { slug: 'ux', name: 'Diseñador UX', category: 'Producto', salary: 850, devPower: 0.4, description: '+satisfacción: la app se entiende sin manual.', baseStats: { productivity: 0.9, speed: 0.9, quality: 1.1, creativity: 1.3 } },
  { slug: 'product-manager', name: 'Product Manager', category: 'Producto', salary: 1300, devPower: 0, description: 'El equipo construye 12% más rápido y con menos bugs.', baseStats: { productivity: 1, speed: 1, quality: 1.05, creativity: 1.1 } },
  { slug: 'devops', name: 'DevOps', category: 'Operación', salary: 1300, devPower: 0.5, description: '+estabilidad, −latencia y −8% en costos de servidores.', baseStats: { productivity: 1, speed: 1, quality: 1.1, creativity: 0.9 } },
  { slug: 'marketing', name: 'Marketing', category: 'Operación', salary: 850, devPower: 0, description: '+6 usuarios orgánicos por día y campañas 10% más baratas.', baseStats: { productivity: 1, speed: 1, quality: 1, creativity: 1.2 } },
  { slug: 'support', name: 'Soporte', category: 'Operación', salary: 600, devPower: 0, description: '+satisfacción y los bugs abiertos duelen menos. Uno por cada ~3.000 usuarios.', baseStats: { productivity: 1, speed: 1, quality: 1, creativity: 0.9 } },
  { slug: 'community-manager', name: 'Community Manager', category: 'Operación', salary: 700, devPower: 0, description: '+retención y un poco de crecimiento viral.', baseStats: { productivity: 1, speed: 1, quality: 1, creativity: 1.2 } },
  { slug: 'data-scientist', name: 'Data Scientist', category: 'Operación', salary: 1400, devPower: 0.5, description: '+8% ingresos por usuario. Puede arreglar bugs de datos.', baseStats: { productivity: 1, speed: 1, quality: 1.1, creativity: 1.1 } },
];

export const ROLE_BY_SLUG = new Map(ROLES.map((role) => [role.slug, role]));

// Perfiles técnicos que pueden tomar un bug (tarda, pero no cuesta caja).
export const BUG_CAPABLE_ROLES = new Set(['backend', 'fullstack', 'devops', 'qa', 'data-scientist']);

// Contratar cobra medio sueldo de bono; despedir, medio sueldo de indemnización.
export const HIRE_BONUS_FACTOR = 0.5;
export const SEVERANCE_FACTOR = 0.5;

// Hosting: capacidad (usuarios que aguanta por nivel) y costo MENSUAL.
// Instalar/mejorar cobra `install × nivel`; el mensual se paga todos los
// días (÷30) mientras exista.
export type HostingContent = {
  slug: string;
  name: string;
  description: string;
  minStage: number;
  install: number;
  monthly: number;
  capacity: number;
  latency: number;
  stability: number;
  maxLevel: number;
  active: boolean;
};

export const HOSTING: HostingContent[] = [
  { slug: 'server', name: 'Servidor de aplicación', description: 'Un VPS para correr tu app. Lo mínimo para estar en línea.', minStage: 0, install: 250, monthly: 150, capacity: 400, latency: 130, stability: 96, maxLevel: 5, active: true },
  { slug: 'database', name: 'Base de datos gestionada', description: 'Postgres administrado: backups y parches incluidos.', minStage: 1, install: 400, monthly: 200, capacity: 800, latency: 110, stability: 98, maxLevel: 5, active: true },
  { slug: 'load-balancer', name: 'Balanceador + 2 servidores', description: 'Reparte el tráfico: si un servidor cae, el otro sigue.', minStage: 3, install: 1500, monthly: 600, capacity: 3000, latency: 85, stability: 99, maxLevel: 5, active: true },
  { slug: 'cloud-cluster', name: 'Clúster Kubernetes', description: 'Decenas de contenedores orquestados. Para crecer en serio.', minStage: 4, install: 8000, monthly: 3000, capacity: 25000, latency: 70, stability: 99.5, maxLevel: 5, active: true },
  { slug: 'multi-region', name: 'Infraestructura multi-región', description: 'Servidores en varios continentes. Latencia baja en todo el mundo.', minStage: 5, install: 60000, monthly: 20000, capacity: 250000, latency: 50, stability: 99.9, maxLevel: 5, active: true },
  // Tipos del catálogo viejo: siguen existiendo en empresas antiguas, pero
  // ya no se venden (sus funciones pasaron al árbol: Backups, CDN, Caché…).
  { slug: 'backup', name: 'Backup', description: 'Legado.', minStage: 0, install: 200, monthly: 60, capacity: 100, latency: 180, stability: 99, maxLevel: 1, active: false },
  { slug: 'monitoring', name: 'Monitorizacion', description: 'Legado.', minStage: 0, install: 260, monthly: 60, capacity: 100, latency: 120, stability: 99, maxLevel: 1, active: false },
  { slug: 'cache', name: 'Cache', description: 'Legado.', minStage: 0, install: 480, monthly: 80, capacity: 300, latency: 45, stability: 99, maxLevel: 1, active: false },
  { slug: 'firewall', name: 'Firewall', description: 'Legado.', minStage: 0, install: 620, monthly: 80, capacity: 100, latency: 110, stability: 99, maxLevel: 1, active: false },
  { slug: 'cdn', name: 'CDN', description: 'Legado.', minStage: 0, install: 780, monthly: 100, capacity: 400, latency: 55, stability: 99, maxLevel: 1, active: false },
];

export const HOSTING_BY_SLUG = new Map(HOSTING.map((item) => [item.slug, item]));

// Marketing con CAC real: usuarios = presupuesto / costo por usuario. El
// CAC sube si repites el mismo canal seguido (fatiga), baja con buen rating
// y analítica, y depende del tipo de app (channelEffectiveness).
export type ChannelContent = { slug: string; name: string; channel: string; baseCost: number; baseCac: number; minStage: number };

export const CHANNELS: ChannelContent[] = [
  { slug: 'tiktok', name: 'TikTok', channel: 'Social', baseCost: 300, baseCac: 3.5, minStage: 1 },
  { slug: 'instagram', name: 'Instagram', channel: 'Social', baseCost: 300, baseCac: 4, minStage: 1 },
  { slug: 'google-ads', name: 'Google Ads', channel: 'Búsqueda', baseCost: 400, baseCac: 5, minStage: 1 },
  { slug: 'facebook', name: 'Facebook', channel: 'Social', baseCost: 350, baseCac: 4.5, minStage: 1 },
  { slug: 'influencers', name: 'Influencers', channel: 'Creadores', baseCost: 800, baseCac: 3.5, minStage: 2 },
  { slug: 'youtube', name: 'YouTube', channel: 'Video', baseCost: 600, baseCac: 6, minStage: 2 },
  { slug: 'radio', name: 'Radio', channel: 'Masivo', baseCost: 2000, baseCac: 6, minStage: 3 },
  { slug: 'tv', name: 'TV', channel: 'Masivo', baseCost: 15000, baseCac: 7, minStage: 4 },
];

export const CHANNEL_BY_SLUG = new Map(CHANNELS.map((channel) => [channel.slug, channel]));

export const CAMPAIGN_BUDGET_MULTIPLIERS = [1, 3, 10] as const;

// Minutos reales en los que un canal repetido se considera "fatigado".
export const CAMPAIGN_FATIGUE_WINDOW_MS = 15 * 60 * 1000;
