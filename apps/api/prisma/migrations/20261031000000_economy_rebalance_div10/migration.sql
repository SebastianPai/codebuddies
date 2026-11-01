-- Rebalanceo de economía (2026-10-31): todos los precios en coins bajan ÷10.
-- Lo que se gana (lecciones, ejercicios, diarias, starter) NO cambia, y los
-- saldos de los usuarios tampoco: solo bajan los precios. Los bloques
-- modulares (1x1 apilables) pasan a su propio rango de 1 a 5 coins.
-- Un precio > 0 nunca queda en 0 (0 = "no vendible").

-- Bloques modulares: el rango común viejo (50-200) cae en 1-5.
UPDATE "Item" i
SET "coinsPrice" = LEAST(5, GREATEST(1, ROUND(i."coinsPrice" / 40.0)))
FROM "WorldItemData" w
WHERE w."itemId" = i."id"
  AND w."canBeStacked" = true
  AND w."footprintWidth" = 1
  AND w."footprintHeight" = 1
  AND i."coinsPrice" > 0;

-- El resto de los items (avatar, muebles, efectos de nombre...).
UPDATE "Item" i
SET "coinsPrice" = GREATEST(1, ROUND(i."coinsPrice" / 10.0))
WHERE i."coinsPrice" > 0
  AND NOT EXISTS (
    SELECT 1 FROM "WorldItemData" w
    WHERE w."itemId" = i."id"
      AND w."canBeStacked" = true
      AND w."footprintWidth" = 1
      AND w."footprintHeight" = 1
  );

UPDATE "PetSpeciesConfig" SET "coinsPrice" = GREATEST(1, ROUND("coinsPrice" / 10.0)) WHERE "coinsPrice" > 0;
UPDATE "NpcConfig"        SET "coinsPrice" = GREATEST(1, ROUND("coinsPrice" / 10.0)) WHERE "coinsPrice" > 0;
UPDATE "RoomBackground"   SET "coinsPrice" = GREATEST(1, ROUND("coinsPrice" / 10.0)) WHERE "coinsPrice" > 0;
UPDATE "Power"            SET "priceCoins" = GREATEST(1, ROUND("priceCoins" / 10.0)) WHERE "priceCoins" > 0;
UPDATE "ItemUpgrade"      SET "priceCoins" = GREATEST(1, ROUND("priceCoins" / 10.0)) WHERE "priceCoins" > 0;

-- Marketplace de creadores: publicaciones (y sus versiones, para que una
-- versión pendiente no reponga el precio viejo al aprobarse) y límites.
-- Las compras ya hechas (MarketplacePurchase) son historia: no se tocan.
UPDATE "MarketplaceContent"        SET "priceCoins" = GREATEST(1, ROUND("priceCoins" / 10.0)) WHERE "priceCoins" > 0;
UPDATE "MarketplaceContentVersion" SET "priceCoins" = GREATEST(1, ROUND("priceCoins" / 10.0)) WHERE "priceCoins" > 0;
UPDATE "MarketplaceSettings"
SET "publicationFeeCoins" = ROUND("publicationFeeCoins" / 10.0),
    "minPriceCoins"       = GREATEST(1, ROUND("minPriceCoins" / 10.0)),
    "maxPriceCoins"       = GREATEST(1, ROUND("maxPriceCoins" / 10.0));

-- Defaults nuevos (mismos que schema.prisma).
ALTER TABLE "Power" ALTER COLUMN "priceCoins" SET DEFAULT 10;
ALTER TABLE "MarketplaceSettings" ALTER COLUMN "publicationFeeCoins" SET DEFAULT 5;
ALTER TABLE "MarketplaceSettings" ALTER COLUMN "minPriceCoins" SET DEFAULT 10;
ALTER TABLE "MarketplaceSettings" ALTER COLUMN "maxPriceCoins" SET DEFAULT 1000;
