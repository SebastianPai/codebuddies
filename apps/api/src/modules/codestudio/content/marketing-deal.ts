// Oferta del momento en un canal de marketing: si tienes a alguien de
// marketing en el equipo, está pendiente de los precios y encuentra un canal
// 20-35% más barato. Cambia cada 10 minutos (10 días de juego) y es la misma
// para todos los que miran la empresa (sale de una semilla, no se guarda).

const DEAL_WINDOW_MS = 10 * 60_000;

function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export type MarketingDeal = { slug: string; discount: number };

export function marketingDeal(companyId: string, unlockedSlugs: string[], hasMarketer: boolean, now = Date.now()): MarketingDeal | null {
  if (!hasMarketer || unlockedSlugs.length === 0) return null;
  const seed = hash(`${companyId}:deal:${Math.floor(now / DEAL_WINDOW_MS)}`);
  const slug = [...unlockedSlugs].sort()[seed % unlockedSlugs.length];
  return { slug, discount: (20 + (seed >>> 8) % 16) / 100 };
}

/** Aplica la oferta a una cotización: misma gente por menos plata. */
export function applyDeal<T extends { cost: number; cac: number; users: number }>(quote: T, discount: number): T {
  if (discount <= 0) return quote;
  return { ...quote, cost: Math.round(quote.cost * (1 - discount)), cac: quote.cac * (1 - discount) };
}
