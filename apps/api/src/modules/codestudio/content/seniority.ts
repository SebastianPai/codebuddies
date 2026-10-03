// Seniority de los empleados y candidatos para contratar.
//
// - Junior / Semi-senior / Senior al contratar; Líder técnico solo por
//   ascenso. Más seniority = construye más, mete menos bugs y cobra más.
// - Los empleados suben solos al acumular trabajo (features + bugs
//   arreglados) y con el ascenso sube el sueldo.
// - Al contratar se ven 3 candidatos por rol (uno de cada nivel) con su
//   rasgo a la vista y cuánto cambia el equipo si entran. Los candidatos
//   salen de una semilla (empresa + rol + ventana de 10 minutos): no se
//   guardan y son los mismos al verlos y al contratarlos.

import { L, Localized } from './i18n/localized';
import { readMeta, rollTrait, TRAITS, type TraitKey } from './traits';
import { employeeName, rollGender, type Gender } from './employee-card';
import { ROLE_BY_SLUG } from './economy';

export type SeniorityKey = 'junior' | 'mid' | 'senior' | 'lead';

export type Seniority = {
  key: SeniorityKey;
  level: number;
  /** Multiplica el sueldo base del rol. */
  salary: number;
  /** Multiplica lo que construye. */
  power: number;
  /** Multiplica el riesgo de bug al publicar. */
  bugRisk: number;
  /** Trabajo acumulado (features + bugs arreglados) para subir al siguiente. */
  promoteAt: number | null;
  name: Localized;
};

export const SENIORITY: Record<SeniorityKey, Seniority> = {
  junior: { key: 'junior', level: 1, salary: 0.7, power: 0.8, bugRisk: 1.3, promoteAt: 6, name: L('Junior', 'Junior', 'Junior') },
  mid: { key: 'mid', level: 2, salary: 1, power: 1, bugRisk: 1, promoteAt: 18, name: L('Semi-senior', 'Mid-level', 'Mid-Level') },
  senior: { key: 'senior', level: 3, salary: 1.5, power: 1.25, bugRisk: 0.75, promoteAt: 40, name: L('Senior', 'Senior', 'Senior') },
  lead: { key: 'lead', level: 4, salary: 1.9, power: 1.4, bugRisk: 0.65, promoteAt: null, name: L('Líder técnico', 'Tech lead', 'Tech Lead') },
};

const ORDER: SeniorityKey[] = ['junior', 'mid', 'senior', 'lead'];

/** Sin dato (contratados antes de existir la seniority): Semi-senior, así nada cambia. */
export function seniorityOf(employee: { metadata: unknown }): Seniority {
  const key = readMeta(employee.metadata).seniority as SeniorityKey | undefined;
  return SENIORITY[key && SENIORITY[key] ? key : 'mid'];
}

/** Siguiente nivel si ya juntó el trabajo necesario; null si no toca ascender. */
export function promotionFor(employee: { metadata: unknown }): Seniority | null {
  const current = seniorityOf(employee);
  if (current.promoteAt === null) return null;
  const stats = (readMeta(employee.metadata).stats ?? {}) as { featuresShipped?: number; bugsFixed?: number };
  const work = (stats.featuresShipped ?? 0) + (stats.bugsFixed ?? 0);
  if (work < current.promoteAt) return null;
  return SENIORITY[ORDER[ORDER.indexOf(current.key) + 1]];
}

// ─── Candidatos ──────────────────────────────────────────────────────────

const CANDIDATE_WINDOW_MS = 10 * 60_000;
const CANDIDATE_LEVELS: SeniorityKey[] = ['junior', 'mid', 'senior'];

function seeded(seed: string) {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export type Candidate = {
  key: string;
  index: number;
  name: string;
  gender: Gender;
  age: number;
  seniority: Seniority;
  trait: TraitKey;
  salary: number;
  hireCost: number;
};

export function candidateWindow(now = Date.now()) {
  return Math.floor(now / CANDIDATE_WINDOW_MS);
}

/** Minutos (días de juego) hasta que llegan candidatos nuevos. */
export function minutesUntilNewCandidates(now = Date.now()) {
  return Math.ceil(((candidateWindow(now) + 1) * CANDIDATE_WINDOW_MS - now) / 60_000);
}

export function candidatesFor(companyId: string, role: { slug: string; salary: number }, hireBonusFactor: number, now = Date.now()): Candidate[] {
  const window = candidateWindow(now);
  return CANDIDATE_LEVELS.map((level, index) => {
    const key = `${companyId}:${role.slug}:${window}:${index}`;
    const rng = seeded(key);
    const gender = rollGender(rng);
    const name = employeeName(gender, rng);
    const trait = rollTrait(rng);
    const seniority = SENIORITY[level];
    const age = (level === 'junior' ? 19 : level === 'mid' ? 24 : 29) + Math.floor(rng() * 10);
    const salary = Math.round(role.salary * seniority.salary);
    return { key, index, name, gender, age, seniority, trait, salary, hireCost: Math.round(salary * hireBonusFactor) };
  });
}

// ─── Qué cambia en el equipo si entra ────────────────────────────────────

export type TeamMember = { roleSlug: string; power: number; bugRisk: number; salary: number };

export type TeamContext = {
  cash: number;
  dailyRevenue: number;
  supportGap: number;
  openBugs: number;
  utilization: number;
  activeUsers: number;
  campaigns: number;
  founderPower: number;
};

export type Impact = {
  /** Velocidad del equipo: % que suma esta persona y cuántas veces lo que harías tú solo. */
  speed: { delta: number; total: number };
  /** Riesgo de bug al publicar: % de cambio (negativo = menos bugs). */
  bugs: number | null;
  /** Sueldos diarios: % de aumento. */
  salaries: number;
  /** Compatibilidad 0-100 y por qué. */
  fit: number;
  reasons: Array<{ tone: 'good' | 'bad'; text: Localized }>;
};

function devPower(team: TeamMember[], founderPower: number) {
  const pm = 1 + 0.12 * Math.min(2, team.filter((member) => member.roleSlug === 'product-manager').length);
  return (founderPower + team.reduce((sum, member) => sum + (ROLE_BY_SLUG.get(member.roleSlug)?.devPower ?? 0.5) * member.power, 0)) * pm;
}

function bugRisk(team: TeamMember[]) {
  const builders = team.filter((member) => (ROLE_BY_SLUG.get(member.roleSlug)?.devPower ?? 0) > 0);
  if (builders.length === 0) return 1;
  // QA y PM bajan el riesgo de todo el equipo.
  const qa = team.filter((member) => member.roleSlug === 'qa').length;
  const pm = team.filter((member) => member.roleSlug === 'product-manager').length;
  const average = builders.reduce((sum, member) => sum + member.bugRisk, 0) / builders.length;
  return average * Math.max(0.5, 1 - 0.1 * Math.min(3, qa) - 0.06 * Math.min(2, pm));
}

const pct = (after: number, before: number) => (before > 0 ? Math.round(((after - before) / before) * 100) : 0);

/** Lo que una persona del rol `roleSlug` hace por el equipo, según cómo va la empresa. */
function roleNeed(roleSlug: string, team: TeamMember[], ctx: TeamContext): Localized | null {
  const has = (slug: string) => team.some((member) => member.roleSlug === slug);
  const builders = team.filter((member) => (ROLE_BY_SLUG.get(member.roleSlug)?.devPower ?? 0) >= 1).length;
  switch (roleSlug) {
    case 'support':
      return ctx.supportGap >= 1 ? L('Te falta soporte: los usuarios esperan respuesta', 'You lack support: users are waiting for answers', 'Dir fehlt Support: Nutzer warten auf Antworten') : null;
    case 'qa':
      return ctx.openBugs >= 2 ? L('Tienes bugs abiertos: QA evita que salgan más', 'You have open bugs: QA keeps more from shipping', 'Du hast offene Bugs: QA verhindert neue') : null;
    case 'product-manager':
      return !has('product-manager') && builders >= 2 ? L('Ya tienes equipo: un PM lo ordena y asigna los bugs', 'You have a team: a PM organizes it and assigns bugs', 'Du hast ein Team: Ein PM organisiert es und verteilt Bugs') : null;
    case 'devops':
      return ctx.utilization > 0.8 ? L('Tus servidores están al límite', 'Your servers are at their limit', 'Deine Server sind am Limit') : null;
    case 'marketing':
    case 'community-manager':
      return ctx.campaigns === 0 && ctx.activeUsers < 200 ? L('Necesitas que te conozcan: tienes pocos usuarios', 'You need people to find you: you have few users', 'Du musst bekannter werden: Du hast wenige Nutzer') : null;
    case 'fullstack':
    case 'frontend':
    case 'backend':
      return builders === 0 ? L('No tienes quién programe: construirías mucho más rápido', "Nobody codes for you: you'd build much faster", 'Niemand programmiert für dich: Du würdest viel schneller bauen') : null;
    default:
      return null;
  }
}

export function candidateImpact(team: TeamMember[], candidate: { roleSlug: string; power: number; bugRisk: number; salary: number; trait: TraitKey; seniority: Seniority }, ctx: TeamContext): Impact {
  const after = [...team, candidate];
  const speedBefore = devPower(team, ctx.founderPower);
  const speedAfter = devPower(after, ctx.founderPower);
  const builds = (ROLE_BY_SLUG.get(candidate.roleSlug)?.devPower ?? 0) > 0 || ['qa', 'product-manager'].includes(candidate.roleSlug);
  const salariesBefore = team.reduce((sum, member) => sum + member.salary, 0);

  const reasons: Impact['reasons'] = [];
  let fit = 50;
  const need = roleNeed(candidate.roleSlug, team, ctx);
  if (need) {
    fit += 25;
    reasons.push({ tone: 'good', text: need });
  }
  const trait = TRAITS[candidate.trait];
  if (trait.tone === 'good') fit += 15;
  if (trait.tone === 'bad') fit -= 20;
  reasons.push({ tone: trait.tone === 'bad' ? 'bad' : 'good', text: L(`${trait.name.es}: ${trait.description.es}`, `${trait.name.en}: ${trait.description.en}`, `${trait.name.de}: ${trait.description.de}`) });
  if (candidate.seniority.key === 'senior') {
    fit += 10;
    reasons.push({ tone: 'good', text: L('Senior: rinde más y mete menos bugs', 'Senior: more output and fewer bugs', 'Senior: mehr Leistung, weniger Bugs') });
  }
  if (candidate.seniority.key === 'junior') {
    fit -= 5;
    reasons.push({ tone: 'bad', text: L('Junior: barato, pero aprende sobre la marcha (más bugs)', 'Junior: cheap, but learns on the job (more bugs)', 'Junior: günstig, lernt aber noch (mehr Bugs)') });
  }
  if (ctx.cash < candidate.salary * 10) {
    fit -= 15;
    reasons.push({ tone: 'bad', text: L('Caro para tu caja: te alcanza para pocos días', 'Expensive for your cash: it lasts only a few days', 'Teuer für deine Kasse: reicht nur ein paar Tage') });
  }
  return {
    speed: { delta: pct(speedAfter, speedBefore), total: Math.round((speedAfter / Math.max(0.1, ctx.founderPower)) * 10) / 10 },
    bugs: builds ? pct(bugRisk(after), bugRisk(team)) : null,
    salaries: salariesBefore > 0 ? pct(salariesBefore + candidate.salary, salariesBefore) : 100,
    fit: Math.max(5, Math.min(99, fit)),
    reasons,
  };
}
