// Empleados de CodeStudio como "cartas" tipo FIFA: género, nombre, skin y
// estadísticas 0-99. La skin sale de los NPC de tipo EMPLOYEE que se cargan
// en /admin (con género); mientras no haya ninguno se usa el mayordomo.

import { performanceOf, traitOf } from './traits';

export type Gender = 'MALE' | 'FEMALE';

const FIRST: Record<Gender, string[]> = {
  FEMALE: ['Luna', 'Sofi', 'Vale', 'Mara', 'Iris', 'Juli', 'Emi', 'Ana', 'Camila', 'Paula', 'Sara', 'Lía'],
  MALE: ['Nico', 'Max', 'Kai', 'Leo', 'Noah', 'Tomi', 'Sam', 'Mateo', 'Lucas', 'Dani', 'Gabo', 'Iván'],
};
const LAST = ['Pixel', 'Stack', 'Cloud', 'Sprint', 'Byte', 'Nova', 'Cache', 'Loop', 'Script', 'Rocket', 'Commit', 'Deploy'];

const pick = <T,>(list: T[], rng: () => number) => list[Math.floor(rng() * list.length)];

export function rollGender(rng: () => number = Math.random): Gender {
  return rng() < 0.5 ? 'FEMALE' : 'MALE';
}

export function employeeName(gender: Gender, rng: () => number = Math.random) {
  return `${pick(FIRST[gender], rng)} ${pick(LAST, rng)}`;
}

/** Género de un empleado de antes (sin género guardado): por su nombre. */
export function genderOf(employee: { name: string; metadata: unknown }): Gender {
  const meta = employee.metadata as { gender?: Gender } | null;
  if (meta?.gender === 'MALE' || meta?.gender === 'FEMALE') return meta.gender;
  const first = employee.name.split(' ')[0];
  return FIRST.FEMALE.includes(first) ? 'FEMALE' : 'MALE';
}

export function hashUnit(id: string) {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

type SkinNpc = { key: string; kind: string; gender: string | null; spriteSheetUrl: string | null; frameWidth: number; frameHeight: number };

/** Skin de un empleado: la guardada, o una del admin según su género, o el mayordomo. */
export function resolveSkin(employee: { id: string; name: string; avatar: string | null; metadata: unknown }, npcs: SkinNpc[]) {
  // Solo skins de empleados: el mayordomo es otra cosa y no se mezcla.
  const usable = npcs.filter((npc) => npc.spriteSheetUrl && npc.kind === 'EMPLOYEE');
  const saved = usable.find((npc) => npc.key === employee.avatar);
  if (saved) return saved;
  const gender = genderOf(employee);
  const pool = usable.filter((npc) => !npc.gender || npc.gender === gender);
  if (pool.length > 0) return pool[Math.floor(hashUnit(employee.id) * pool.length)];
  return null;
}

const stat = (value: number) => Math.round(Math.max(20, Math.min(99, 40 + (value - 0.7) * 100)));

/** Estadísticas de la carta (0-99) a partir de los atributos reales. */
export function cardStats(employee: {
  id: string;
  metadata: unknown;
  speed: number;
  quality: number;
  creativity: number;
  productivity: number;
  motivation: number;
  level: number;
  hiredAt: Date;
}) {
  const trait = traitOf(employee);
  const daysInTeam = Math.max(0, (Date.now() - employee.hiredAt.getTime()) / 60_000);
  return {
    overall: performanceOf(employee),
    vel: stat(employee.speed * trait.power),
    cal: stat(employee.quality / Math.max(0.5, trait.bugRisk) ** 0.5),
    cre: stat(employee.creativity),
    pro: stat(employee.productivity * trait.power),
    mot: Math.round(Math.max(1, Math.min(99, employee.motivation))),
    exp: Math.round(Math.min(99, 40 + employee.level * 8 + daysInTeam / 5)),
  };
}
