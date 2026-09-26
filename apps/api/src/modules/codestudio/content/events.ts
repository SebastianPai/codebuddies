// Eventos de mercado de CodeStudio v2. Dos tipos:
// - Pasivos: pasan solos, pero su resultado depende de lo que construiste
//   ("un disco falló" es una anécdota si tenías Backups y una catástrofe si
//   no). Así el árbol no es solo números: te protege.
// - Decisiones: el jugador elige (con plazo). No hay opción gratis: cada
//   una tiene un costo real.

export type EventContext = {
  stage: number;
  activeUsers: number;
  dailyRevenue: number;
  valuation: number;
  rating: number;
  cash: number;
  installed: Set<string>;
  hostingSlugs: Set<string>;
  hasMonetization: boolean;
  activeTaskCount: number;
  employees: Array<{ id: string; name: string; salary: number; roleName: string }>;
  channelFit: (slug: string) => number;
};

// Todo lo que un evento puede cambiar. El servicio lo aplica en una sola
// transacción (ver applyOutcome en codestudio.service.ts).
export type EventOutcome = {
  message: string;
  tone: 'good' | 'bad' | 'neutral';
  cash?: number;
  users?: number;
  satisfaction?: number;
  reputation?: number;
  techDebt?: number;
  taskProgressBoost?: number;
  raiseSalary?: { employeeId: string; factor: number };
  removeEmployeeId?: string;
  spawnBugKey?: string;
};

type Rng = () => number;

export type PassiveEvent = {
  key: string;
  name: string;
  weight: number;
  eligible: (ctx: EventContext) => boolean;
  resolve: (ctx: EventContext, rng: Rng) => EventOutcome;
};

const pct = (users: number, fraction: number) => Math.round(users * fraction);
const has = (ctx: EventContext, slug: string) => ctx.installed.has(slug);

export const PASSIVE_EVENTS: PassiveEvent[] = [
  {
    key: 'viral-moment',
    name: 'Momento viral',
    weight: 12,
    eligible: (ctx) => ctx.stage >= 1 && ctx.activeUsers >= 30,
    resolve: (ctx) =>
      ctx.rating >= 3.5
        ? { tone: 'good', users: Math.max(20, pct(ctx.activeUsers, 0.15)), reputation: 2, message: `Un video sobre tu app se hizo viral: llegaron ${Math.max(20, pct(ctx.activeUsers, 0.15))} usuarios nuevos.` }
        : { tone: 'bad', users: pct(ctx.activeUsers, 0.04), satisfaction: -5, reputation: -3, message: 'Te hiciste viral… por lo malo: la gente comparte capturas de tus bugs. Con rating bajo, la atención juega en contra.' },
  },
  {
    key: 'black-friday',
    name: 'Black Friday',
    weight: 8,
    eligible: (ctx) => ctx.stage >= 2,
    resolve: (ctx) =>
      ctx.hasMonetization
        ? { tone: 'good', cash: Math.max(50, Math.round(ctx.dailyRevenue * 2)), message: `Black Friday: vendiste el triple que un día normal (+$${Math.max(50, Math.round(ctx.dailyRevenue * 2))}).` }
        : { tone: 'neutral', message: 'Black Friday pasó y tu app no tenía forma de cobrar. Oportunidad perdida: construye algo de la rama Monetización.' },
  },
  {
    key: 'bot-attack',
    name: 'Ataque de bots',
    weight: 8,
    eligible: (ctx) => ctx.activeUsers >= 100 && has(ctx, 'auth'),
    resolve: (ctx) =>
      has(ctx, 'rate-limiting')
        ? { tone: 'good', reputation: 1, message: 'Tu rate limiting bloqueó 50.000 peticiones de bots. Nadie lo notó: así se ve la seguridad bien hecha.' }
        : { tone: 'bad', spawnBugKey: 'bots-signup', satisfaction: -3, message: 'Una red de bots está atacando tu registro. Sin rate limiting, entran como si nada.' },
  },
  {
    key: 'cloud-outage',
    name: 'Caída del proveedor cloud',
    weight: 7,
    eligible: (ctx) => ctx.stage >= 2,
    resolve: (ctx) =>
      has(ctx, 'cdn') && (ctx.hostingSlugs.has('load-balancer') || has(ctx, 'autoscaling'))
        ? { tone: 'good', reputation: 2, message: 'Tu proveedor cloud tuvo una caída mundial, pero tu CDN y tu balanceador aguantaron. La competencia estuvo caída 3 horas.' }
        : { tone: 'bad', satisfaction: -8, users: -pct(ctx.activeUsers, 0.03), message: 'Tu proveedor cloud se cayó 3 horas y tu app con él. Con CDN y un balanceador habrías aguantado.' },
  },
  {
    key: 'disk-failure',
    name: 'Falla de disco',
    weight: 7,
    eligible: (ctx) => ctx.stage >= 1 && ctx.activeUsers >= 50,
    resolve: (ctx) =>
      has(ctx, 'backups')
        ? { tone: 'good', message: 'Un disco del servidor murió. Restauraste desde el backup en 20 minutos. Nadie perdió nada.' }
        : { tone: 'bad', users: -pct(ctx.activeUsers, 0.1), reputation: -5, satisfaction: -10, message: 'Un disco murió y NO tenías backups: se perdieron datos de usuarios. Muchos no vuelven.' },
  },
  {
    key: 'regulation',
    name: 'Nueva ley de datos',
    weight: 5,
    eligible: (ctx) => ctx.stage >= 4,
    resolve: (ctx) =>
      has(ctx, 'compliance')
        ? { tone: 'good', reputation: 3, users: pct(ctx.activeUsers, 0.03), message: 'Entró en vigor una ley de protección de datos. Tú ya cumplías; varios competidores fueron multados.' }
        : { tone: 'bad', cash: -Math.max(2000, Math.round(ctx.dailyRevenue * 3)), message: `Nueva ley de protección de datos y no cumplías: multa de $${Math.max(2000, Math.round(ctx.dailyRevenue * 3))}.` },
  },
  {
    key: 'seo-update',
    name: 'Google cambió su algoritmo',
    weight: 5,
    eligible: (ctx) => has(ctx, 'seo') && ctx.stage >= 2,
    resolve: (ctx, rng) =>
      rng() < 0.55
        ? { tone: 'good', users: pct(ctx.activeUsers, 0.06), message: 'Google actualizó su algoritmo y tu blog subió en los resultados.' }
        : { tone: 'bad', users: -pct(ctx.activeUsers, 0.04), message: 'Google actualizó su algoritmo y bajaste varias posiciones. El SEO nunca está garantizado.' },
  },
  {
    key: 'competitor-closes',
    name: 'Un competidor cerró',
    weight: 5,
    eligible: (ctx) => ctx.stage >= 3,
    resolve: (ctx) => ({ tone: 'good', users: pct(ctx.activeUsers, 0.08), message: 'Un competidor se quedó sin dinero y cerró. Parte de sus usuarios llegaron a tu app.' }),
  },
  {
    key: 'press-review',
    name: 'Reseña en la prensa',
    weight: 6,
    eligible: (ctx) => ctx.stage >= 2,
    resolve: (ctx) =>
      ctx.rating >= 4
        ? { tone: 'good', users: Math.max(30, pct(ctx.activeUsers, 0.1)), reputation: 3, message: 'Un medio tech publicó una reseña excelente de tu app.' }
        : { tone: 'bad', reputation: -2, message: 'Un medio tech te reseñó: "prometedora, pero todavía verde". Con rating 4+ habría sido otra historia.' },
  },
  {
    key: 'payments-down',
    name: 'Tu pasarela de pagos cayó',
    weight: 4,
    eligible: (ctx) => has(ctx, 'payments') && ctx.dailyRevenue > 0,
    resolve: (ctx) => ({ tone: 'bad', cash: -Math.round(ctx.dailyRevenue * 0.5), message: 'Tu proveedor de pagos estuvo caído medio día. Perdiste ventas que no vuelven.' }),
  },
];

export type DecisionChoice = { key: string; label: string; hint: string };

export type DecisionEvent = {
  key: string;
  name: string;
  weight: number;
  eligible: (ctx: EventContext) => boolean;
  // Arma el evento concreto (precio, empleado involucrado…). params se
  // guardan en el EventLog y se usan de nuevo al resolver.
  build: (ctx: EventContext, rng: Rng) => { description: string; params: Record<string, any>; choices: DecisionChoice[] };
  defaultChoice: string;
  // Validación previa (p.ej. caja suficiente). Devuelve un error o null.
  canChoose?: (ctx: EventContext, params: Record<string, any>, choice: string) => string | null;
  resolve: (ctx: EventContext, params: Record<string, any>, choice: string, rng: Rng) => EventOutcome;
};

// Días de juego (minutos reales) antes de que una decisión se resuelva sola
// con defaultChoice.
export const DECISION_TTL_DAYS = 5;

export const DECISION_EVENTS: DecisionEvent[] = [
  {
    key: 'influencer-offer',
    name: 'Una influencer quiere promocionarte',
    weight: 10,
    eligible: (ctx) => ctx.stage >= 1 && ctx.activeUsers >= 20,
    build: (ctx) => {
      const price = Math.min(20000, Math.max(300, Math.round((ctx.activeUsers * 0.6) / 50) * 50));
      // 3.0 = un poco mejor que una campaña de Influencers normal (CAC 3.5).
      const expected = Math.round((price / 3.0) * ctx.channelFit('influencers') * Math.max(0.3, (ctx.rating - 1.5) / 2.5));
      return {
        description: `Una creadora con 400 mil seguidores ofrece un video sobre tu app por $${price}. Con tu rating actual (${ctx.rating.toFixed(1)}) estimas unos ${expected} usuarios.`,
        params: { price, expected },
        choices: [
          { key: 'accept', label: `Pagar $${price}`, hint: 'Usuarios ya, si tu producto convence.' },
          { key: 'decline', label: 'Rechazar', hint: 'Guardas la caja.' },
        ],
      };
    },
    defaultChoice: 'decline',
    canChoose: (ctx, params, choice) => (choice === 'accept' && ctx.cash < params.price ? 'No tienes caja suficiente para pagarle.' : null),
    resolve: (ctx, params, choice) =>
      choice === 'accept'
        ? { tone: 'good', cash: -params.price, users: params.expected, message: `El video salió: +${params.expected} usuarios por $${params.price}.` }
        : { tone: 'neutral', message: 'Rechazaste la promoción. La influencer promocionó a tu competencia.' },
  },
  {
    key: 'big-client',
    name: 'Un cliente grande pide algo a medida',
    weight: 7,
    eligible: (ctx) => ctx.stage >= 3,
    build: (ctx) => {
      const payment = Math.max(3000, Math.round(ctx.dailyRevenue * 10));
      return {
        description: `Una empresa grande te paga $${payment} por una funcionalidad hecha solo para ella. Es dinero rápido, pero tu equipo meterá código apurado que nadie más usa.`,
        params: { payment },
        choices: [
          { key: 'accept', label: `Aceptar $${payment}`, hint: '+caja ahora, +deuda técnica (más bugs después).' },
          { key: 'decline', label: 'Enfocarte en tu producto', hint: 'Sin plata extra, sin deuda.' },
        ],
      };
    },
    defaultChoice: 'decline',
    resolve: (_ctx, params, choice) =>
      choice === 'accept'
        ? { tone: 'neutral', cash: params.payment, techDebt: 18, satisfaction: -2, message: `Cobraste $${params.payment}. El código a medida sumó deuda técnica: espera más bugs.` }
        : { tone: 'neutral', reputation: 1, message: 'Dijiste que no y te mantuviste enfocado. Tu roadmap te lo agradece.' },
  },
  {
    key: 'crunch',
    name: 'Tu equipo propone trabajar el fin de semana',
    weight: 7,
    eligible: (ctx) => ctx.activeTaskCount >= 1 && ctx.employees.length >= 2,
    build: () => ({
      description: 'El equipo ofrece trabajar el fin de semana para adelantar las features en desarrollo. Avanzan mucho… pero el cansancio se paga.',
      params: {},
      choices: [
        { key: 'accept', label: 'Sí, a trabajar', hint: '+35% de avance en lo que está en desarrollo. Riesgo de que alguien renuncie.' },
        { key: 'decline', label: 'No, que descansen', hint: 'Sin avance extra, equipo sano.' },
      ],
    }),
    defaultChoice: 'decline',
    resolve: (ctx, _params, choice, rng) => {
      if (choice !== 'accept') return { tone: 'good', reputation: 1, message: 'El equipo descansó. Llegan el lunes con energía.' };
      if (rng() < 0.3 && ctx.employees.length > 0) {
        const quitter = ctx.employees[Math.floor(rng() * ctx.employees.length)];
        return { tone: 'bad', taskProgressBoost: 0.35, removeEmployeeId: quitter.id, message: `Las features avanzaron un 35%… pero ${quitter.name} (${quitter.roleName}) renunció por agotamiento.` };
      }
      return { tone: 'good', taskProgressBoost: 0.35, message: 'El equipo adelantó un 35% de lo que estaba en desarrollo. Esta vez salió bien.' };
    },
  },
  {
    key: 'poach',
    name: 'Quieren llevarse a alguien de tu equipo',
    weight: 6,
    eligible: (ctx) => ctx.stage >= 2 && ctx.employees.length >= 1,
    build: (ctx, rng) => {
      const target = ctx.employees[Math.floor(rng() * ctx.employees.length)];
      return {
        description: `Una empresa grande le ofreció más sueldo a ${target.name} (${target.roleName}). Si no igualas la oferta, se va.`,
        params: { employeeId: target.id, name: target.name, salary: target.salary },
        choices: [
          { key: 'raise', label: 'Subirle el sueldo 30%', hint: `Pasa de $${target.salary} a $${Math.round(target.salary * 1.3)} al mes.` },
          { key: 'let-go', label: 'Dejarlo ir', hint: 'Ahorras su sueldo, pierdes a la persona.' },
        ],
      };
    },
    defaultChoice: 'let-go',
    resolve: (ctx, params, choice) => {
      const stillThere = ctx.employees.some((employee) => employee.id === params.employeeId);
      if (!stillThere) return { tone: 'neutral', message: `${params.name} ya no estaba en el equipo.` };
      return choice === 'raise'
        ? { tone: 'good', raiseSalary: { employeeId: params.employeeId, factor: 1.3 }, message: `${params.name} se queda con un 30% más de sueldo.` }
        : { tone: 'bad', removeEmployeeId: params.employeeId, message: `${params.name} se fue a la otra empresa.` };
    },
  },
  {
    key: 'security-report',
    name: 'Un hacker ético encontró una falla',
    weight: 6,
    eligible: (ctx) => ctx.stage >= 2 && ctx.activeUsers >= 150,
    build: (ctx) => {
      const bounty = 500 * (1 + ctx.stage);
      return {
        description: `Un investigador encontró una falla grave en tu API y pide $${bounty} de recompensa por explicarte cómo arreglarla antes de publicarla.`,
        params: { bounty },
        choices: [
          { key: 'pay', label: `Pagar $${bounty}`, hint: 'Arreglas la falla antes de que alguien la use.' },
          { key: 'ignore', label: 'Ignorarlo', hint: 'Quizás nadie más la encuentre… quizás sí.' },
        ],
      };
    },
    defaultChoice: 'ignore',
    canChoose: (ctx, params, choice) => (choice === 'pay' && ctx.cash < params.bounty ? 'No tienes caja suficiente para pagar la recompensa.' : null),
    resolve: (_ctx, params, choice, rng) => {
      if (choice === 'pay') return { tone: 'good', cash: -params.bounty, reputation: 3, message: 'Pagaste la recompensa y parcheaste la falla. Tus usuarios nunca estuvieron en riesgo.' };
      return rng() < 0.6
        ? { tone: 'bad', reputation: -5, spawnBugKey: 'exposed-api', message: 'Ignoraste el aviso y alguien más encontró la falla: una API expone datos de tus usuarios.' }
        : { tone: 'neutral', message: 'Ignoraste el aviso. Esta vez tuviste suerte… la falla sigue ahí.' };
    },
  },
];

export const DECISION_BY_KEY = new Map(DECISION_EVENTS.map((event) => [event.key, event]));
export const PASSIVE_BY_KEY = new Map(PASSIVE_EVENTS.map((event) => [event.key, event]));

// Cada cuántos días de juego se intenta un evento, y qué fracción son
// decisiones.
export const EVENT_INTERVAL_DAYS = { min: 6, max: 12 };
export const DECISION_SHARE = 0.45;

export function pickWeighted<T extends { weight: number }>(items: T[], rng: Rng): T | null {
  if (items.length === 0) return null;
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

// Niveles de precio que el jugador puede elegir en Finanzas.
export const PRICE_LEVELS = [
  { value: 0.6, label: 'Muy barato' },
  { value: 0.8, label: 'Barato' },
  { value: 1, label: 'Normal' },
  { value: 1.3, label: 'Caro' },
  { value: 1.6, label: 'Premium' },
] as const;
