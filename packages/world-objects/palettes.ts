/**
 * Paletas de color del juego, compartidas por apps/api (valida lo que manda
 * el cliente), apps/game (los selectores de color) y apps/web.
 *
 * Dos familias:
 *   - SKIN:  tonos de piel, para el slot BODY del avatar.
 *   - COLOR: ropa, accesorios y objetos del mundo (muebles, decoración).
 *
 * Cada familia tiene colores FREE (para todos) y PREMIUM (solo con
 * suscripción activa). Agregar un color acá lo habilita en las tres apps a
 * la vez; el server rechaza cualquier color que no esté en estas listas.
 */

export type PaletteKind = 'SKIN' | 'COLOR';

export const SKIN_FREE_COLORS: readonly number[] = [
  0xf6d6bd, 0xeac086, 0xd9a066, 0xc68642, 0x8d5524, 0x5c3820,
];

// Tonos de fantasía: elfo, orco, alien, vampiro, dorado, plata, etc.
export const SKIN_PREMIUM_COLORS: readonly number[] = [
  0xffe4ec, 0xfff3c4, 0xb8f2c8, 0x7fc97f, 0x8ecae6, 0x5e81ac,
  0xc3a6ff, 0x9d4edd, 0xd4d4d8, 0x71717a, 0xf4c430, 0xb87333,
];

export const COLOR_FREE_COLORS: readonly number[] = [
  0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xff6600,
  0x9900ff, 0xff1493, 0x00ff99, 0xffadad, 0xffd6a5, 0xfdffb6, 0xcaffbf,
  0x9bf6ff, 0xbdb2ff, 0xffffff, 0xd6d6d6, 0x888888, 0x444444, 0x000000,
];

// Metálicos, neón, pastel profundo y tonos "joya".
export const COLOR_PREMIUM_COLORS: readonly number[] = [
  0xffd700, 0xc0c0c0, 0xcd7f32, 0xe5e4e2, 0x39ff14, 0xff073a,
  0x0ff0fc, 0xbc13fe, 0xff6ec7, 0xfaff00, 0x50c878, 0x0f52ba,
  0x9b111e, 0x9966cc, 0x40e0d0, 0x2c1e3f, 0x1b4d3e, 0x7b3f00,
];

export function paletteColors(kind: PaletteKind) {
  return kind === 'SKIN'
    ? { free: SKIN_FREE_COLORS, premium: SKIN_PREMIUM_COLORS }
    : { free: COLOR_FREE_COLORS, premium: COLOR_PREMIUM_COLORS };
}

export function isPremiumColor(kind: PaletteKind, color: number): boolean {
  return paletteColors(kind).premium.includes(color);
}

/**
 * ¿Puede este usuario usar `color`? null/undefined = "sin color" (el sprite
 * tal cual), siempre permitido. Un color fuera de las listas se rechaza.
 */
export function canUseColor(
  kind: PaletteKind,
  color: number | null | undefined,
  hasPremium: boolean,
): boolean {
  if (color === null || color === undefined) return true;
  const { free, premium } = paletteColors(kind);
  if (free.includes(color)) return true;
  return hasPremium && premium.includes(color);
}
