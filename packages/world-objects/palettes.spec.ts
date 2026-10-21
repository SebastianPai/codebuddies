import {
  COLOR_FREE_COLORS,
  COLOR_PREMIUM_COLORS,
  SKIN_FREE_COLORS,
  SKIN_PREMIUM_COLORS,
  canUseColor,
  isPremiumColor,
} from './palettes';

describe('palettes', () => {
  it('free y premium no se pisan (un color no puede ser de las dos)', () => {
    expect(SKIN_PREMIUM_COLORS.filter((c) => SKIN_FREE_COLORS.includes(c))).toEqual([]);
    expect(COLOR_PREMIUM_COLORS.filter((c) => COLOR_FREE_COLORS.includes(c))).toEqual([]);
  });

  it('sin color siempre está permitido', () => {
    expect(canUseColor('COLOR', null, false)).toBe(true);
    expect(canUseColor('SKIN', undefined, false)).toBe(true);
  });

  it('free para todos, premium solo con suscripción', () => {
    expect(canUseColor('COLOR', COLOR_FREE_COLORS[0], false)).toBe(true);
    expect(canUseColor('COLOR', COLOR_PREMIUM_COLORS[0], false)).toBe(false);
    expect(canUseColor('COLOR', COLOR_PREMIUM_COLORS[0], true)).toBe(true);
    expect(isPremiumColor('SKIN', SKIN_PREMIUM_COLORS[0])).toBe(true);
  });

  it('rechaza colores fuera de la paleta aunque sea premium', () => {
    expect(canUseColor('COLOR', 0x123456, true)).toBe(false);
    // un tono de piel no vale como color de ropa, ni al revés
    expect(canUseColor('COLOR', SKIN_FREE_COLORS[0], true)).toBe(false);
  });
});
