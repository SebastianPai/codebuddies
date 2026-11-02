-- Punto de aparición: objeto plano 64x32 donde aparecen los jugadores al
-- entrar a una sala. Cada sala tiene uno (lo crea la API al entrar); se
-- mueve pero no se quita. Este es el diseño predeterminado (tag
-- spawn:default); desde el admin se pueden subir otros de categoría
-- "spawn" y marcar cuál es el predeterminado.
INSERT INTO "Item" ("id", "imageUrl", "rarity", "coinsPrice", "isTradable", "isSellable", "shopVisible", "category", "type", "maxStack", "tags")
VALUES ('spawn-point-default', 'https://game.codebuddies.tech/assets/items/spawn-point.png', 0, 0, false, false, false, 'spawn', 'WORLD', 1, ARRAY['spawn', 'spawn:default'])
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "WorldItemData" ("id", "itemId", "width", "height", "frameWidth", "frameHeight", "directions", "kind", "isCollidable", "walkable", "rotatable", "placementType", "allowsStacking", "canBeStacked", "footprintWidth", "footprintHeight", "interactionTypes")
VALUES (gen_random_uuid()::text, 'spawn-point-default', 64, 32, 64, 32, 1, 'DECORATION', false, true, false, 'FLOOR', false, false, 1, 1, ARRAY[]::"InteractionType"[])
ON CONFLICT ("itemId") DO NOTHING;

INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, 'spawn-point-default', l."id", t.name, t.description
FROM "Language" l
JOIN (VALUES
  ('es', 'Punto de aparición', 'Aquí aparecen los jugadores al entrar a tu sala. Puedes moverlo, pero no quitarlo.'),
  ('en', 'Spawn point', 'Players appear here when they enter your room. You can move it, but not remove it.'),
  ('de', 'Startpunkt', 'Hier erscheinen Spieler, wenn sie deinen Raum betreten. Du kannst ihn verschieben, aber nicht entfernen.')
) AS t(code, name, description) ON t.code = l."code"
ON CONFLICT ("itemId", "languageId") DO NOTHING;
