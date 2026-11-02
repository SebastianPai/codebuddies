-- Recompensas en monedas ÷10, igual que los precios (20261031000000_economy_
-- rebalance_div10 bajó lo que cuestan las cosas pero no lo que se gana, así
-- que todo salía 10 veces más fácil). Nunca menos de 1: una recompensa en
-- monedas no puede quedar en 0. Los saldos de los jugadores y los cupones
-- (PromoCode, los escribe el admin a mano) no se tocan.

-- Listas de recompensas [{type, amount, ...}]: solo los elementos COINS.
CREATE FUNCTION pg_temp.coins_div10(r jsonb) RETURNS jsonb AS $$
  SELECT CASE
    WHEN r IS NULL OR jsonb_typeof(r) <> 'array' THEN r
    ELSE COALESCE((
      SELECT jsonb_agg(
        CASE
          WHEN upper(e->>'type') = 'COINS'
            AND (e->>'amount') ~ '^[0-9]+(\.[0-9]+)?$'
            AND (e->>'amount')::numeric > 0
          THEN jsonb_set(e, '{amount}', to_jsonb(GREATEST(1, round((e->>'amount')::numeric / 10))::int))
          ELSE e
        END
        ORDER BY ord)
      FROM jsonb_array_elements(r) WITH ORDINALITY AS t(e, ord)
    ), '[]'::jsonb)
  END
$$ LANGUAGE sql IMMUTABLE;

UPDATE "Mission" SET "rewards" = pg_temp.coins_div10("rewards"::jsonb) WHERE "rewards" IS NOT NULL;
UPDATE "GamificationAchievement" SET "rewards" = pg_temp.coins_div10("rewards"::jsonb) WHERE "rewards" IS NOT NULL;
UPDATE "RewardBundle" SET "rewards" = pg_temp.coins_div10("rewards"::jsonb);
UPDATE "CodeStudioResearch" SET "rewards" = pg_temp.coins_div10("rewards"::jsonb) WHERE "rewards" IS NOT NULL;
UPDATE "CodeStudioAchievement" SET "rewards" = pg_temp.coins_div10("rewards"::jsonb) WHERE "rewards" IS NOT NULL;

-- Columnas con la cantidad directa.
UPDATE "BattlePassTier" SET "amount" = GREATEST(1, round("amount" / 10.0)::int)
  WHERE "rewardType" = 'COINS' AND "amount" > 0;
UPDATE "ReferralReward" SET "amount" = GREATEST(1, round("amount" / 10.0)::int)
  WHERE "rewardType" = 'COINS' AND "amount" > 0;
UPDATE "Lesson" SET "coins" = GREATEST(1, round("coins" / 10.0)::int) WHERE "coins" > 0;
UPDATE "Exercise" SET "coins" = GREATEST(1, round("coins" / 10.0)::int) WHERE "coins" > 0;

-- Lecciones y ejercicios nuevos: 1 moneda por defecto (antes 10 y 5).
ALTER TABLE "Lesson" ALTER COLUMN "coins" SET DEFAULT 1;
ALTER TABLE "Exercise" ALTER COLUMN "coins" SET DEFAULT 1;
