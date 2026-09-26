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
    goals: [{ label: 'Publicar la Funcionalidad principal', current: (m) => has(m, 'core-feature'), target: 1, kind: 'flag', format: 'flag' }],
    reward: { cash: 0, xp: 0, coins: 0 },
  },
  {
    index: 1,
    name: 'MVP',
    tagline: 'Tu MVP existe. Ponlo en un servidor y consigue tus primeros 50 usuarios.',
    goals: [
      { label: 'Tener un servidor en línea', current: (m) => (m.hasInfrastructure ? 1 : 0), target: 1, kind: 'flag', format: 'flag' },
      { label: 'Usuarios activos', current: (m) => m.activeUsers, target: 50, format: 'users' },
    ],
    reward: { cash: 500, xp: 30, coins: 5 },
  },
  {
    index: 2,
    name: 'Lanzamiento',
    tagline: 'La gente llega. Ahora demuestra que alguien paga por esto.',
    goals: [
      { label: 'Usuarios activos', current: (m) => m.activeUsers, target: 300, format: 'users' },
      { label: 'Ingresos por día', current: (m) => m.dailyRevenue, target: 10, format: 'money' },
    ],
    reward: { cash: 1000, xp: 60, coins: 10 },
  },
  {
    index: 3,
    name: 'Tracción',
    tagline: 'Busca el Product-Market Fit: que la gente se quede y te recomiende.',
    goals: [
      { label: 'Usuarios activos', current: (m) => m.activeUsers, target: 1000, format: 'users' },
      { label: 'Rating', current: (m) => m.rating, target: 3.8, format: 'rating' },
      { label: 'Churn diario máximo', current: (m) => m.churn * 100, target: 3, kind: 'min', format: 'percent' },
    ],
    reward: { cash: 2000, xp: 120, coins: 15 },
  },
  {
    index: 4,
    name: 'Product-Market Fit',
    tagline: 'Encontraste tu mercado. Crece sin quemar dinero: ganancia diaria positiva.',
    goals: [
      { label: 'Usuarios activos', current: (m) => m.activeUsers, target: 10000, format: 'users' },
      { label: 'Ganancia por día', current: (m) => m.dailyProfit, target: 1, format: 'money' },
    ],
    reward: { cash: 4000, xp: 250, coins: 30 },
  },
  {
    index: 5,
    name: 'Crecimiento',
    tagline: 'Escala a 100.000 usuarios sin que la app se caiga.',
    goals: [
      { label: 'Usuarios activos', current: (m) => m.activeUsers, target: 100000, format: 'users' },
      { label: 'Estabilidad', current: (m) => m.stability, target: 97, format: 'percent' },
    ],
    reward: { cash: 10000, xp: 500, coins: 50 },
  },
  {
    index: 6,
    name: 'Escala',
    tagline: 'Eres una empresa seria. Llega a una valuación de $300 millones.',
    goals: [{ label: 'Valuación', current: (m) => m.valuation, target: 300_000_000, format: 'money' }],
    reward: { cash: 50000, xp: 1000, coins: 80 },
  },
  {
    index: 7,
    name: 'Líder del mercado',
    tagline: 'Dominas tu categoría. El último escalón: $1.000 millones.',
    goals: [{ label: 'Valuación', current: (m) => m.valuation, target: 1_000_000_000, format: 'money' }],
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
export type MilestoneDefinition = { key: string; name: string; description: string; xp: number; coins: number };

export const MILESTONES: MilestoneDefinition[] = [
  { key: 'first-company', name: 'Fundador', description: 'Fundaste tu primera startup.', xp: 10, coins: 0 },
  { key: 'first-feature', name: 'Hola, producción', description: 'Publicaste tu primera feature.', xp: 15, coins: 2 },
  { key: 'first-hire', name: 'Ya no estás solo', description: 'Contrataste a tu primer empleado.', xp: 10, coins: 1 },
  { key: 'first-campaign', name: 'Primer anuncio', description: 'Lanzaste tu primera campaña de marketing.', xp: 10, coins: 1 },
  { key: 'first-bug-diagnosed', name: 'Cazador de bugs', description: 'Diagnosticaste y resolviste tu primer bug tú mismo.', xp: 40, coins: 5 },
  { key: 'first-revenue', name: 'Primer dólar', description: 'Tu app generó sus primeros ingresos.', xp: 40, coins: 5 },
  { key: 'first-funding', name: 'Ronda cerrada', description: 'Levantaste tu primera ronda de inversión.', xp: 60, coins: 8 },
  { key: 'first-profitable-day', name: 'Rentable', description: 'Ganaste más de lo que gastaste en un día, con equipo de 2+ personas.', xp: 100, coins: 15 },
  { key: 'survived-debt', name: 'Resiliente', description: 'Caíste en números rojos y saliste sin quebrar.', xp: 150, coins: 20 },
  { key: 'full-branch', name: 'Especialista', description: 'Completaste una rama entera del árbol.', xp: 150, coins: 15 },
  { key: 'bug-hunter', name: 'Debugger nato', description: '10 bugs diagnosticados al primer intento.', xp: 200, coins: 25 },
  { key: 'first-bankruptcy', name: 'Fracasar también enseña', description: 'Tu primera startup quebró. Los mejores fundadores tienen varias.', xp: 25, coins: 0 },
  ...STAGES.filter((stage) => stage.index > 0).map((stage) => ({
    key: `stage-${stage.index}`,
    name: `Etapa: ${stage.name}`,
    description: `Llegaste a la etapa ${stage.name} por primera vez.`,
    xp: stage.reward.xp,
    coins: stage.reward.coins,
  })),
];

export const MILESTONE_BY_KEY = new Map(MILESTONES.map((milestone) => [milestone.key, milestone]));

// Repetir algo que ya lograste con otra empresa sigue dando XP, pero solo
// una fracción — "si es fácil, poca recompensa".
export const REPEAT_XP_FACTOR = 0.25;

// Nivel de fundador: 50 XP → nivel 2, 200 → 3, 450 → 4, 800 → 5…
export function founderLevelForXp(xp: number) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
}

export function xpForFounderLevel(level: number) {
  return 50 * (level - 1) ** 2;
}

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
