-- Insignia PREMIUM junto al nombre (logo configurable en /admin/badges).
ALTER TYPE "BadgeType" ADD VALUE IF NOT EXISTS 'PREMIUM';

-- Insignia del catálogo de gamificación que entrega el Battle Pass: quien la
-- tiene muestra el logo Premium aunque su suscripción venza. Id fijo porque
-- BadgesService la busca por id (PREMIUM_LOGO_BADGE_ID).
INSERT INTO "GamificationBadge" ("id", "name", "description", "rarity", "active", "createdAt", "updatedAt")
VALUES (
  'badge-premium-logo',
  'Logo Premium',
  'Logo Premium junto al nombre. Primer regalo del track premium del Battle Pass.',
  'premium',
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("id") DO NOTHING;

-- Primer regalo (nivel 1, track PREMIUM) de las temporadas activas o por
-- venir. sortOrder al final del nivel 1 para no chocar con lo que ya haya.
INSERT INTO "BattlePassTier" ("id", "seasonId", "level", "track", "rewardType", "itemId", "label", "sortOrder", "createdAt", "updatedAt")
SELECT
  'battle-pass-premium-logo-' || s."id",
  s."id",
  1,
  'PREMIUM',
  'BADGE',
  'badge-premium-logo',
  'Insignia: Logo Premium',
  COALESCE(
    (SELECT MAX(t."sortOrder") + 1 FROM "BattlePassTier" t
      WHERE t."seasonId" = s."id" AND t."level" = 1 AND t."track" = 'PREMIUM'),
    0
  ),
  NOW(),
  NOW()
FROM "BattlePassSeason" s
WHERE s."status" IN ('ACTIVE', 'UPCOMING')
ON CONFLICT DO NOTHING;
