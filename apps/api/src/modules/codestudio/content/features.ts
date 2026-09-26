// Árbol de producto de CodeStudio v2. Reemplaza las 120 "features"
// generadas por fórmula (order % 5) del seed viejo: cada nodo acá está
// escrito a mano, tiene un efecto que se entiende ("cada usuario deja
// ~$0.08/día") y prerrequisitos que tienen sentido real (no podés cobrar
// suscripciones sin una pasarela de pagos, ni pagos sin login).
//
// Unidades (ver codestudio-engine.service.ts):
// - 1 minuto real = 1 día de juego.
// - devSeconds = segundos reales a "1 punto de poder de desarrollo"
//   (el fundador solo aporta 0.6; cada dev ~1).
// - effects son por día de juego:
//   growth       usuarios nuevos orgánicos por día
//   viral        fracción de usuarios activos que trae a alguien nuevo por día
//   retention    reduce el churn (se suman, tope 0.7)
//   arpu         $ por usuario activo por día
//   conversion   multiplica los ingresos (+0.1 = +10%)
//   satisfaction puntos de satisfacción objetivo
//   load         carga extra por usuario sobre los servidores (+0.1 = +10%)
//   capacity     multiplica la capacidad de la infraestructura
//   latency      ms (negativo = más rápido)
//   stability    puntos de estabilidad
//   quality      reduce la probabilidad de bugs al publicar y la deuda técnica
//   security     protege contra incidentes de seguridad
//   cacDiscount  abarata el costo por usuario de las campañas

export type FeatureEffects = {
  growth?: number;
  viral?: number;
  retention?: number;
  arpu?: number;
  conversion?: number;
  satisfaction?: number;
  load?: number;
  capacity?: number;
  latency?: number;
  stability?: number;
  quality?: number;
  security?: number;
  cacDiscount?: number;
};

export type FeatureBranch = 'producto' | 'monetizacion' | 'crecimiento' | 'calidad' | 'escala' | 'seguridad' | 'ia';

export type FeatureDefinition = {
  slug: string;
  name: string;
  branch: FeatureBranch;
  minStage: number;
  requires: string[];
  cost: number;
  devSeconds: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  effects: FeatureEffects;
  description: string;
  // Qué aprende el jugador al construirla — se muestra en el detalle del
  // nodo y en el evento de release.
  lesson: string;
};

export const FEATURE_BRANCHES: Array<{ key: FeatureBranch; name: string; description: string }> = [
  { key: 'producto', name: 'Producto', description: 'Lo que tus usuarios usan todos los días.' },
  { key: 'monetizacion', name: 'Monetización', description: 'Sin forma de cobrar, no hay ingresos.' },
  { key: 'crecimiento', name: 'Crecimiento', description: 'Cómo llegan y vuelven los usuarios.' },
  { key: 'calidad', name: 'Calidad', description: 'Menos bugs y deploys más seguros.' },
  { key: 'escala', name: 'Rendimiento', description: 'Aguantar más usuarios sin caerse.' },
  { key: 'seguridad', name: 'Seguridad', description: 'Proteger a tus usuarios y sus datos.' },
  { key: 'ia', name: 'Inteligencia artificial', description: 'Automatizar y personalizar a escala.' },
];

export const FEATURES: FeatureDefinition[] = [
  // ── Producto ───────────────────────────────────────────────────────────
  {
    slug: 'landing',
    name: 'Landing page',
    branch: 'producto',
    minStage: 0,
    requires: [],
    cost: 100,
    devSeconds: 35,
    difficulty: 1,
    effects: { growth: 3, satisfaction: 2 },
    description: 'La primera cara de tu app: explica qué problema resuelves y capta a los curiosos.',
    lesson: 'Una landing clara convierte visitas en registros. Si nadie entiende qué haces en 5 segundos, se van.',
  },
  {
    slug: 'auth',
    name: 'Registro y login',
    branch: 'producto',
    minStage: 0,
    requires: ['landing'],
    cost: 200,
    devSeconds: 55,
    difficulty: 2,
    effects: { growth: 2, retention: 0.05, satisfaction: 3, load: 0.05 },
    description: 'Cuentas de usuario para que la gente pueda volver y guardar su información.',
    lesson: 'Casi todo depende del login: pagos, perfiles, emails. Por eso está en la raíz del árbol.',
  },
  {
    slug: 'core-feature',
    name: 'Funcionalidad principal',
    branch: 'producto',
    minStage: 0,
    requires: ['auth'],
    cost: 300,
    devSeconds: 80,
    difficulty: 2,
    effects: { growth: 4, retention: 0.1, satisfaction: 14, load: 0.1 },
    description: 'El corazón de tu app: la razón por la que alguien la usaría. Con esto completas tu MVP.',
    lesson: 'Un MVP es lo mínimo que resuelve el problema. Lánzalo pronto: el mercado te dirá qué construir después.',
  },
  {
    slug: 'profiles',
    name: 'Perfiles de usuario',
    branch: 'producto',
    minStage: 1,
    requires: ['auth'],
    cost: 250,
    devSeconds: 70,
    difficulty: 2,
    effects: { retention: 0.05, satisfaction: 3, load: 0.05 },
    description: 'Foto, nombre y preferencias. La gente cuida lo que siente propio.',
    lesson: 'Todo lo que el usuario escribe (nombre, bio) es entrada no confiable: hay que validarla y escaparla.',
  },
  {
    slug: 'onboarding',
    name: 'Onboarding guiado',
    branch: 'producto',
    minStage: 2,
    requires: ['core-feature'],
    cost: 350,
    devSeconds: 100,
    difficulty: 2,
    effects: { retention: 0.12, satisfaction: 4 },
    description: 'Un recorrido corto que lleva al usuario a su primer "¡ajá!" en minutos.',
    lesson: 'La mayoría del churn ocurre el primer día. Un buen onboarding es la mejora de retención más barata.',
  },
  {
    slug: 'search',
    name: 'Búsqueda',
    branch: 'producto',
    minStage: 3,
    requires: ['core-feature'],
    cost: 600,
    devSeconds: 150,
    difficulty: 3,
    effects: { satisfaction: 5, retention: 0.06, load: 0.12 },
    description: 'Encontrar cualquier cosa en segundos. Imprescindible cuando hay mucho contenido.',
    lesson: 'Una búsqueda sin índices recorre toda la tabla. Funciona con 100 filas y muere con 1 millón.',
  },
  {
    slug: 'mobile-app',
    name: 'App móvil',
    branch: 'producto',
    minStage: 3,
    requires: ['onboarding'],
    cost: 2500,
    devSeconds: 330,
    difficulty: 4,
    effects: { growth: 25, retention: 0.08, satisfaction: 5, load: 0.1 },
    description: 'Llegar a las tiendas de apps y al bolsillo de tus usuarios.',
    lesson: 'Una app móvil es otro producto que mantener: otra base de código, otras reglas de publicación.',
  },
  {
    slug: 'personalization',
    name: 'Recomendaciones personalizadas',
    branch: 'producto',
    minStage: 4,
    requires: ['search', 'analytics'],
    cost: 1800,
    devSeconds: 280,
    difficulty: 4,
    effects: { retention: 0.12, conversion: 0.1, load: 0.15 },
    description: 'Mostrar a cada usuario lo que más le interesa según su comportamiento.',
    lesson: 'Personalizar requiere datos: sin analítica no sabes qué recomendar.',
  },

  // ── Monetización ───────────────────────────────────────────────────────
  {
    slug: 'ads',
    name: 'Publicidad',
    branch: 'monetizacion',
    minStage: 1,
    requires: ['landing'],
    cost: 150,
    devSeconds: 45,
    difficulty: 1,
    effects: { arpu: 0.015, satisfaction: -6 },
    description: 'Dinero fácil y rápido, pero molesta a tus usuarios.',
    lesson: 'Los anuncios pagan poco por usuario y bajan la satisfacción. Sirven si tienes MUCHOS usuarios.',
  },
  {
    slug: 'payments',
    name: 'Pasarela de pagos',
    branch: 'monetizacion',
    minStage: 1,
    requires: ['auth'],
    cost: 400,
    devSeconds: 90,
    difficulty: 3,
    effects: { arpu: 0.03 },
    description: 'Cobrar con tarjeta: compras dentro de la app y la base para todo lo demás.',
    lesson: 'Los pagos se procesan con webhooks que pueden llegar dos veces. Todo cobro necesita ser idempotente.',
  },
  {
    slug: 'subscriptions',
    name: 'Plan Premium (suscripción)',
    branch: 'monetizacion',
    minStage: 2,
    requires: ['payments'],
    cost: 700,
    devSeconds: 140,
    difficulty: 3,
    effects: { arpu: 0.05 },
    description: 'Ingresos recurrentes cada mes: el modelo favorito de los SaaS.',
    lesson: 'MRR (ingreso mensual recurrente) es la métrica reina: predecible y fácil de proyectar.',
  },
  {
    slug: 'free-trial',
    name: 'Prueba gratis de 7 días',
    branch: 'monetizacion',
    minStage: 2,
    requires: ['subscriptions'],
    cost: 400,
    devSeconds: 80,
    difficulty: 2,
    effects: { conversion: 0.25, growth: 3 },
    description: 'Que prueben Premium sin riesgo. Muchos se quedan.',
    lesson: 'Una prueba gratis reduce la fricción de pagar. Mide cuántos convierten al terminar.',
  },
  {
    slug: 'annual-plans',
    name: 'Planes anuales',
    branch: 'monetizacion',
    minStage: 3,
    requires: ['subscriptions'],
    cost: 500,
    devSeconds: 90,
    difficulty: 2,
    effects: { retention: 0.1, conversion: 0.05 },
    description: 'Descuento por pagar el año: más caja hoy y menos cancelaciones.',
    lesson: 'Un cliente anual no puede cancelar cada mes: el plan anual es retención comprada con descuento.',
  },
  {
    slug: 'teams-plan',
    name: 'Plan Empresas (B2B)',
    branch: 'monetizacion',
    minStage: 4,
    requires: ['annual-plans', 'two-factor'],
    cost: 3000,
    devSeconds: 340,
    difficulty: 5,
    effects: { arpu: 0.06, conversion: 0.1 },
    description: 'Cuentas de equipo, facturación y permisos para empresas. Tickets grandes.',
    lesson: 'Las empresas pagan más, pero exigen seguridad (2FA, auditoría) antes de firmar.',
  },

  // ── Crecimiento ────────────────────────────────────────────────────────
  {
    slug: 'seo',
    name: 'SEO y blog',
    branch: 'crecimiento',
    minStage: 1,
    requires: ['landing'],
    cost: 250,
    devSeconds: 60,
    difficulty: 1,
    effects: { growth: 8 },
    description: 'Aparecer en Google cuando alguien busca lo que resuelves. Tráfico gratis y constante.',
    lesson: 'El SEO es lento pero acumulativo: cada artículo sigue trayendo gente durante años.',
  },
  {
    slug: 'email-notifications',
    name: 'Emails transaccionales',
    branch: 'crecimiento',
    minStage: 1,
    requires: ['auth'],
    cost: 250,
    devSeconds: 60,
    difficulty: 2,
    effects: { retention: 0.06 },
    description: 'Bienvenida, recordatorios y resúmenes que traen a la gente de vuelta.',
    lesson: 'Sin SPF/DKIM configurados, tus emails terminan en spam y nadie los lee.',
  },
  {
    slug: 'social-sharing',
    name: 'Compartir en redes',
    branch: 'crecimiento',
    minStage: 2,
    requires: ['core-feature'],
    cost: 300,
    devSeconds: 70,
    difficulty: 1,
    effects: { viral: 0.006 },
    description: 'Botones para compartir y previews bonitos en WhatsApp e Instagram.',
    lesson: 'Cada vez que alguien comparte, tu adquisición cuesta $0. Así se construye el crecimiento viral.',
  },
  {
    slug: 'analytics',
    name: 'Analítica de producto',
    branch: 'crecimiento',
    minStage: 2,
    requires: ['auth'],
    cost: 450,
    devSeconds: 100,
    difficulty: 2,
    effects: { conversion: 0.08, cacDiscount: 0.1 },
    description: 'Saber qué hacen tus usuarios: embudos, retención por cohorte, qué campaña funciona.',
    lesson: 'Lo que no se mide no se puede mejorar. La analítica abarata el marketing porque dejas de adivinar.',
  },
  {
    slug: 'referrals',
    name: 'Programa de referidos',
    branch: 'crecimiento',
    minStage: 2,
    requires: ['auth', 'email-notifications'],
    cost: 600,
    devSeconds: 120,
    difficulty: 3,
    effects: { viral: 0.012 },
    description: '"Invita a un amigo y ambos ganan". El motor de crecimiento de Dropbox.',
    lesson: 'Los referidos atraen fraude: sin rate limiting, los bots crean cuentas falsas para cobrar premios.',
  },
  {
    slug: 'ab-testing',
    name: 'A/B testing',
    branch: 'crecimiento',
    minStage: 3,
    requires: ['analytics'],
    cost: 900,
    devSeconds: 160,
    difficulty: 3,
    effects: { conversion: 0.12, satisfaction: 2 },
    description: 'Probar dos versiones y quedarte con la que funciona mejor, con datos.',
    lesson: 'Un A/B test necesita suficientes usuarios para ser significativo. Con 50 usuarios es ruido.',
  },
  {
    slug: 'push',
    name: 'Notificaciones push',
    branch: 'crecimiento',
    minStage: 3,
    requires: ['mobile-app'],
    cost: 700,
    devSeconds: 110,
    difficulty: 2,
    effects: { retention: 0.08, satisfaction: -1 },
    description: 'Avisos en el celular para que vuelvan. Úsalas con cuidado.',
    lesson: 'Demasiadas notificaciones = usuarios que las desactivan o desinstalan la app.',
  },
  {
    slug: 'community',
    name: 'Comunidad y foros',
    branch: 'crecimiento',
    minStage: 3,
    requires: ['profiles'],
    cost: 900,
    devSeconds: 170,
    difficulty: 3,
    effects: { retention: 0.1, viral: 0.004 },
    description: 'Un lugar donde tus usuarios se ayudan entre ellos y se enganchan.',
    lesson: 'Contenido de usuarios = riesgo de XSS y spam. Moderar y escapar HTML es obligatorio.',
  },

  // ── Calidad ────────────────────────────────────────────────────────────
  {
    slug: 'error-tracking',
    name: 'Monitoreo de errores',
    branch: 'calidad',
    minStage: 1,
    requires: ['core-feature'],
    cost: 200,
    devSeconds: 50,
    difficulty: 1,
    effects: { quality: 0.08, stability: 1 },
    description: 'Enterarte de cada error en producción antes de que te lo cuente un usuario enojado.',
    lesson: 'Sin monitoreo, te enteras de los bugs por las reseñas de 1 estrella.',
  },
  {
    slug: 'automated-tests',
    name: 'Tests automatizados',
    branch: 'calidad',
    minStage: 1,
    requires: ['core-feature'],
    cost: 350,
    devSeconds: 90,
    difficulty: 2,
    effects: { quality: 0.22 },
    description: 'Código que prueba tu código cada vez que cambias algo.',
    lesson: 'Los tests no evitan todos los bugs, pero evitan que el mismo bug vuelva dos veces.',
  },
  {
    slug: 'ci-cd',
    name: 'CI/CD',
    branch: 'calidad',
    minStage: 2,
    requires: ['automated-tests'],
    cost: 500,
    devSeconds: 110,
    difficulty: 3,
    effects: { quality: 0.15, stability: 1 },
    description: 'Cada cambio pasa los tests y se despliega solo. Si algo falla, no llega a producción.',
    lesson: 'Deploys pequeños y frecuentes son más seguros que un deploy gigante cada mes.',
  },
  {
    slug: 'feature-flags',
    name: 'Feature flags',
    branch: 'calidad',
    minStage: 3,
    requires: ['ci-cd'],
    cost: 600,
    devSeconds: 110,
    difficulty: 3,
    effects: { quality: 0.1 },
    description: 'Encender y apagar funcionalidades sin desplegar. Si algo sale mal, lo apagas en 1 clic.',
    lesson: 'Separar "desplegar" de "lanzar" te deja probar con el 5% de los usuarios primero.',
  },
  {
    slug: 'observability',
    name: 'Observabilidad',
    branch: 'calidad',
    minStage: 3,
    requires: ['error-tracking', 'ci-cd'],
    cost: 900,
    devSeconds: 150,
    difficulty: 3,
    effects: { stability: 2, quality: 0.08 },
    description: 'Logs, métricas y trazas para entender por qué algo va lento.',
    lesson: 'Monitoreo te dice QUE algo falla; observabilidad te dice POR QUÉ.',
  },

  // ── Rendimiento ────────────────────────────────────────────────────────
  {
    slug: 'db-indexes',
    name: 'Índices en la base de datos',
    branch: 'escala',
    minStage: 1,
    requires: ['core-feature'],
    cost: 200,
    devSeconds: 50,
    difficulty: 2,
    effects: { latency: -30, capacity: 0.2 },
    description: 'Que las consultas encuentren los datos sin revisar toda la tabla.',
    lesson: 'Un índice es como el índice de un libro: sin él, lees todas las páginas para encontrar una palabra.',
  },
  {
    slug: 'connection-pool',
    name: 'Pool de conexiones',
    branch: 'escala',
    minStage: 2,
    requires: ['db-indexes'],
    cost: 300,
    devSeconds: 65,
    difficulty: 2,
    effects: { capacity: 0.25, stability: 1 },
    description: 'Reusar conexiones a la base de datos en vez de abrir una por cada petición.',
    lesson: 'Las bases de datos aceptan pocas conexiones simultáneas. Sin pool, se agotan con el tráfico.',
  },
  {
    slug: 'cdn',
    name: 'CDN para archivos',
    branch: 'escala',
    minStage: 2,
    requires: ['core-feature'],
    cost: 400,
    devSeconds: 80,
    difficulty: 2,
    effects: { latency: -35, capacity: 0.15 },
    description: 'Imágenes y archivos servidos desde servidores cerca de cada usuario.',
    lesson: 'Servir imágenes desde tu servidor principal lo satura. Un CDN las reparte por el mundo.',
  },
  {
    slug: 'cache',
    name: 'Caché (Redis)',
    branch: 'escala',
    minStage: 2,
    requires: ['db-indexes'],
    cost: 600,
    devSeconds: 120,
    difficulty: 3,
    effects: { latency: -40, capacity: 0.4 },
    description: 'Guardar en memoria lo que se pide seguido para no calcularlo cada vez.',
    lesson: 'Hay dos cosas difíciles en programación: nombrar cosas e invalidar la caché.',
  },
  {
    slug: 'job-queue',
    name: 'Cola de trabajos',
    branch: 'escala',
    minStage: 3,
    requires: ['cache'],
    cost: 800,
    devSeconds: 150,
    difficulty: 3,
    effects: { capacity: 0.3, latency: -20 },
    description: 'Mandar emails, procesar imágenes y reportes en segundo plano.',
    lesson: 'El usuario no debería esperar a que se envíe un email para ver su pantalla.',
  },
  {
    slug: 'db-replicas',
    name: 'Réplicas de lectura',
    branch: 'escala',
    minStage: 4,
    requires: ['job-queue'],
    cost: 1800,
    devSeconds: 240,
    difficulty: 4,
    effects: { capacity: 0.8, stability: 2 },
    description: 'Copias de la base de datos que reparten las lecturas.',
    lesson: 'Las réplicas tienen un pequeño retraso: lo que escribes puede tardar en aparecer al leer.',
  },
  {
    slug: 'autoscaling',
    name: 'Autoescalado',
    branch: 'escala',
    minStage: 4,
    requires: ['db-replicas', 'observability'],
    cost: 3000,
    devSeconds: 300,
    difficulty: 5,
    effects: { capacity: 1, stability: 3 },
    description: 'Más servidores cuando hay tráfico, menos cuando no. Automático.',
    lesson: 'Para autoescalar necesitas métricas confiables: por eso depende de observabilidad.',
  },

  // ── Seguridad ──────────────────────────────────────────────────────────
  {
    slug: 'password-hashing',
    name: 'Contraseñas cifradas',
    branch: 'seguridad',
    minStage: 0,
    requires: ['auth'],
    cost: 150,
    devSeconds: 35,
    difficulty: 1,
    effects: { security: 2 },
    description: 'Guardar contraseñas con bcrypt/argon2, nunca en texto plano.',
    lesson: 'Si te roban la base de datos, un hash evita que se lleven también las contraseñas.',
  },
  {
    slug: 'backups',
    name: 'Backups automáticos',
    branch: 'seguridad',
    minStage: 1,
    requires: ['core-feature'],
    cost: 250,
    devSeconds: 55,
    difficulty: 1,
    effects: { security: 1, stability: 1 },
    description: 'Copias diarias de la base de datos para recuperarte de cualquier desastre.',
    lesson: 'Un backup que nunca probaste restaurar no es un backup, es una esperanza.',
  },
  {
    slug: 'rate-limiting',
    name: 'Rate limiting y captcha',
    branch: 'seguridad',
    minStage: 2,
    requires: ['auth'],
    cost: 350,
    devSeconds: 75,
    difficulty: 2,
    effects: { security: 2, stability: 1 },
    description: 'Limitar cuántas peticiones puede hacer cada IP. Frena bots y ataques.',
    lesson: 'Sin límites, un solo script puede crear 10.000 cuentas o probar 1 millón de contraseñas.',
  },
  {
    slug: 'two-factor',
    name: 'Verificación en 2 pasos',
    branch: 'seguridad',
    minStage: 3,
    requires: ['password-hashing'],
    cost: 600,
    devSeconds: 110,
    difficulty: 3,
    effects: { security: 2, satisfaction: 1 },
    description: 'Un código extra al iniciar sesión. Aunque roben la contraseña, no entran.',
    lesson: 'La mayoría de cuentas robadas usan contraseñas filtradas de otros sitios. 2FA las protege.',
  },
  {
    slug: 'compliance',
    name: 'Privacidad y cumplimiento',
    branch: 'seguridad',
    minStage: 4,
    requires: ['two-factor', 'backups'],
    cost: 1500,
    devSeconds: 220,
    difficulty: 4,
    effects: { security: 3, conversion: 0.05 },
    description: 'Exportar y borrar datos a pedido, auditorías y políticas claras (GDPR, Habeas Data).',
    lesson: 'Las leyes de datos multan por porcentaje de ingresos. Cumplir es más barato que la multa.',
  },

  // ── IA ─────────────────────────────────────────────────────────────────
  {
    slug: 'support-bot',
    name: 'Soporte con IA',
    branch: 'ia',
    minStage: 3,
    requires: ['analytics'],
    cost: 1200,
    devSeconds: 190,
    difficulty: 3,
    effects: { satisfaction: 5, retention: 0.04 },
    description: 'Un asistente que responde las dudas frecuentes 24/7.',
    lesson: 'La IA resuelve lo repetitivo; los casos raros todavía necesitan una persona.',
  },
  {
    slug: 'ai-recommendations',
    name: 'Recomendador con IA',
    branch: 'ia',
    minStage: 5,
    requires: ['personalization'],
    cost: 5000,
    devSeconds: 400,
    difficulty: 5,
    effects: { retention: 0.15, conversion: 0.15, load: 0.2 },
    description: 'Modelos que predicen qué quiere cada usuario antes de que lo busque.',
    lesson: 'Los modelos cuestan caro de correr: más carga en servidores por cada usuario.',
  },
];

export const FEATURE_BY_SLUG = new Map(FEATURES.map((feature) => [feature.slug, feature]));

// Features que "cobran" — tenerlas es lo que convierte usuarios en dinero.
export const MONETIZATION_SLUGS = new Set(['ads', 'payments', 'subscriptions', 'teams-plan']);

// Espejo de LEGACY: las features del seed viejo siguen instaladas en empresas
// existentes. No se muestran en el árbol, pero no pueden romper el motor —
// cualquier slug que no esté en FEATURE_BY_SLUG aporta este efecto chico.
export const LEGACY_FEATURE_EFFECTS: FeatureEffects = { growth: 0.5, satisfaction: 0.5 };
