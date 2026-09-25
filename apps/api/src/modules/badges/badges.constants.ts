// En archivo propio (sin imports) para que el Battle Pass pueda usarlo sin
// depender de BadgesModule/BadgesService.

// GamificationBadge que entrega el nivel 1 del track premium del Battle Pass
// (ver migración 20260924000000_badge_premium): quien la tiene muestra el
// logo Premium aunque su suscripción venza.
export const PREMIUM_LOGO_BADGE_ID = 'badge-premium-logo';
