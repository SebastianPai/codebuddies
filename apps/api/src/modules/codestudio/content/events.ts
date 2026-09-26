// Eventos de mercado de CodeStudio v2. Dos tipos:
// - Pasivos: pasan solos, pero su resultado depende de lo que construiste
//   ("un disco falló" es una anécdota si tenías Backups y una catástrofe si
//   no). Así el árbol no es solo números: te protege.
// - Decisiones: el jugador elige (con plazo). No hay opción gratis: cada
//   una tiene un costo real.
//
// Los textos se arman con números del momento, así que viven acá en los 3
// idiomas (L = { es, en, de }) en vez de en los archivos de traducción.

import { L, Localized } from './i18n/localized';

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
  message: Localized;
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
  name: Localized;
  weight: number;
  eligible: (ctx: EventContext) => boolean;
  resolve: (ctx: EventContext, rng: Rng) => EventOutcome;
};

const pct = (users: number, fraction: number) => Math.round(users * fraction);
const has = (ctx: EventContext, slug: string) => ctx.installed.has(slug);
const $ = (value: number) => `$${Math.round(value).toLocaleString('es-CO')}`;

export const PASSIVE_EVENTS: PassiveEvent[] = [
  {
    key: 'viral-moment',
    name: L('Momento viral', 'Viral moment', 'Viraler Moment'),
    weight: 12,
    eligible: (ctx) => ctx.stage >= 1 && ctx.activeUsers >= 30,
    resolve: (ctx) => {
      const users = Math.max(20, pct(ctx.activeUsers, 0.15));
      return ctx.rating >= 3.5
        ? {
            tone: 'good',
            users,
            reputation: 2,
            message: L(
              `Un video sobre tu app se hizo viral: llegaron ${users} usuarios nuevos.`,
              `A video about your app went viral: ${users} new users arrived.`,
              `Ein Video über deine App ging viral: ${users} neue Nutzer kamen dazu.`,
            ),
          }
        : {
            tone: 'bad',
            users: pct(ctx.activeUsers, 0.04),
            satisfaction: -5,
            reputation: -3,
            message: L(
              'Te hiciste viral… por lo malo: la gente comparte capturas de tus bugs. Con rating bajo, la atención juega en contra.',
              'You went viral… for the wrong reasons: people are sharing screenshots of your bugs. With a low rating, attention works against you.',
              'Du bist viral gegangen… aus den falschen Gründen: Leute teilen Screenshots deiner Bugs. Mit schlechter Bewertung schadet Aufmerksamkeit.',
            ),
          };
    },
  },
  {
    key: 'black-friday',
    name: L('Black Friday', 'Black Friday', 'Black Friday'),
    weight: 8,
    eligible: (ctx) => ctx.stage >= 2,
    resolve: (ctx) => {
      const gain = Math.max(50, Math.round(ctx.dailyRevenue * 2));
      return ctx.hasMonetization
        ? {
            tone: 'good',
            cash: gain,
            message: L(
              `Black Friday: vendiste el triple que un día normal (+${$(gain)}).`,
              `Black Friday: you sold three times a normal day (+${$(gain)}).`,
              `Black Friday: du hast dreimal so viel verkauft wie an einem normalen Tag (+${$(gain)}).`,
            ),
          }
        : {
            tone: 'neutral',
            message: L(
              'Black Friday pasó y tu app no tenía forma de cobrar. Oportunidad perdida: construye algo de la rama Monetización.',
              "Black Friday came and went and your app had no way to charge. Missed opportunity: build something from the Monetization branch.",
              'Black Friday ist vorbei und deine App konnte nichts verkaufen. Verpasste Chance: bau etwas aus dem Zweig Monetarisierung.',
            ),
          };
    },
  },
  {
    key: 'bot-attack',
    name: L('Ataque de bots', 'Bot attack', 'Bot-Angriff'),
    weight: 8,
    eligible: (ctx) => ctx.activeUsers >= 100 && has(ctx, 'auth'),
    resolve: (ctx) =>
      has(ctx, 'rate-limiting')
        ? {
            tone: 'good',
            reputation: 1,
            message: L(
              'Tu rate limiting bloqueó 50.000 peticiones de bots. Nadie lo notó: así se ve la seguridad bien hecha.',
              'Your rate limiting blocked 50,000 bot requests. Nobody noticed: that is what good security looks like.',
              'Dein Rate Limiting hat 50.000 Bot-Anfragen blockiert. Niemand hat es gemerkt: so sieht gute Sicherheit aus.',
            ),
          }
        : {
            tone: 'bad',
            spawnBugKey: 'bots-signup',
            satisfaction: -3,
            message: L(
              'Una red de bots está atacando tu registro. Sin rate limiting, entran como si nada.',
              'A botnet is attacking your sign-up. Without rate limiting, they walk right in.',
              'Ein Botnetz greift deine Registrierung an. Ohne Rate Limiting kommen sie einfach durch.',
            ),
          },
  },
  {
    key: 'cloud-outage',
    name: L('Caída del proveedor cloud', 'Cloud provider outage', 'Ausfall des Cloud-Anbieters'),
    weight: 7,
    eligible: (ctx) => ctx.stage >= 2,
    resolve: (ctx) =>
      has(ctx, 'cdn') && (ctx.hostingSlugs.has('load-balancer') || has(ctx, 'autoscaling'))
        ? {
            tone: 'good',
            reputation: 2,
            message: L(
              'Tu proveedor cloud tuvo una caída mundial, pero tu CDN y tu balanceador aguantaron. La competencia estuvo caída 3 horas.',
              'Your cloud provider had a global outage, but your CDN and load balancer held up. Your competitors were down for 3 hours.',
              'Dein Cloud-Anbieter hatte einen weltweiten Ausfall, aber dein CDN und Load Balancer haben gehalten. Die Konkurrenz war 3 Stunden offline.',
            ),
          }
        : {
            tone: 'bad',
            satisfaction: -8,
            users: -pct(ctx.activeUsers, 0.03),
            message: L(
              'Tu proveedor cloud se cayó 3 horas y tu app con él. Con CDN y un balanceador habrías aguantado.',
              'Your cloud provider was down for 3 hours and your app with it. With a CDN and a load balancer you would have held up.',
              'Dein Cloud-Anbieter war 3 Stunden down und deine App mit ihm. Mit CDN und Load Balancer hättest du durchgehalten.',
            ),
          },
  },
  {
    key: 'disk-failure',
    name: L('Falla de disco', 'Disk failure', 'Festplattenausfall'),
    weight: 7,
    eligible: (ctx) => ctx.stage >= 1 && ctx.activeUsers >= 50,
    resolve: (ctx) =>
      has(ctx, 'backups')
        ? {
            tone: 'good',
            message: L(
              'Un disco del servidor murió. Restauraste desde el backup en 20 minutos. Nadie perdió nada.',
              'A server disk died. You restored from backup in 20 minutes. Nobody lost anything.',
              'Eine Serverfestplatte ist ausgefallen. Du hast in 20 Minuten aus dem Backup wiederhergestellt. Niemand hat etwas verloren.',
            ),
          }
        : {
            tone: 'bad',
            users: -pct(ctx.activeUsers, 0.1),
            reputation: -5,
            satisfaction: -10,
            message: L(
              'Un disco murió y NO tenías backups: se perdieron datos de usuarios. Muchos no vuelven.',
              "A disk died and you had NO backups: user data was lost. Many won't come back.",
              'Eine Festplatte ist ausgefallen und du hattest KEINE Backups: Nutzerdaten sind verloren. Viele kommen nicht wieder.',
            ),
          },
  },
  {
    key: 'regulation',
    name: L('Nueva ley de datos', 'New data law', 'Neues Datenschutzgesetz'),
    weight: 5,
    eligible: (ctx) => ctx.stage >= 4,
    resolve: (ctx) => {
      const fine = Math.max(2000, Math.round(ctx.dailyRevenue * 3));
      return has(ctx, 'compliance')
        ? {
            tone: 'good',
            reputation: 3,
            users: pct(ctx.activeUsers, 0.03),
            message: L(
              'Entró en vigor una ley de protección de datos. Tú ya cumplías; varios competidores fueron multados.',
              'A data protection law came into force. You were already compliant; several competitors were fined.',
              'Ein Datenschutzgesetz trat in Kraft. Du warst schon konform; mehrere Konkurrenten wurden bestraft.',
            ),
          }
        : {
            tone: 'bad',
            cash: -fine,
            message: L(
              `Nueva ley de protección de datos y no cumplías: multa de ${$(fine)}.`,
              `New data protection law and you weren't compliant: ${$(fine)} fine.`,
              `Neues Datenschutzgesetz und du warst nicht konform: ${$(fine)} Strafe.`,
            ),
          };
    },
  },
  {
    key: 'seo-update',
    name: L('Google cambió su algoritmo', 'Google changed its algorithm', 'Google hat seinen Algorithmus geändert'),
    weight: 5,
    eligible: (ctx) => has(ctx, 'seo') && ctx.stage >= 2,
    resolve: (ctx, rng) =>
      rng() < 0.55
        ? {
            tone: 'good',
            users: pct(ctx.activeUsers, 0.06),
            message: L(
              'Google actualizó su algoritmo y tu blog subió en los resultados.',
              'Google updated its algorithm and your blog climbed in the results.',
              'Google hat seinen Algorithmus aktualisiert und dein Blog ist in den Ergebnissen gestiegen.',
            ),
          }
        : {
            tone: 'bad',
            users: -pct(ctx.activeUsers, 0.04),
            message: L(
              'Google actualizó su algoritmo y bajaste varias posiciones. El SEO nunca está garantizado.',
              'Google updated its algorithm and you dropped several positions. SEO is never guaranteed.',
              'Google hat seinen Algorithmus aktualisiert und du bist mehrere Plätze gefallen. SEO ist nie garantiert.',
            ),
          },
  },
  {
    key: 'competitor-closes',
    name: L('Un competidor cerró', 'A competitor shut down', 'Ein Konkurrent hat geschlossen'),
    weight: 5,
    eligible: (ctx) => ctx.stage >= 3,
    resolve: (ctx) => ({
      tone: 'good',
      users: pct(ctx.activeUsers, 0.08),
      message: L(
        'Un competidor se quedó sin dinero y cerró. Parte de sus usuarios llegaron a tu app.',
        'A competitor ran out of money and shut down. Some of their users came to your app.',
        'Einem Konkurrenten ist das Geld ausgegangen. Ein Teil seiner Nutzer kam zu deiner App.',
      ),
    }),
  },
  {
    key: 'press-review',
    name: L('Reseña en la prensa', 'Press review', 'Presse-Rezension'),
    weight: 6,
    eligible: (ctx) => ctx.stage >= 2,
    resolve: (ctx) =>
      ctx.rating >= 4
        ? {
            tone: 'good',
            users: Math.max(30, pct(ctx.activeUsers, 0.1)),
            reputation: 3,
            message: L(
              'Un medio tech publicó una reseña excelente de tu app.',
              'A tech outlet published a great review of your app.',
              'Ein Tech-Magazin hat eine hervorragende Rezension deiner App veröffentlicht.',
            ),
          }
        : {
            tone: 'bad',
            reputation: -2,
            message: L(
              'Un medio tech te reseñó: "prometedora, pero todavía verde". Con rating 4+ habría sido otra historia.',
              'A tech outlet reviewed you: "promising, but still green". With a 4+ rating it would have been a different story.',
              'Ein Tech-Magazin schrieb: "vielversprechend, aber noch unreif". Mit 4+ Bewertung wäre es anders gelaufen.',
            ),
          },
  },
  {
    key: 'payments-down',
    name: L('Tu pasarela de pagos cayó', 'Your payment gateway went down', 'Dein Zahlungsanbieter ist ausgefallen'),
    weight: 4,
    eligible: (ctx) => has(ctx, 'payments') && ctx.dailyRevenue > 0,
    resolve: (ctx) => ({
      tone: 'bad',
      cash: -Math.round(ctx.dailyRevenue * 0.5),
      message: L(
        'Tu proveedor de pagos estuvo caído medio día. Perdiste ventas que no vuelven.',
        'Your payment provider was down for half a day. You lost sales that will not come back.',
        'Dein Zahlungsanbieter war einen halben Tag down. Du hast Umsätze verloren, die nicht wiederkommen.',
      ),
    }),
  },
];

export type DecisionChoice = { key: string; label: Localized; hint: Localized };

export type DecisionEvent = {
  key: string;
  name: Localized;
  weight: number;
  eligible: (ctx: EventContext) => boolean;
  // Arma el evento concreto (precio, empleado involucrado…). params se
  // guardan en el EventLog y se usan de nuevo al resolver.
  build: (ctx: EventContext, rng: Rng) => { description: Localized; params: Record<string, any>; choices: DecisionChoice[] };
  defaultChoice: string;
  // Validación previa (p.ej. caja suficiente). Devuelve un error o null.
  canChoose?: (ctx: EventContext, params: Record<string, any>, choice: string) => Localized | null;
  resolve: (ctx: EventContext, params: Record<string, any>, choice: string, rng: Rng) => EventOutcome;
};

// Días de juego (minutos reales) antes de que una decisión se resuelva sola
// con defaultChoice.
export const DECISION_TTL_DAYS = 5;

const NO_CASH = L('No tienes caja suficiente.', "You don't have enough cash.", 'Du hast nicht genug Geld.');

export const DECISION_EVENTS: DecisionEvent[] = [
  {
    key: 'influencer-offer',
    name: L('Una influencer quiere promocionarte', 'An influencer wants to promote you', 'Eine Influencerin will dich bewerben'),
    weight: 10,
    eligible: (ctx) => ctx.stage >= 1 && ctx.activeUsers >= 20,
    build: (ctx) => {
      const price = Math.min(20000, Math.max(300, Math.round((ctx.activeUsers * 0.6) / 50) * 50));
      // 3.0 = un poco mejor que una campaña de Influencers normal (CAC 3.5).
      const expected = Math.round((price / 3.0) * ctx.channelFit('influencers') * Math.max(0.3, (ctx.rating - 1.5) / 2.5));
      const rating = ctx.rating.toFixed(1);
      return {
        description: L(
          `Una creadora con 400 mil seguidores ofrece un video sobre tu app por ${$(price)}. Con tu rating actual (${rating}) estimas unos ${expected} usuarios.`,
          `A creator with 400k followers offers a video about your app for ${$(price)}. With your current rating (${rating}) you estimate about ${expected} users.`,
          `Eine Creatorin mit 400.000 Followern bietet ein Video über deine App für ${$(price)} an. Mit deiner aktuellen Bewertung (${rating}) schätzt du etwa ${expected} Nutzer.`,
        ),
        params: { price, expected },
        choices: [
          { key: 'accept', label: L(`Pagar ${$(price)}`, `Pay ${$(price)}`, `${$(price)} zahlen`), hint: L('Usuarios ya, si tu producto convence.', 'Users now, if your product convinces.', 'Sofort Nutzer, wenn dein Produkt überzeugt.') },
          { key: 'decline', label: L('Rechazar', 'Decline', 'Ablehnen'), hint: L('Guardas la caja.', 'You keep your cash.', 'Du behältst dein Geld.') },
        ],
      };
    },
    defaultChoice: 'decline',
    canChoose: (ctx, params, choice) => (choice === 'accept' && ctx.cash < params.price ? NO_CASH : null),
    resolve: (_ctx, params, choice) =>
      choice === 'accept'
        ? {
            tone: 'good',
            cash: -params.price,
            users: params.expected,
            message: L(
              `El video salió: +${params.expected} usuarios por ${$(params.price)}.`,
              `The video is out: +${params.expected} users for ${$(params.price)}.`,
              `Das Video ist online: +${params.expected} Nutzer für ${$(params.price)}.`,
            ),
          }
        : {
            tone: 'neutral',
            message: L(
              'Rechazaste la promoción. La influencer promocionó a tu competencia.',
              'You declined. The influencer promoted your competitor instead.',
              'Du hast abgelehnt. Die Influencerin hat deine Konkurrenz beworben.',
            ),
          },
  },
  {
    key: 'big-client',
    name: L('Un cliente grande pide algo a medida', 'A big client wants a custom build', 'Ein Großkunde will eine Sonderanfertigung'),
    weight: 7,
    eligible: (ctx) => ctx.stage >= 3,
    build: (ctx) => {
      const payment = Math.max(3000, Math.round(ctx.dailyRevenue * 10));
      return {
        description: L(
          `Una empresa grande te paga ${$(payment)} por una funcionalidad hecha solo para ella. Es dinero rápido, pero tu equipo meterá código apurado que nadie más usa.`,
          `A big company will pay you ${$(payment)} for a feature built only for them. Quick money, but your team will ship rushed code nobody else uses.`,
          `Eine große Firma zahlt dir ${$(payment)} für ein Feature nur für sie. Schnelles Geld, aber dein Team schreibt hastigen Code, den sonst niemand nutzt.`,
        ),
        params: { payment },
        choices: [
          { key: 'accept', label: L(`Aceptar ${$(payment)}`, `Accept ${$(payment)}`, `${$(payment)} annehmen`), hint: L('+caja ahora, +deuda técnica (más bugs después).', '+cash now, +tech debt (more bugs later).', '+Geld jetzt, +technische Schulden (später mehr Bugs).') },
          { key: 'decline', label: L('Enfocarte en tu producto', 'Stay focused on your product', 'Beim eigenen Produkt bleiben'), hint: L('Sin plata extra, sin deuda.', 'No extra money, no debt.', 'Kein Extrageld, keine Schulden.') },
        ],
      };
    },
    defaultChoice: 'decline',
    resolve: (_ctx, params, choice) =>
      choice === 'accept'
        ? {
            tone: 'neutral',
            cash: params.payment,
            techDebt: 18,
            satisfaction: -2,
            message: L(
              `Cobraste ${$(params.payment)}. El código a medida sumó deuda técnica: espera más bugs.`,
              `You got ${$(params.payment)}. The custom code added tech debt: expect more bugs.`,
              `Du hast ${$(params.payment)} bekommen. Der Spezialcode hat technische Schulden erzeugt: rechne mit mehr Bugs.`,
            ),
          }
        : {
            tone: 'neutral',
            reputation: 1,
            message: L(
              'Dijiste que no y te mantuviste enfocado. Tu roadmap te lo agradece.',
              'You said no and stayed focused. Your roadmap thanks you.',
              'Du hast Nein gesagt und bist fokussiert geblieben. Deine Roadmap dankt es dir.',
            ),
          },
  },
  {
    key: 'crunch',
    name: L('Tu equipo propone trabajar el fin de semana', 'Your team offers to work the weekend', 'Dein Team will am Wochenende arbeiten'),
    weight: 7,
    eligible: (ctx) => ctx.activeTaskCount >= 1 && ctx.employees.length >= 2,
    build: () => ({
      description: L(
        'El equipo ofrece trabajar el fin de semana para adelantar las features en desarrollo. Avanzan mucho… pero el cansancio se paga.',
        'The team offers to work the weekend to push the features in progress. Big progress… but exhaustion has a price.',
        'Das Team bietet an, am Wochenende zu arbeiten, um die laufenden Features voranzubringen. Viel Fortschritt… aber Erschöpfung hat ihren Preis.',
      ),
      params: {},
      choices: [
        { key: 'accept', label: L('Sí, a trabajar', 'Yes, let’s work', 'Ja, an die Arbeit'), hint: L('+35% de avance en lo que está en desarrollo. Riesgo de que alguien renuncie.', '+35% progress on features in development. Someone might quit.', '+35% Fortschritt bei laufenden Features. Jemand könnte kündigen.') },
        { key: 'decline', label: L('No, que descansen', 'No, let them rest', 'Nein, sie sollen sich ausruhen'), hint: L('Sin avance extra, equipo sano.', 'No extra progress, healthy team.', 'Kein Extra-Fortschritt, gesundes Team.') },
      ],
    }),
    defaultChoice: 'decline',
    resolve: (ctx, _params, choice, rng) => {
      if (choice !== 'accept') {
        return { tone: 'good', reputation: 1, message: L('El equipo descansó. Llegan el lunes con energía.', 'The team rested. They show up Monday full of energy.', 'Das Team hat sich ausgeruht. Am Montag sind alle voller Energie.') };
      }
      if (rng() < 0.3 && ctx.employees.length > 0) {
        const quitter = ctx.employees[Math.floor(rng() * ctx.employees.length)];
        return {
          tone: 'bad',
          taskProgressBoost: 0.35,
          removeEmployeeId: quitter.id,
          message: L(
            `Las features avanzaron un 35%… pero ${quitter.name} (${quitter.roleName}) renunció por agotamiento.`,
            `Features moved forward 35%… but ${quitter.name} (${quitter.roleName}) quit from burnout.`,
            `Die Features sind 35% vorangekommen… aber ${quitter.name} (${quitter.roleName}) hat wegen Erschöpfung gekündigt.`,
          ),
        };
      }
      return {
        tone: 'good',
        taskProgressBoost: 0.35,
        message: L(
          'El equipo adelantó un 35% de lo que estaba en desarrollo. Esta vez salió bien.',
          'The team got 35% further on everything in development. This time it worked out.',
          'Das Team ist bei allem in Entwicklung 35% weitergekommen. Diesmal ging es gut.',
        ),
      };
    },
  },
  {
    key: 'poach',
    name: L('Quieren llevarse a alguien de tu equipo', 'Someone is poaching your team', 'Jemand will dir Leute abwerben'),
    weight: 6,
    eligible: (ctx) => ctx.stage >= 2 && ctx.employees.length >= 1,
    build: (ctx, rng) => {
      const target = ctx.employees[Math.floor(rng() * ctx.employees.length)];
      const raised = Math.round(target.salary * 1.3);
      return {
        description: L(
          `Una empresa grande le ofreció más sueldo a ${target.name} (${target.roleName}). Si no igualas la oferta, se va.`,
          `A big company offered ${target.name} (${target.roleName}) a higher salary. If you don't match it, they leave.`,
          `Eine große Firma hat ${target.name} (${target.roleName}) mehr Gehalt angeboten. Wenn du nicht mitziehst, geht die Person.`,
        ),
        params: { employeeId: target.id, name: target.name, salary: target.salary },
        choices: [
          { key: 'raise', label: L('Subirle el sueldo 30%', 'Give a 30% raise', 'Gehalt um 30% erhöhen'), hint: L(`Pasa de ${$(target.salary)} a ${$(raised)} al mes.`, `From ${$(target.salary)} to ${$(raised)} per month.`, `Von ${$(target.salary)} auf ${$(raised)} pro Monat.`) },
          { key: 'let-go', label: L('Dejarlo ir', 'Let them go', 'Gehen lassen'), hint: L('Ahorras su sueldo, pierdes a la persona.', 'You save the salary, you lose the person.', 'Du sparst das Gehalt, verlierst aber die Person.') },
        ],
      };
    },
    defaultChoice: 'let-go',
    resolve: (ctx, params, choice) => {
      const stillThere = ctx.employees.some((employee) => employee.id === params.employeeId);
      if (!stillThere) return { tone: 'neutral', message: L(`${params.name} ya no estaba en el equipo.`, `${params.name} was no longer on the team.`, `${params.name} war nicht mehr im Team.`) };
      return choice === 'raise'
        ? { tone: 'good', raiseSalary: { employeeId: params.employeeId, factor: 1.3 }, message: L(`${params.name} se queda con un 30% más de sueldo.`, `${params.name} stays with a 30% raise.`, `${params.name} bleibt mit 30% mehr Gehalt.`) }
        : { tone: 'bad', removeEmployeeId: params.employeeId, message: L(`${params.name} se fue a la otra empresa.`, `${params.name} left for the other company.`, `${params.name} ist zur anderen Firma gewechselt.`) };
    },
  },
  {
    key: 'security-report',
    name: L('Un hacker ético encontró una falla', 'An ethical hacker found a flaw', 'Ein ethischer Hacker hat eine Lücke gefunden'),
    weight: 6,
    eligible: (ctx) => ctx.stage >= 2 && ctx.activeUsers >= 150,
    build: (ctx) => {
      const bounty = 500 * (1 + ctx.stage);
      return {
        description: L(
          `Un investigador encontró una falla grave en tu API y pide ${$(bounty)} de recompensa por explicarte cómo arreglarla antes de publicarla.`,
          `A researcher found a serious flaw in your API and asks for a ${$(bounty)} bounty to explain the fix before disclosing it.`,
          `Ein Forscher hat eine schwere Lücke in deiner API gefunden und verlangt ${$(bounty)} Belohnung, um dir die Lösung vor der Veröffentlichung zu erklären.`,
        ),
        params: { bounty },
        choices: [
          { key: 'pay', label: L(`Pagar ${$(bounty)}`, `Pay ${$(bounty)}`, `${$(bounty)} zahlen`), hint: L('Arreglas la falla antes de que alguien la use.', 'You fix it before anyone exploits it.', 'Du schließt die Lücke, bevor jemand sie ausnutzt.') },
          { key: 'ignore', label: L('Ignorarlo', 'Ignore it', 'Ignorieren'), hint: L('Quizás nadie más la encuentre… quizás sí.', 'Maybe nobody else finds it… maybe they do.', 'Vielleicht findet sie sonst niemand… vielleicht doch.') },
        ],
      };
    },
    defaultChoice: 'ignore',
    canChoose: (ctx, params, choice) => (choice === 'pay' && ctx.cash < params.bounty ? NO_CASH : null),
    resolve: (_ctx, params, choice, rng) => {
      if (choice === 'pay') {
        return {
          tone: 'good',
          cash: -params.bounty,
          reputation: 3,
          message: L(
            'Pagaste la recompensa y parcheaste la falla. Tus usuarios nunca estuvieron en riesgo.',
            'You paid the bounty and patched the flaw. Your users were never at risk.',
            'Du hast die Belohnung bezahlt und die Lücke geschlossen. Deine Nutzer waren nie in Gefahr.',
          ),
        };
      }
      return rng() < 0.6
        ? {
            tone: 'bad',
            reputation: -5,
            spawnBugKey: 'exposed-api',
            message: L(
              'Ignoraste el aviso y alguien más encontró la falla: una API expone datos de tus usuarios.',
              'You ignored the warning and someone else found the flaw: an API is exposing your users’ data.',
              'Du hast die Warnung ignoriert und jemand anderes hat die Lücke gefunden: eine API legt Nutzerdaten offen.',
            ),
          }
        : { tone: 'neutral', message: L('Ignoraste el aviso. Esta vez tuviste suerte… la falla sigue ahí.', 'You ignored the warning. You got lucky this time… the flaw is still there.', 'Du hast die Warnung ignoriert. Diesmal Glück gehabt… die Lücke ist noch da.') };
    },
  },
  {
    key: 'cloud-credits',
    name: L('Créditos gratis de un proveedor cloud', 'Free credits from a cloud provider', 'Gratis-Guthaben von einem Cloud-Anbieter'),
    weight: 6,
    eligible: (ctx) => ctx.stage >= 1 && ctx.stage <= 4 && ctx.hostingSlugs.size > 0,
    build: (ctx) => {
      const credits = 1500 + ctx.stage * 1000;
      return {
        description: L(
          `Otro proveedor cloud te regala ${$(credits)} en créditos si migras tu app. Migrar lleva unos días: habrá cortes y código apurado.`,
          `Another cloud provider gives you ${$(credits)} in credits if you migrate. Migrating takes a few days: expect downtime and rushed code.`,
          `Ein anderer Cloud-Anbieter schenkt dir ${$(credits)} Guthaben, wenn du migrierst. Die Migration dauert ein paar Tage: rechne mit Ausfällen und hastigem Code.`,
        ),
        params: { credits },
        choices: [
          { key: 'migrate', label: L(`Migrar (+${$(credits)})`, `Migrate (+${$(credits)})`, `Migrieren (+${$(credits)})`), hint: L('+caja, −satisfacción, +deuda técnica.', '+cash, −satisfaction, +tech debt.', '+Geld, −Zufriedenheit, +technische Schulden.') },
          { key: 'stay', label: L('Quedarte donde estás', 'Stay where you are', 'Bleiben, wo du bist'), hint: L('Nada cambia.', 'Nothing changes.', 'Nichts ändert sich.') },
        ],
      };
    },
    defaultChoice: 'stay',
    resolve: (_ctx, params, choice) =>
      choice === 'migrate'
        ? {
            tone: 'neutral',
            cash: params.credits,
            satisfaction: -4,
            techDebt: 10,
            message: L(
              `Migraste y recibiste ${$(params.credits)} en créditos. Hubo cortes y quedó algo de deuda técnica.`,
              `You migrated and got ${$(params.credits)} in credits. There was some downtime and leftover tech debt.`,
              `Du bist migriert und hast ${$(params.credits)} Guthaben bekommen. Es gab Ausfälle und etwas technische Schulden.`,
            ),
          }
        : { tone: 'neutral', message: L('Te quedaste con tu proveedor. Estabilidad antes que descuentos.', 'You stayed with your provider. Stability over discounts.', 'Du bist bei deinem Anbieter geblieben. Stabilität vor Rabatten.') },
  },
  {
    key: 'feature-request',
    name: L('Tus usuarios piden algo a gritos', 'Your users are begging for something', 'Deine Nutzer wollen unbedingt etwas'),
    weight: 7,
    eligible: (ctx) => ctx.stage >= 2 && ctx.activeUsers >= 100,
    build: (ctx, rng) => {
      const requests = [
        L('modo oscuro', 'dark mode', 'Dark Mode'),
        L('exportar sus datos a Excel', 'export their data to Excel', 'Datenexport nach Excel'),
        L('iniciar sesión con Google', 'sign in with Google', 'Login mit Google'),
        L('una app para tablet', 'a tablet app', 'eine Tablet-App'),
      ];
      const request = requests[Math.floor(rng() * requests.length)];
      const cost = 400 + ctx.stage * 250;
      return {
        description: L(
          `Cientos de usuarios piden ${request.es}. No está en tu roadmap, pero lo piden en todas las reseñas.`,
          `Hundreds of users are asking for ${request.en}. It's not on your roadmap, but it's in every review.`,
          `Hunderte Nutzer wünschen sich ${request.de}. Es steht nicht auf deiner Roadmap, aber in jeder Bewertung.`,
        ),
        params: { cost },
        choices: [
          { key: 'build', label: L(`Hacerlo ya (${$(cost)})`, `Build it now (${$(cost)})`, `Sofort bauen (${$(cost)})`), hint: L('+satisfacción y reputación.', '+satisfaction and reputation.', '+Zufriedenheit und Ruf.') },
          { key: 'later', label: L('Dejarlo para después', 'Leave it for later', 'Auf später verschieben'), hint: L('Los usuarios se molestan un poco.', 'Users get a little annoyed.', 'Die Nutzer sind etwas verärgert.') },
        ],
      };
    },
    defaultChoice: 'later',
    canChoose: (ctx, params, choice) => (choice === 'build' && ctx.cash < params.cost ? NO_CASH : null),
    resolve: (_ctx, params, choice) =>
      choice === 'build'
        ? {
            tone: 'good',
            cash: -params.cost,
            satisfaction: 6,
            reputation: 2,
            message: L('Lo lanzaste y las reseñas se llenaron de estrellas. Escuchar a los usuarios paga.', 'You shipped it and the reviews filled with stars. Listening to users pays off.', 'Du hast es veröffentlicht und die Bewertungen sind voller Sterne. Auf Nutzer zu hören lohnt sich.'),
          }
        : { tone: 'bad', satisfaction: -3, message: L('Lo dejaste para después. Algunos usuarios se quejan en redes.', 'You left it for later. Some users complain on social media.', 'Du hast es verschoben. Einige Nutzer beschweren sich in sozialen Netzwerken.') },
  },
  {
    key: 'price-war',
    name: L('Un competidor bajó sus precios a la mitad', 'A competitor cut prices in half', 'Ein Konkurrent hat die Preise halbiert'),
    weight: 6,
    eligible: (ctx) => ctx.stage >= 3 && ctx.hasMonetization,
    build: (ctx) => {
      const campaign = Math.max(800, Math.round(ctx.dailyRevenue * 3));
      return {
        description: L(
          'Un competidor con mucha inversión bajó sus precios a la mitad para robarte clientes. ¿Cómo respondes?',
          'A heavily funded competitor halved its prices to steal your customers. How do you respond?',
          'Ein gut finanzierter Konkurrent hat seine Preise halbiert, um dir Kunden abzujagen. Wie reagierst du?',
        ),
        params: { campaign },
        choices: [
          { key: 'discount', label: L('Descuento temporal', 'Temporary discount', 'Befristeter Rabatt'), hint: L('Pierdes 2 días de ingresos, retienes a casi todos.', 'Lose 2 days of revenue, keep almost everyone.', '2 Tage Umsatz weniger, fast alle bleiben.') },
          { key: 'quality', label: L(`Campaña de calidad (${$(campaign)})`, `Quality campaign (${$(campaign)})`, `Qualitätskampagne (${$(campaign)})`), hint: L('Destacas lo que te hace mejor. +reputación.', 'Highlight what makes you better. +reputation.', 'Zeig, was dich besser macht. +Ruf.') },
          { key: 'ignore', label: L('No hacer nada', 'Do nothing', 'Nichts tun'), hint: L('Se van algunos usuarios.', 'Some users leave.', 'Einige Nutzer gehen.') },
        ],
      };
    },
    defaultChoice: 'ignore',
    canChoose: (ctx, params, choice) => (choice === 'quality' && ctx.cash < params.campaign ? NO_CASH : null),
    resolve: (ctx, params, choice) => {
      if (choice === 'discount') {
        return {
          tone: 'neutral',
          cash: -Math.round(ctx.dailyRevenue * 2),
          users: -pct(ctx.activeUsers, 0.01),
          message: L('Igualaste con un descuento temporal. Te costó ingresos, pero casi nadie se fue.', 'You matched with a temporary discount. It cost revenue, but almost nobody left.', 'Du hast mit einem befristeten Rabatt gekontert. Das kostete Umsatz, aber fast niemand ging.'),
        };
      }
      if (choice === 'quality') {
        return {
          tone: 'good',
          cash: -params.campaign,
          reputation: 3,
          users: -pct(ctx.activeUsers, 0.02),
          message: L('Tu campaña de calidad funcionó: los clientes que valoran el producto se quedaron.', 'Your quality campaign worked: customers who value the product stayed.', 'Deine Qualitätskampagne hat gewirkt: Kunden, die das Produkt schätzen, sind geblieben.'),
        };
      }
      return {
        tone: 'bad',
        users: -pct(ctx.activeUsers, 0.07),
        message: L('No respondiste y el 7% de tus usuarios se fue al competidor barato.', 'You did not respond and 7% of your users left for the cheap competitor.', 'Du hast nicht reagiert und 7% deiner Nutzer sind zum billigen Konkurrenten gewechselt.'),
      };
    },
  },
  {
    key: 'interns',
    name: L('Una universidad ofrece practicantes', 'A university offers interns', 'Eine Uni bietet Praktikanten an'),
    weight: 5,
    eligible: (ctx) => ctx.stage >= 2 && ctx.activeTaskCount >= 1,
    build: () => ({
      description: L(
        'Una universidad te ofrece 3 practicantes gratis por un mes. Aceleran el desarrollo, pero todavía están aprendiendo.',
        'A university offers you 3 free interns for a month. They speed up development, but they are still learning.',
        'Eine Uni bietet dir 3 kostenlose Praktikanten für einen Monat. Sie beschleunigen die Entwicklung, lernen aber noch.',
      ),
      params: {},
      choices: [
        { key: 'accept', label: L('Aceptar', 'Accept', 'Annehmen'), hint: L('+15% de avance, +deuda técnica.', '+15% progress, +tech debt.', '+15% Fortschritt, +technische Schulden.') },
        { key: 'decline', label: L('No, gracias', 'No, thanks', 'Nein, danke'), hint: L('Nada cambia.', 'Nothing changes.', 'Nichts ändert sich.') },
      ],
    }),
    defaultChoice: 'decline',
    resolve: (_ctx, _params, choice) =>
      choice === 'accept'
        ? {
            tone: 'good',
            taskProgressBoost: 0.15,
            techDebt: 8,
            reputation: 1,
            message: L('Los practicantes adelantaron un 15% del trabajo. Hay que revisar su código con cuidado.', 'The interns moved the work forward 15%. Their code needs careful review.', 'Die Praktikanten haben die Arbeit um 15% vorangebracht. Ihr Code braucht sorgfältiges Review.'),
          }
        : { tone: 'neutral', message: L('Rechazaste a los practicantes.', 'You turned down the interns.', 'Du hast die Praktikanten abgelehnt.') },
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
  { value: 0.6, label: L('Muy barato', 'Very cheap', 'Sehr günstig') },
  { value: 0.8, label: L('Barato', 'Cheap', 'Günstig') },
  { value: 1, label: L('Normal', 'Normal', 'Normal') },
  { value: 1.3, label: L('Caro', 'Pricey', 'Teuer') },
  { value: 1.6, label: L('Premium', 'Premium', 'Premium') },
] as const;
