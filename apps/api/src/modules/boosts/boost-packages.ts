import { CoinBoostScope } from '@prisma/client';

// Catálogo de boosts de monedas comprables con dinero real. Igual que
// COIN_PACKAGES: precio, multiplicador y duración viven en el servidor y el
// cliente solo manda la key -- nunca el monto.
export interface BoostPackage {
  key: string;
  scope: CoinBoostScope;
  multiplier: number;
  durationMinutes: number;
  priceUsd: number;
}

export const BOOST_PACKAGES: BoostPackage[] = [
  // Para quien lo compra, 24 h.
  { key: 'boost_personal_24h', scope: CoinBoostScope.PERSONAL, multiplier: 1.5, durationMinutes: 24 * 60, priceUsd: 1.99 },
  // Para TODOS durante 1 h; quien lo paga es Mecenas mientras dura.
  { key: 'boost_community_1h', scope: CoinBoostScope.COMMUNITY, multiplier: 1.5, durationMinutes: 60, priceUsd: 4.99 },
];

// Un personal y uno comunitario a la vez dan x2.25: se recorta a x2 para
// que el boost nunca descuadre la economía de la tienda.
export const MAX_COIN_MULTIPLIER = 2;

// Paddle: un product "Boosts" con precio ad-hoc por paquete (como los
// certificados), así no hay que crear un price por boost.
export const BOOST_PRODUCT_ENV = 'PADDLE_BOOST_PRODUCT_ID';

export function findBoostPackage(key: string) {
  return BOOST_PACKAGES.find((pkg) => pkg.key === key);
}

/** Monedas finales con el multiplicador ya recortado (siempre enteras). */
export function boostedCoins(base: number, multiplier: number) {
  if (base <= 0) return base;
  const factor = Math.min(MAX_COIN_MULTIPLIER, Math.max(1, multiplier));
  return Math.round(base * factor);
}
