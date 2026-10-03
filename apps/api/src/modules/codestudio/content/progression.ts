// El "camino" de CodeStudio v2: etapas reales de una startup (Idea → MVP →
// … → Unicornio). Cada etapa tiene UN objetivo claro, desbloquea nodos del
// árbol (FeatureDefinition.minStage) y paga una recompensa. Las etapas
// nunca retroceden (CodeStudioCompany.stage solo sube): perder usuarios
// duele en caja y ranking, no borra el progreso ganado.

export type StageMetrics = {
  activeUsers: number;
  dailyRevenue: number;
  dailyProfit: number;
  rating: number;
  churn: number;
  stability: number;
  valuation: number;
  installedSlugs: Set<string>;
  hasInfrastructure: boolean;
};

export type StageGoal = {
  /** Qué mide (para que el juego explique cómo lograrlo). */
  key: 'core-feature' | 'server' | 'users' | 'revenue' | 'rating' | 'churn' | 'profit' | 'stability' | 'valuation';
  label: string;
  current: (m: StageMetrics) => number;
  target: number;
  // Para metas "menor es mejor" (churn) o de sí/no.
  kind?: 'min' | 'max' | 'flag';
  format?: 'users' | 'money' | 'rating' | 'percent' | 'flag';
};

export type StageDefinition = {
  index: number;
  name: string;
  tagline: string;
  goals: StageGoal[];
  // Recompensa al ENTRAR a esta etapa.
  reward: { cash: number; xp: number; coins: number };
};

const has = (m: StageMetrics, slug: string) => (m.installedSlugs.has(slug) ? 1 : 0);

export const STAGES: StageDefinition[] = [
  {
    index: 0,
    name: 'Idea',
    tagline: 'Tienes una idea y $6.000. Construye tu MVP: landing, login y la funcionalidad principal.',
    goals: [{ key: 'core-feature', label: 'Publicar la Funcionalidad principal', current: (m) => has(m, 'core-feature'), target: 1, kind: 'flag', format: 'flag' }],
    reward: { cash: 0, xp: 0, coins: 0 },
  },
  {
    index: 1,
    name: 'MVP',
    tagline: 'Tu MVP existe. Ponlo en un servidor y consigue tus primeros 50 usuarios.',
    goals: [
      { key: 'server', label: 'Tener un servidor en línea', current: (m) => (m.hasInfrastructure ? 1 : 0), target: 1, kind: 'flag', format: 'flag' },
      { key: 'users', label: 'Usuarios activos', current: (m) => m.activeUsers, target: 50, format: 'users' },
    ],
    reward: { cash: 500, xp: 30, coins: 5 },
  },
  {
    index: 2,
    name: 'Lanzamiento',
    tagline: 'La gente llega. Ahora demuestra que alguien paga por esto.',
    goals: [
      { key: 'users', label: 'Usuarios activos', current: (m) => m.activeUsers, target: 700, format: 'users' },
      { key: 'revenue', label: 'Ingresos por día', current: (m) => m.dailyRevenue, target: 80, format: 'money' },
    ],
    reward: { cash: 1000, xp: 60, coins: 10 },
  },
  {
    index: 3,
    name: 'Tracción',
    tagline: 'Busca el Product-Market Fit: que la gente se quede y te recomiende.',
    goals: [
      { key: 'users', label: 'Usuarios activos', current: (m) => m.activeUsers, target: 1600, format: 'users' },
      { key: 'rating', label: 'Rating', current: (m) => m.rating, target: 3.8, format: 'rating' },
      { key: 'churn', label: 'Churn diario máximo', current: (m) => m.churn * 100, target: 3, kind: 'min', format: 'percent' },
    ],
    reward: { cash: 2000, xp: 120, coins: 15 },
  },
  {
    index: 4,
    name: 'Product-Market Fit',
    tagline: 'Encontraste tu mercado. Crece sin quemar dinero: ganancia diaria positiva.',
    goals: [
      { key: 'users', label: 'Usuarios activos', current: (m) => m.activeUsers, target: 12000, format: 'users' },
      { key: 'profit', label: 'Ganancia por día', current: (m) => m.dailyProfit, target: 150, format: 'money' },
    ],
    reward: { cash: 4000, xp: 250, coins: 30 },
  },
  {
    index: 5,
    name: 'Crecimiento',
    tagline: 'Escala a 100.000 usuarios sin que la app se caiga.',
    goals: [
      { key: 'users', label: 'Usuarios activos', current: (m) => m.activeUsers, target: 100000, format: 'users' },
      { key: 'stability', label: 'Estabilidad', current: (m) => m.stability, target: 97, format: 'percent' },
    ],
    reward: { cash: 10000, xp: 500, coins: 50 },
  },
  {
    index: 6,
    name: 'Escala',
    tagline: 'Eres una empresa seria. Llega a una valuación de $300 millones.',
    goals: [{ key: 'valuation', label: 'Valuación', current: (m) => m.valuation, target: 300_000_000, format: 'money' }],
    reward: { cash: 50000, xp: 1000, coins: 80 },
  },
  {
    index: 7,
    name: 'Líder del mercado',
    tagline: 'Dominas tu categoría. El último escalón: $1.000 millones.',
    goals: [{ key: 'valuation', label: 'Valuación', current: (m) => m.valuation, target: 1_000_000_000, format: 'money' }],
    reward: { cash: 0, xp: 2000, coins: 120 },
  },
  {
    index: 8,
    name: 'Unicornio',
    tagline: 'Lo lograste: una startup de más de $1.000 millones. Leyenda.',
    goals: [],
    reward: { cash: 0, xp: 4000, coins: 200 },
  },
];

export const MAX_STAGE = STAGES.length - 1;

export function goalMet(goal: StageGoal, metrics: StageMetrics) {
  const value = goal.current(metrics);
  return goal.kind === 'min' ? value <= goal.target : value >= goal.target;
}

// Logros únicos por USUARIO (no por empresa): así fundar 10 empresas no
// multiplica las coins. Los fáciles pagan poco, los difíciles mucho.
// howTo es la pista que ve el jugador mientras está bloqueado (en el juego
// y en la página de logros de la web).
export type MilestoneDefinition = { key: string; name: string; description: string; howTo: string; xp: number; coins: number };

export const MILESTONES: MilestoneDefinition[] = [
  { key: 'first-company', name: 'Fundador', description: 'Fundaste tu primera startup.', howTo: 'Abre el PC del juego, entra a CodeStudio y funda una startup.', xp: 10, coins: 0 },
  { key: 'first-feature', name: 'Hola, producción', description: 'Publicaste tu primera feature.', howTo: 'En el Árbol, construye la Landing page y espera a que termine.', xp: 15, coins: 2 },
  { key: 'first-server', name: 'En línea', description: 'Pusiste tu app en un servidor.', howTo: 'En Servidores, instala tu primer Servidor de aplicación.', xp: 15, coins: 2 },
  { key: 'first-hire', name: 'Ya no estás solo', description: 'Contrataste a tu primer empleado.', howTo: 'En Equipo, contrata a cualquier rol.', xp: 10, coins: 1 },
  { key: 'first-campaign', name: 'Primer anuncio', description: 'Lanzaste tu primera campaña de marketing.', howTo: 'Con la app en línea, lanza una campaña en Marketing.', xp: 10, coins: 1 },
  { key: 'first-bug-diagnosed', name: 'Cazador de bugs', description: 'Diagnosticaste y resolviste tu primer bug tú mismo.', howTo: 'Cuando aparezca un bug, ábrelo en Bugs y elige el arreglo correcto.', xp: 40, coins: 5 },
  { key: 'first-revenue', name: 'Primer dólar', description: 'Tu app generó sus primeros ingresos.', howTo: 'Construye algo de la rama Monetización (Publicidad o Pagos) con usuarios activos.', xp: 40, coins: 5 },
  { key: 'tough-call', name: 'Decisión difícil', description: 'Despediste a alguien para cuidar la caja.', howTo: 'En Equipo, despide a un empleado. A veces es lo que salva la empresa.', xp: 15, coins: 1 },
  { key: 'team-5', name: 'Equipo de cinco', description: 'Tuviste 5 empleados a la vez.', howTo: 'Ten 5 personas contratadas al mismo tiempo.', xp: 40, coins: 4 },
  { key: 'team-15', name: 'Ya es una empresa', description: 'Tuviste 15 empleados a la vez.', howTo: 'Ten 15 personas contratadas al mismo tiempo (y págales).', xp: 120, coins: 12 },
  { key: 'users-1k', name: 'Mil usuarios', description: 'Llegaste a 1.000 usuarios activos.', howTo: 'Crece hasta 1.000 usuarios activos en una empresa.', xp: 60, coins: 6 },
  { key: 'users-100k', name: 'Cien mil', description: 'Llegaste a 100.000 usuarios activos.', howTo: 'Escala una empresa hasta 100.000 usuarios activos.', xp: 300, coins: 30 },
  { key: 'viral-campaign', name: 'Campaña viral', description: 'Una sola campaña te trajo 500 usuarios o más.', howTo: 'Lanza una campaña grande (x3 o x10) en un canal ideal para tu app.', xp: 60, coins: 6 },
  { key: 'first-funding', name: 'Ronda cerrada', description: 'Levantaste tu primera ronda de inversión.', howTo: 'Llega a Lanzamiento con rating 3.5+ y levanta el Pre-seed en Finanzas.', xp: 60, coins: 8 },
  { key: 'first-profitable-day', name: 'Rentable', description: 'Ganaste más de lo que gastaste en un día, con equipo de 2+ personas.', howTo: 'Con 2 o más empleados, haz que tus ingresos diarios superen tus gastos.', xp: 100, coins: 15 },
  { key: 'bootstrapped', name: 'Sin inversores', description: 'Llegaste al Product-Market Fit sin vender ni un % de tu empresa.', howTo: 'Llega a la etapa Product-Market Fit sin levantar ninguna ronda.', xp: 250, coins: 25 },
  { key: 'millionaire', name: 'Millonario', description: 'Tuviste $1.000.000 en caja.', howTo: 'Acumula un millón de dólares en la caja de una empresa.', xp: 200, coins: 20 },
  { key: 'five-stars', name: 'Cinco estrellas', description: 'Rating 4.8 o más con al menos 1.000 usuarios.', howTo: 'Mantén la satisfacción muy alta con 1.000+ usuarios: UX, soporte y cero bugs.', xp: 150, coins: 15 },
  { key: 'clean-code', name: 'Código limpio', description: '20 features en producción, cero deuda técnica y ningún bug abierto.', howTo: 'Con 20+ features, deja la deuda técnica en 0 (QA, tests) y sin bugs abiertos.', xp: 150, coins: 15 },
  { key: 'survived-debt', name: 'Resiliente', description: 'Caíste en números rojos y saliste sin quebrar.', howTo: 'Si tu caja queda en negativo, recupérala antes de 7 días.', xp: 150, coins: 20 },
  { key: 'full-branch', name: 'Especialista', description: 'Completaste una rama entera del árbol.', howTo: 'Construye todas las features de una misma rama del Árbol.', xp: 150, coins: 15 },
  { key: 'half-tree', name: 'Medio árbol', description: '20 features construidas en una empresa.', howTo: 'Construye 20 features del Árbol en la misma empresa.', xp: 100, coins: 10 },
  { key: 'full-tree', name: 'Arquitecto', description: 'Construiste el árbol completo.', howTo: 'Construye todas las features del Árbol en una sola empresa.', xp: 600, coins: 60 },
  { key: 'bug-hunter', name: 'Debugger nato', description: '10 bugs diagnosticados al primer intento.', howTo: 'Diagnostica 10 bugs eligiendo el arreglo correcto a la primera.', xp: 200, coins: 25 },
  { key: 'bug-veteran', name: 'Veterano del debugging', description: '25 bugs diagnosticados por ti.', howTo: 'Diagnostica 25 bugs tú mismo (sin consultora ni empleados).', xp: 300, coins: 30 },
  { key: 'serial-founder', name: 'Emprendedor serial', description: 'Fundaste startups de 3 tipos distintos.', howTo: 'Funda empresas de 3 tipos de app diferentes.', xp: 100, coins: 10 },
  { key: 'first-bankruptcy', name: 'Fracasar también enseña', description: 'Tu primera startup quebró. Los mejores fundadores tienen varias.', howTo: 'Pasa 7 días seguidos con la caja en rojo. (No hace falta buscarlo.)', xp: 25, coins: 0 },
  { key: 'second-chance', name: 'Segunda oportunidad', description: 'Después de una quiebra, llevaste otra startup a Tracción.', howTo: 'Después de quebrar una vez, lleva otra empresa a la etapa Tracción.', xp: 200, coins: 20 },
  { key: 'daily-7', name: 'Rutina de fundador', description: 'Completaste las misiones diarias 7 días.', howTo: 'Completa las 3 misiones del día en 7 días distintos.', xp: 200, coins: 20 },
  ...STAGES.filter((stage) => stage.index > 0).map((stage) => ({
    key: `stage-${stage.index}`,
    name: `Etapa: ${stage.name}`,
    description: `Llegaste a la etapa ${stage.name} por primera vez.`,
    howTo: `Cumple las metas de la etapa ${STAGES[stage.index - 1].name} en el Panel.`,
    xp: stage.reward.xp,
    coins: stage.reward.coins,
  })),
];

export const MILESTONE_BY_KEY = new Map(MILESTONES.map((milestone) => [milestone.key, milestone]));

// Repetir algo que ya lograste con otra empresa sigue dando XP, pero solo
// una fracción — "si es fácil, poca recompensa".
export const REPEAT_XP_FACTOR = 0.25;

// UN SOLO NIVEL: el de la cuenta (User.experience/level), el mismo que sube
// estudiando. Misma fórmula que GamificationService.grantRewards:
// level = floor(sqrt(xp / 100)) + 1 → 100 XP nivel 2, 400 nivel 3, 900 nivel 4…
export function levelForXp(xp: number) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

export function xpForLevel(level: number) {
  return 100 * (level - 1) ** 2;
}

// Regulación del XP del juego para que jugar no infle el nivel más que
// estudiar: todo el XP de CodeStudio cuenta a la mitad, y el de acciones
// repetibles (features, bugs, decisiones…) tiene un tope por día. Los logros
// y misiones diarias son únicos, así que no entran en el tope.
export const GAME_XP_FACTOR = 0.5;
export const DAILY_GAME_XP_CAP = 300;

// Beneficio persistente del nivel: aunque quiebres, la próxima arranca con
// más caja — progreso tipo roguelite.
export function startingCashBonus(level: number) {
  return Math.min(3000, 300 * (level - 1));
}

// Fondos de inversión: cada ronda exige una etapa mínima y un rating decente.
export type FundingRound = { index: number; name: string; minStage: number; minRaise: number; equity: number };

export const FUNDING_ROUNDS: FundingRound[] = [
  { index: 0, name: 'Pre-seed', minStage: 2, minRaise: 8000, equity: 15 },
  { index: 1, name: 'Seed', minStage: 4, minRaise: 60000, equity: 20 },
  { index: 2, name: 'Serie A', minStage: 5, minRaise: 500000, equity: 20 },
  { index: 3, name: 'Serie B', minStage: 6, minRaise: 4000000, equity: 18 },
  { index: 4, name: 'Serie C', minStage: 7, minRaise: 30000000, equity: 15 },
];

export const FUNDING_MIN_RATING = 3.5;
