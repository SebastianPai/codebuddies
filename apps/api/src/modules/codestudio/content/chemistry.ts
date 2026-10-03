// Química del equipo (0-100): qué tan bien se complementan. La misma cuenta
// que muestra la Plantilla en el juego (SquadBoard). Afecta lo que construye
// el equipo: química 0 = -10%, 50 = normal, 100 = +10%.

const BUILDERS = new Set(['fullstack', 'frontend', 'backend']);

export type ChemistryMember = { roleSlug: string; seniority: string; traitKey: string; traitTone: string };

export function chemistryScore(team: ChemistryMember[]) {
  if (team.length === 0) return 50;
  let value = 50;
  const builders = team.filter((member) => BUILDERS.has(member.roleSlug)).length;
  const has = (slug: string) => team.some((member) => member.roleSlug === slug);
  const qa = team.filter((member) => member.roleSlug === 'qa').length;
  const juniors = team.filter((member) => member.seniority === 'junior').length;
  const seniors = team.filter((member) => member.seniority === 'senior' || member.seniority === 'lead').length;
  const bad = team.filter((member) => member.traitTone === 'bad').length;

  if (builders >= 2) value += has('product-manager') ? 15 : -10;
  if (builders >= 3 && qa === 0) value -= 10;
  else if (qa > 0) value += 8;
  if (juniors > 0) value += seniors > 0 ? 10 : -10;
  if (team.some((member) => member.traitKey === 'mentor')) value += 8;
  if (bad / team.length > 0.4) value -= 15;
  if (builders === 0) value -= 15;
  return Math.max(0, Math.min(100, value));
}

export function chemistryFactor(score: number) {
  return 1 + (score - 50) / 500;
}
