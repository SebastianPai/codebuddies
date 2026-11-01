-- Nombres, descripciones y precios de los ítems del mundo (2026-11-01).
-- Nombres con prefijo (Techo ·, Castillo ·, Terror ·, Bloque ·, Piso ·...) para que
-- se agrupen en la tienda y en el buscador, y descripciones que dicen para qué
-- sirve cada pieza (el techo del castillo explica su orden de armado).
-- Precios de bloques entre 1 y 5: lo simple 1, lo decorado 2, la gárgola 3 y lo
-- animado vale el doble (brasero 4, agua 2). Corre después del rebalanceo ÷10.
-- Las piezas de castillo se apilan más alto (maxStackHeight 20) para que entre
-- un techo grande sobre un torreón.
-- Cada ítem va por id: si un id no existe en la base, sus sentencias no hacen nada.
-- Generado por promo_codebuddies/castillo-techo/gen-migracion.js.

-- Techo · Esquina con gárgola
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Techo · Esquina con gárgola', 'La esquina de adelante del techo. Encima apila la Cumbrera y arriba la Aguja.' FROM "Item" i, "Language" l WHERE i."id" = '3b2c356f-9fbe-4370-a137-e5619dbdbcfc' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Roof · Gargoyle Corner', 'The front corner of the roof. Stack the Ridge on top and finish with the Spire.' FROM "Item" i, "Language" l WHERE i."id" = '3b2c356f-9fbe-4370-a137-e5619dbdbcfc' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Dach · Wasserspeier-Ecke', 'Die vordere Dachecke. Darauf den First stapeln und mit der Turmspitze abschließen.' FROM "Item" i, "Language" l WHERE i."id" = '3b2c356f-9fbe-4370-a137-e5619dbdbcfc' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 3 WHERE "id" = '3b2c356f-9fbe-4370-a137-e5619dbdbcfc' AND "coinsPrice" > 0;
UPDATE "WorldItemData" SET "maxStackHeight" = 20 WHERE "itemId" = '3b2c356f-9fbe-4370-a137-e5619dbdbcfc';

-- Techo · Cumbrera
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Techo · Cumbrera', 'La arista del techo: se apila sobre la Esquina con gárgola, tantas veces como alto sea el techo.' FROM "Item" i, "Language" l WHERE i."id" = '36fc11fa-c855-4c1a-994c-e000957f925d' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Roof · Ridge', 'The roof''s edge line: stack it on the Gargoyle Corner as many times as the roof is tall.' FROM "Item" i, "Language" l WHERE i."id" = '36fc11fa-c855-4c1a-994c-e000957f925d' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Dach · First', 'Die Dachkante: so oft auf die Wasserspeier-Ecke stapeln, wie hoch das Dach ist.' FROM "Item" i, "Language" l WHERE i."id" = '36fc11fa-c855-4c1a-994c-e000957f925d' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = '36fc11fa-c855-4c1a-994c-e000957f925d' AND "coinsPrice" > 0;
UPDATE "WorldItemData" SET "maxStackHeight" = 20 WHERE "itemId" = '36fc11fa-c855-4c1a-994c-e000957f925d';

-- Techo · Escalón en punta
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Techo · Escalón en punta', 'Borde inclinado del techo: alterna con el Escalón plano desde la esquina hasta la Aguja.' FROM "Item" i, "Language" l WHERE i."id" = '227deb1d-d7fb-4475-b612-b446867faed1' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Roof · Pointed Step', 'Sloped roof edge: alternate with the Flat Step from the corner up to the Spire.' FROM "Item" i, "Language" l WHERE i."id" = '227deb1d-d7fb-4475-b612-b446867faed1' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Dach · Spitzstufe', 'Schräge Dachkante: abwechselnd mit der Flachstufe bis zur Turmspitze.' FROM "Item" i, "Language" l WHERE i."id" = '227deb1d-d7fb-4475-b612-b446867faed1' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = '227deb1d-d7fb-4475-b612-b446867faed1' AND "coinsPrice" > 0;
UPDATE "WorldItemData" SET "maxStackHeight" = 20 WHERE "itemId" = '227deb1d-d7fb-4475-b612-b446867faed1';

-- Techo · Escalón plano
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Techo · Escalón plano', 'Borde inclinado del techo: alterna con el Escalón en punta hasta llegar a la Aguja.' FROM "Item" i, "Language" l WHERE i."id" = '2b610a00-d893-4941-afde-2692223e070e' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Roof · Flat Step', 'Sloped roof edge: alternate with the Pointed Step until you reach the Spire.' FROM "Item" i, "Language" l WHERE i."id" = '2b610a00-d893-4941-afde-2692223e070e' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Dach · Flachstufe', 'Schräge Dachkante: abwechselnd mit der Spitzstufe bis zur Turmspitze.' FROM "Item" i, "Language" l WHERE i."id" = '2b610a00-d893-4941-afde-2692223e070e' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = '2b610a00-d893-4941-afde-2692223e070e' AND "coinsPrice" > 0;
UPDATE "WorldItemData" SET "maxStackHeight" = 20 WHERE "itemId" = '2b610a00-d893-4941-afde-2692223e070e';

-- Techo · Remate de esquina
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Techo · Remate de esquina', 'Cierra las esquinas de los costados, donde empieza el triángulo del techo.' FROM "Item" i, "Language" l WHERE i."id" = '1569dca0-c8ba-481f-b9b3-dee0dbc651dd' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Roof · Corner Cap', 'Closes the side corners, where the roof triangle starts.' FROM "Item" i, "Language" l WHERE i."id" = '1569dca0-c8ba-481f-b9b3-dee0dbc651dd' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Dach · Eckabschluss', 'Schließt die seitlichen Ecken, wo das Dachdreieck beginnt.' FROM "Item" i, "Language" l WHERE i."id" = '1569dca0-c8ba-481f-b9b3-dee0dbc651dd' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = '1569dca0-c8ba-481f-b9b3-dee0dbc651dd' AND "coinsPrice" > 0;
UPDATE "WorldItemData" SET "maxStackHeight" = 20 WHERE "itemId" = '1569dca0-c8ba-481f-b9b3-dee0dbc651dd';

-- Techo · Alero
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Techo · Alero', 'Primera fila del techo a lo largo de la fachada.' FROM "Item" i, "Language" l WHERE i."id" = 'dc2bd3b3-e2f1-4946-afd0-56fae59cbdca' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Roof · Eave', 'First row of the roof along the facade.' FROM "Item" i, "Language" l WHERE i."id" = 'dc2bd3b3-e2f1-4946-afd0-56fae59cbdca' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Dach · Traufe', 'Erste Dachreihe entlang der Fassade.' FROM "Item" i, "Language" l WHERE i."id" = 'dc2bd3b3-e2f1-4946-afd0-56fae59cbdca' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = 'dc2bd3b3-e2f1-4946-afd0-56fae59cbdca' AND "coinsPrice" > 0;
UPDATE "WorldItemData" SET "maxStackHeight" = 20 WHERE "itemId" = 'dc2bd3b3-e2f1-4946-afd0-56fae59cbdca';

-- Techo · Relleno
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Techo · Relleno', 'Tapa los huecos de adentro del techo.' FROM "Item" i, "Language" l WHERE i."id" = '00b4adbf-ebbf-4f74-a87b-c08935c753a3' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Roof · Filler', 'Fills the gaps inside the roof.' FROM "Item" i, "Language" l WHERE i."id" = '00b4adbf-ebbf-4f74-a87b-c08935c753a3' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Dach · Füllstück', 'Füllt die Lücken im Dach.' FROM "Item" i, "Language" l WHERE i."id" = '00b4adbf-ebbf-4f74-a87b-c08935c753a3' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 1 WHERE "id" = '00b4adbf-ebbf-4f74-a87b-c08935c753a3' AND "coinsPrice" > 0;
UPDATE "WorldItemData" SET "maxStackHeight" = 20 WHERE "itemId" = '00b4adbf-ebbf-4f74-a87b-c08935c753a3';

-- Techo · Aguja
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Techo · Aguja', 'La punta del techo: va arriba de la Cumbrera o de una torre.' FROM "Item" i, "Language" l WHERE i."id" = 'b2e55071-b533-43c2-92f5-351691e4c39d' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Roof · Spire', 'The top of the roof: goes on the Ridge or on a tower.' FROM "Item" i, "Language" l WHERE i."id" = 'b2e55071-b533-43c2-92f5-351691e4c39d' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Dach · Turmspitze', 'Die Dachspitze: auf den First oder auf einen Turm.' FROM "Item" i, "Language" l WHERE i."id" = 'b2e55071-b533-43c2-92f5-351691e4c39d' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = 'b2e55071-b533-43c2-92f5-351691e4c39d' AND "coinsPrice" > 0;
UPDATE "WorldItemData" SET "maxStackHeight" = 20 WHERE "itemId" = 'b2e55071-b533-43c2-92f5-351691e4c39d';

-- Techo · Techo gótico completo
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Techo · Techo gótico completo', 'Un techo gótico entero en una sola pieza.' FROM "Item" i, "Language" l WHERE i."id" = '1a3538c1-43d3-43ee-9462-7419f9c15509' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Roof · Full Gothic Roof', 'A whole gothic roof in a single piece.' FROM "Item" i, "Language" l WHERE i."id" = '1a3538c1-43d3-43ee-9462-7419f9c15509' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Dach · Gotisches Komplettdach', 'Ein ganzes gotisches Dach in einem Stück.' FROM "Item" i, "Language" l WHERE i."id" = '1a3538c1-43d3-43ee-9462-7419f9c15509' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 5 WHERE "id" = '1a3538c1-43d3-43ee-9462-7419f9c15509' AND "coinsPrice" > 0;
UPDATE "Item" SET "rarity" = 3 WHERE "id" = '1a3538c1-43d3-43ee-9462-7419f9c15509';

-- Castillo · Bloque de piedra
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Castillo · Bloque de piedra', 'El bloque base de murallas y torres. Se apila.' FROM "Item" i, "Language" l WHERE i."id" = '45273844-f5f2-4f9e-9dc9-3cbd246fe1ed' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Castle · Stone Block', 'The basic block for walls and towers. Stackable.' FROM "Item" i, "Language" l WHERE i."id" = '45273844-f5f2-4f9e-9dc9-3cbd246fe1ed' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Burg · Steinblock', 'Der Grundblock für Mauern und Türme. Stapelbar.' FROM "Item" i, "Language" l WHERE i."id" = '45273844-f5f2-4f9e-9dc9-3cbd246fe1ed' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 1 WHERE "id" = '45273844-f5f2-4f9e-9dc9-3cbd246fe1ed' AND "coinsPrice" > 0;
UPDATE "WorldItemData" SET "maxStackHeight" = 20 WHERE "itemId" = '45273844-f5f2-4f9e-9dc9-3cbd246fe1ed';

-- Castillo · Almena
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Castillo · Almena', 'Remate de la muralla. Con R la giras: capitel arriba o base ancha abajo.' FROM "Item" i, "Language" l WHERE i."id" = '917cfe6d-c3c5-439c-afb3-633e35395629' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Castle · Battlement', 'Tops the wall. Press R to flip it: cap on top or wide base.' FROM "Item" i, "Language" l WHERE i."id" = '917cfe6d-c3c5-439c-afb3-633e35395629' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Burg · Zinne', 'Krönt die Mauer. Mit R drehen: Kapitell oben oder breiter Sockel.' FROM "Item" i, "Language" l WHERE i."id" = '917cfe6d-c3c5-439c-afb3-633e35395629' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = '917cfe6d-c3c5-439c-afb3-633e35395629' AND "coinsPrice" > 0;
UPDATE "WorldItemData" SET "maxStackHeight" = 20 WHERE "itemId" = '917cfe6d-c3c5-439c-afb3-633e35395629';

-- Castillo · Reja de hierro
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Castillo · Reja de hierro', 'Reja gótica para puertas y barandas.' FROM "Item" i, "Language" l WHERE i."id" = '3c487d92-8b51-494d-89a8-a94c51dc67c4' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Castle · Iron Gate', 'Gothic railing for gates and fences.' FROM "Item" i, "Language" l WHERE i."id" = '3c487d92-8b51-494d-89a8-a94c51dc67c4' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Burg · Eisengitter', 'Gotisches Gitter für Tore und Geländer.' FROM "Item" i, "Language" l WHERE i."id" = '3c487d92-8b51-494d-89a8-a94c51dc67c4' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = '3c487d92-8b51-494d-89a8-a94c51dc67c4' AND "coinsPrice" > 0;
UPDATE "WorldItemData" SET "maxStackHeight" = 20 WHERE "itemId" = '3c487d92-8b51-494d-89a8-a94c51dc67c4';

-- Castillo · Brasero
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Castillo · Brasero', 'Fuego animado. Ponlo arriba de muros y torres.' FROM "Item" i, "Language" l WHERE i."id" = '13aa46b2-a1b9-4cb3-8699-73a1242a579e' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Castle · Fire Brazier', 'Animated fire. Put it on walls and towers.' FROM "Item" i, "Language" l WHERE i."id" = '13aa46b2-a1b9-4cb3-8699-73a1242a579e' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Burg · Feuerschale', 'Animiertes Feuer. Auf Mauern und Türme stellen.' FROM "Item" i, "Language" l WHERE i."id" = '13aa46b2-a1b9-4cb3-8699-73a1242a579e' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 4 WHERE "id" = '13aa46b2-a1b9-4cb3-8699-73a1242a579e' AND "coinsPrice" > 0;
UPDATE "Item" SET "rarity" = 1 WHERE "id" = '13aa46b2-a1b9-4cb3-8699-73a1242a579e';

-- Castillo · Ventana de vidrio
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Castillo · Ventana de vidrio', 'Ventana para muros de bloques.' FROM "Item" i, "Language" l WHERE i."id" = 'a1e15f81-e1ef-4220-9357-ab264ae29fa5' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Castle · Glass Window', 'A window for block walls.' FROM "Item" i, "Language" l WHERE i."id" = 'a1e15f81-e1ef-4220-9357-ab264ae29fa5' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Burg · Glasfenster', 'Ein Fenster für Blockmauern.' FROM "Item" i, "Language" l WHERE i."id" = 'a1e15f81-e1ef-4220-9357-ab264ae29fa5' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = 'a1e15f81-e1ef-4220-9357-ab264ae29fa5' AND "coinsPrice" > 0;

-- Terror · Calabaza
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Terror · Calabaza', 'Calabaza de Halloween con cara.' FROM "Item" i, "Language" l WHERE i."id" = '549f17c3-2595-4989-bcd7-374b6eb5cba7' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Spooky · Pumpkin', 'A carved Halloween pumpkin.' FROM "Item" i, "Language" l WHERE i."id" = '549f17c3-2595-4989-bcd7-374b6eb5cba7' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Grusel · Kürbis', 'Ein Halloween-Kürbis mit Gesicht.' FROM "Item" i, "Language" l WHERE i."id" = '549f17c3-2595-4989-bcd7-374b6eb5cba7' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = '549f17c3-2595-4989-bcd7-374b6eb5cba7' AND "coinsPrice" > 0;

-- Terror · Lápida
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Terror · Lápida', 'Lápida R.I.P. para tu cementerio.' FROM "Item" i, "Language" l WHERE i."id" = '388a742f-ca04-440a-b590-a427c6f674c5' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Spooky · Tombstone', 'An R.I.P. tombstone for your graveyard.' FROM "Item" i, "Language" l WHERE i."id" = '388a742f-ca04-440a-b590-a427c6f674c5' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Grusel · Grabstein', 'Ein R.I.P.-Grabstein für deinen Friedhof.' FROM "Item" i, "Language" l WHERE i."id" = '388a742f-ca04-440a-b590-a427c6f674c5' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = '388a742f-ca04-440a-b590-a427c6f674c5' AND "coinsPrice" > 0;

-- Terror · Lápida rota
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Terror · Lápida rota', 'Lápida vieja y quebrada.' FROM "Item" i, "Language" l WHERE i."id" = 'd862e6f8-143c-4631-a430-9353205e17a6' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Spooky · Broken Tombstone', 'An old, cracked tombstone.' FROM "Item" i, "Language" l WHERE i."id" = 'd862e6f8-143c-4631-a430-9353205e17a6' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Grusel · Zerbrochener Grabstein', 'Ein alter, zerbrochener Grabstein.' FROM "Item" i, "Language" l WHERE i."id" = 'd862e6f8-143c-4631-a430-9353205e17a6' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = 'd862e6f8-143c-4631-a430-9353205e17a6' AND "coinsPrice" > 0;

-- Terror · Charco de sangre
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Terror · Charco de sangre', 'Mancha de sangre para el piso.' FROM "Item" i, "Language" l WHERE i."id" = '74e96522-b309-4030-8fec-24be25ad267c' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Spooky · Blood Puddle', 'A blood stain for the floor.' FROM "Item" i, "Language" l WHERE i."id" = '74e96522-b309-4030-8fec-24be25ad267c' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Grusel · Blutlache', 'Ein Blutfleck für den Boden.' FROM "Item" i, "Language" l WHERE i."id" = '74e96522-b309-4030-8fec-24be25ad267c' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 1 WHERE "id" = '74e96522-b309-4030-8fec-24be25ad267c' AND "coinsPrice" > 0;

-- Terror · Huesos
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Terror · Huesos', 'Restos de esqueleto.' FROM "Item" i, "Language" l WHERE i."id" = '5510cb82-84e4-489b-a709-e50bcdbbc9f8' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Spooky · Bones', 'Skeleton remains.' FROM "Item" i, "Language" l WHERE i."id" = '5510cb82-84e4-489b-a709-e50bcdbbc9f8' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Grusel · Knochen', 'Skelettreste.' FROM "Item" i, "Language" l WHERE i."id" = '5510cb82-84e4-489b-a709-e50bcdbbc9f8' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = '5510cb82-84e4-489b-a709-e50bcdbbc9f8' AND "coinsPrice" > 0;

-- Terror · Piedras con sangre
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Terror · Piedras con sangre', 'Rocas manchadas de sangre.' FROM "Item" i, "Language" l WHERE i."id" = 'df3f53d0-b343-4295-b53d-48468bdfe49c' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Spooky · Bloody Rocks', 'Blood-stained rocks.' FROM "Item" i, "Language" l WHERE i."id" = 'df3f53d0-b343-4295-b53d-48468bdfe49c' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Grusel · Blutige Steine', 'Blutbefleckte Steine.' FROM "Item" i, "Language" l WHERE i."id" = 'df3f53d0-b343-4295-b53d-48468bdfe49c' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = 'df3f53d0-b343-4295-b53d-48468bdfe49c' AND "coinsPrice" > 0;

-- Terror · Sacos viejos
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Terror · Sacos viejos', 'Sacos sucios y abandonados.' FROM "Item" i, "Language" l WHERE i."id" = '6e95fa4a-3432-4a6a-a81f-aa9f1bd2a684' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Spooky · Old Sacks', 'Dirty, abandoned sacks.' FROM "Item" i, "Language" l WHERE i."id" = '6e95fa4a-3432-4a6a-a81f-aa9f1bd2a684' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Grusel · Alte Säcke', 'Schmutzige, verlassene Säcke.' FROM "Item" i, "Language" l WHERE i."id" = '6e95fa4a-3432-4a6a-a81f-aa9f1bd2a684' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = '6e95fa4a-3432-4a6a-a81f-aa9f1bd2a684' AND "coinsPrice" > 0;

-- Terror · Barril
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Terror · Barril', 'Barril viejo con manchas.' FROM "Item" i, "Language" l WHERE i."id" = 'c745a8c0-5f3b-4379-8bd6-715bed64bb3f' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Spooky · Barrel', 'An old stained barrel.' FROM "Item" i, "Language" l WHERE i."id" = 'c745a8c0-5f3b-4379-8bd6-715bed64bb3f' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Grusel · Fass', 'Ein altes, fleckiges Fass.' FROM "Item" i, "Language" l WHERE i."id" = 'c745a8c0-5f3b-4379-8bd6-715bed64bb3f' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = 'c745a8c0-5f3b-4379-8bd6-715bed64bb3f' AND "coinsPrice" > 0;

-- Terror · Vasijas viejas
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Terror · Vasijas viejas', 'Vasijas de barro, una tirada.' FROM "Item" i, "Language" l WHERE i."id" = 'b3a8bb4d-d48f-49ca-ab86-95f925d76b1e' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Spooky · Old Pots', 'Clay pots, one knocked over.' FROM "Item" i, "Language" l WHERE i."id" = 'b3a8bb4d-d48f-49ca-ab86-95f925d76b1e' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Grusel · Alte Krüge', 'Tonkrüge, einer umgekippt.' FROM "Item" i, "Language" l WHERE i."id" = 'b3a8bb4d-d48f-49ca-ab86-95f925d76b1e' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = 'b3a8bb4d-d48f-49ca-ab86-95f925d76b1e' AND "coinsPrice" > 0;

-- Terror · Cajas con telarañas
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Terror · Cajas con telarañas', 'Cajas abandonadas llenas de telarañas.' FROM "Item" i, "Language" l WHERE i."id" = '3af10d6c-d12c-4613-ab42-d7eaac85b285' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Spooky · Cobweb Crates', 'Abandoned crates full of cobwebs.' FROM "Item" i, "Language" l WHERE i."id" = '3af10d6c-d12c-4613-ab42-d7eaac85b285' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Grusel · Kisten mit Spinnweben', 'Verlassene Kisten voller Spinnweben.' FROM "Item" i, "Language" l WHERE i."id" = '3af10d6c-d12c-4613-ab42-d7eaac85b285' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = '3af10d6c-d12c-4613-ab42-d7eaac85b285' AND "coinsPrice" > 0;

-- Bloque · Agua
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Bloque · Agua', 'Bloque de agua animado.' FROM "Item" i, "Language" l WHERE i."id" = '881ad8d3-8cdd-4449-869c-3f08f9176788' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Water', 'Animated water block.' FROM "Item" i, "Language" l WHERE i."id" = '881ad8d3-8cdd-4449-869c-3f08f9176788' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Wasser', 'Animierter Wasserblock.' FROM "Item" i, "Language" l WHERE i."id" = '881ad8d3-8cdd-4449-869c-3f08f9176788' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = '881ad8d3-8cdd-4449-869c-3f08f9176788' AND "coinsPrice" > 0;

-- Bloque · Cristal
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Bloque · Cristal', 'Bloque de cristal.' FROM "Item" i, "Language" l WHERE i."id" = '4780a2cc-574b-4c62-81d8-0986b27ebb33' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Crystal', 'Crystal block.' FROM "Item" i, "Language" l WHERE i."id" = '4780a2cc-574b-4c62-81d8-0986b27ebb33' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Kristall', 'Kristallblock.' FROM "Item" i, "Language" l WHERE i."id" = '4780a2cc-574b-4c62-81d8-0986b27ebb33' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 1 WHERE "id" = '4780a2cc-574b-4c62-81d8-0986b27ebb33' AND "coinsPrice" > 0;

-- Bloque · Piedra
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Bloque · Piedra', 'Bloque de piedra.' FROM "Item" i, "Language" l WHERE i."id" = 'ff651f19-a3ab-47b4-9252-9bd1b3551945' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Stone', 'Stone block.' FROM "Item" i, "Language" l WHERE i."id" = 'ff651f19-a3ab-47b4-9252-9bd1b3551945' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Stein', 'Steinblock.' FROM "Item" i, "Language" l WHERE i."id" = 'ff651f19-a3ab-47b4-9252-9bd1b3551945' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 1 WHERE "id" = 'ff651f19-a3ab-47b4-9252-9bd1b3551945' AND "coinsPrice" > 0;

-- Bloque · Hojas
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Bloque · Hojas', 'Bloque de hojas.' FROM "Item" i, "Language" l WHERE i."id" = 'c17b87b9-69cc-4da8-8896-2a6ca4be8ba1' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Leaves', 'Leaf block.' FROM "Item" i, "Language" l WHERE i."id" = 'c17b87b9-69cc-4da8-8896-2a6ca4be8ba1' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Laub', 'Laubblock.' FROM "Item" i, "Language" l WHERE i."id" = 'c17b87b9-69cc-4da8-8896-2a6ca4be8ba1' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 1 WHERE "id" = 'c17b87b9-69cc-4da8-8896-2a6ca4be8ba1' AND "coinsPrice" > 0;

-- Bloque · Elegante
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Bloque · Elegante', 'Bloque azul y dorado de 2 casillas.' FROM "Item" i, "Language" l WHERE i."id" = '0529c047-78dd-4712-9374-48b396250e86' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Elegant', 'Blue and gold 2-tile block.' FROM "Item" i, "Language" l WHERE i."id" = '0529c047-78dd-4712-9374-48b396250e86' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Elegant', 'Blau-goldener Block mit 2 Feldern.' FROM "Item" i, "Language" l WHERE i."id" = '0529c047-78dd-4712-9374-48b396250e86' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

-- Bloque · Arena
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Bloque · Arena', 'Bloque de arena.' FROM "Item" i, "Language" l WHERE i."id" = 'ed8decde-7f0f-4405-930b-9d722b47c637' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Sand', 'Sand block.' FROM "Item" i, "Language" l WHERE i."id" = 'ed8decde-7f0f-4405-930b-9d722b47c637' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Sand', 'Sandblock.' FROM "Item" i, "Language" l WHERE i."id" = 'ed8decde-7f0f-4405-930b-9d722b47c637' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 1 WHERE "id" = 'ed8decde-7f0f-4405-930b-9d722b47c637' AND "coinsPrice" > 0;

-- Bloque · Mármol
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Bloque · Mármol', 'Bloque de mármol.' FROM "Item" i, "Language" l WHERE i."id" = 'd4aac888-c437-45ba-8518-c200839eb0be' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Marble', 'Marble block.' FROM "Item" i, "Language" l WHERE i."id" = 'd4aac888-c437-45ba-8518-c200839eb0be' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Marmor', 'Marmorblock.' FROM "Item" i, "Language" l WHERE i."id" = 'd4aac888-c437-45ba-8518-c200839eb0be' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 1 WHERE "id" = 'd4aac888-c437-45ba-8518-c200839eb0be' AND "coinsPrice" > 0;

-- Bloque · Negro
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Bloque · Negro', 'Bloque negro.' FROM "Item" i, "Language" l WHERE i."id" = '7713bd81-b4cf-4107-8f58-f0bc45de3d65' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Black', 'Black block.' FROM "Item" i, "Language" l WHERE i."id" = '7713bd81-b4cf-4107-8f58-f0bc45de3d65' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Schwarz', 'Schwarzer Block.' FROM "Item" i, "Language" l WHERE i."id" = '7713bd81-b4cf-4107-8f58-f0bc45de3d65' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 1 WHERE "id" = '7713bd81-b4cf-4107-8f58-f0bc45de3d65' AND "coinsPrice" > 0;

-- Bloque · Ladrillo
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Bloque · Ladrillo', 'Bloque de ladrillo.' FROM "Item" i, "Language" l WHERE i."id" = '53c5efd6-3b65-4273-9dbf-42ae65b10b53' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Brick', 'Brick block.' FROM "Item" i, "Language" l WHERE i."id" = '53c5efd6-3b65-4273-9dbf-42ae65b10b53' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Ziegel', 'Ziegelblock.' FROM "Item" i, "Language" l WHERE i."id" = '53c5efd6-3b65-4273-9dbf-42ae65b10b53' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 1 WHERE "id" = '53c5efd6-3b65-4273-9dbf-42ae65b10b53' AND "coinsPrice" > 0;

-- Bloque · Blanco (pintable)
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Bloque · Blanco (pintable)', 'Bloque blanco: cámbiale el color.' FROM "Item" i, "Language" l WHERE i."id" = 'a6f66a66-bcc1-4d92-bb3b-f7e2cc58bad3' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · White (paintable)', 'White block: change its color.' FROM "Item" i, "Language" l WHERE i."id" = 'a6f66a66-bcc1-4d92-bb3b-f7e2cc58bad3' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Weiß (färbbar)', 'Weißer Block: Farbe ändern.' FROM "Item" i, "Language" l WHERE i."id" = 'a6f66a66-bcc1-4d92-bb3b-f7e2cc58bad3' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 1 WHERE "id" = 'a6f66a66-bcc1-4d92-bb3b-f7e2cc58bad3' AND "coinsPrice" > 0;

-- Bloque · Medio bloque (pintable)
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Bloque · Medio bloque (pintable)', 'Bloque de media altura: cámbiale el color.' FROM "Item" i, "Language" l WHERE i."id" = 'dbcd1b29-a8a8-4024-a76c-b3fdf4155daa' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Half Block (paintable)', 'Half-height block: change its color.' FROM "Item" i, "Language" l WHERE i."id" = 'dbcd1b29-a8a8-4024-a76c-b3fdf4155daa' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Halber Block (färbbar)', 'Halbhoher Block: Farbe ändern.' FROM "Item" i, "Language" l WHERE i."id" = 'dbcd1b29-a8a8-4024-a76c-b3fdf4155daa' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 1 WHERE "id" = 'dbcd1b29-a8a8-4024-a76c-b3fdf4155daa' AND "coinsPrice" > 0;

-- Bloque · Marco (pintable)
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Bloque · Marco (pintable)', 'Bloque con hueco: cámbiale el color.' FROM "Item" i, "Language" l WHERE i."id" = '7c946f70-b97f-4846-9e9d-e2cc011a0444' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Frame (paintable)', 'Block with a hollow: change its color.' FROM "Item" i, "Language" l WHERE i."id" = '7c946f70-b97f-4846-9e9d-e2cc011a0444' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Rahmen (färbbar)', 'Block mit Aussparung: Farbe ändern.' FROM "Item" i, "Language" l WHERE i."id" = '7c946f70-b97f-4846-9e9d-e2cc011a0444' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 1 WHERE "id" = '7c946f70-b97f-4846-9e9d-e2cc011a0444' AND "coinsPrice" > 0;

-- Bloque · Escalera (pintable)
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Bloque · Escalera (pintable)', 'Escalera blanca: cámbiale el color.' FROM "Item" i, "Language" l WHERE i."id" = '3e8c3272-e0d7-4871-801b-118bf271ae05' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Stairs (paintable)', 'White stairs: change their color.' FROM "Item" i, "Language" l WHERE i."id" = '3e8c3272-e0d7-4871-801b-118bf271ae05' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Block · Treppe (färbbar)', 'Weiße Treppe: Farbe ändern.' FROM "Item" i, "Language" l WHERE i."id" = '3e8c3272-e0d7-4871-801b-118bf271ae05' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 1 WHERE "id" = '3e8c3272-e0d7-4871-801b-118bf271ae05' AND "coinsPrice" > 0;

-- Plantas · Mata 1
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Plantas · Mata 1', 'Una mata pequeña.' FROM "Item" i, "Language" l WHERE i."id" = '05bbca5c-423d-4b64-a4e6-c462404f7947' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Plants · Bush 1', 'A small bush.' FROM "Item" i, "Language" l WHERE i."id" = '05bbca5c-423d-4b64-a4e6-c462404f7947' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Pflanzen · Busch 1', 'Ein kleiner Busch.' FROM "Item" i, "Language" l WHERE i."id" = '05bbca5c-423d-4b64-a4e6-c462404f7947' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 1 WHERE "id" = '05bbca5c-423d-4b64-a4e6-c462404f7947' AND "coinsPrice" > 0;

-- Plantas · Mata 2
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Plantas · Mata 2', 'Una mata pequeña.' FROM "Item" i, "Language" l WHERE i."id" = '6b4e44b4-104f-44f4-aa9b-9cbd7d2e4264' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Plants · Bush 2', 'A small bush.' FROM "Item" i, "Language" l WHERE i."id" = '6b4e44b4-104f-44f4-aa9b-9cbd7d2e4264' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Pflanzen · Busch 2', 'Ein kleiner Busch.' FROM "Item" i, "Language" l WHERE i."id" = '6b4e44b4-104f-44f4-aa9b-9cbd7d2e4264' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 1 WHERE "id" = '6b4e44b4-104f-44f4-aa9b-9cbd7d2e4264' AND "coinsPrice" > 0;

-- Plantas · Mata 3
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Plantas · Mata 3', 'Una mata pequeña.' FROM "Item" i, "Language" l WHERE i."id" = '2d81e449-fda6-489c-8439-8e5d6d974e3c' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Plants · Bush 3', 'A small bush.' FROM "Item" i, "Language" l WHERE i."id" = '2d81e449-fda6-489c-8439-8e5d6d974e3c' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Pflanzen · Busch 3', 'Ein kleiner Busch.' FROM "Item" i, "Language" l WHERE i."id" = '2d81e449-fda6-489c-8439-8e5d6d974e3c' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 1 WHERE "id" = '2d81e449-fda6-489c-8439-8e5d6d974e3c' AND "coinsPrice" > 0;

-- Plantas · Mata 4
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Plantas · Mata 4', 'Una mata pequeña.' FROM "Item" i, "Language" l WHERE i."id" = '2d0e491b-686d-4784-bdce-64bed95252f1' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Plants · Bush 4', 'A small bush.' FROM "Item" i, "Language" l WHERE i."id" = '2d0e491b-686d-4784-bdce-64bed95252f1' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Pflanzen · Busch 4', 'Ein kleiner Busch.' FROM "Item" i, "Language" l WHERE i."id" = '2d0e491b-686d-4784-bdce-64bed95252f1' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 1 WHERE "id" = '2d0e491b-686d-4784-bdce-64bed95252f1' AND "coinsPrice" > 0;

-- Piso · Piedra
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Piso · Piedra', 'Textura de piso: elígela y arrastra sobre el suelo.' FROM "Item" i, "Language" l WHERE i."id" = 'e65bfa5d-679a-4630-a822-21165b5858c8' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Floor · Stone', 'Floor texture: pick it and drag over the ground.' FROM "Item" i, "Language" l WHERE i."id" = 'e65bfa5d-679a-4630-a822-21165b5858c8' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Boden · Stein', 'Bodentextur: auswählen und über den Boden ziehen.' FROM "Item" i, "Language" l WHERE i."id" = 'e65bfa5d-679a-4630-a822-21165b5858c8' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

-- Piso · Madera
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Piso · Madera', 'Textura de piso: elígela y arrastra sobre el suelo.' FROM "Item" i, "Language" l WHERE i."id" = '77c2f54a-64b0-4afb-92e8-91f3c48d0c48' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Floor · Wood', 'Floor texture: pick it and drag over the ground.' FROM "Item" i, "Language" l WHERE i."id" = '77c2f54a-64b0-4afb-92e8-91f3c48d0c48' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Boden · Holz', 'Bodentextur: auswählen und über den Boden ziehen.' FROM "Item" i, "Language" l WHERE i."id" = '77c2f54a-64b0-4afb-92e8-91f3c48d0c48' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

-- Piso · Pasto
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Piso · Pasto', 'Textura de piso: elígela y arrastra sobre el suelo.' FROM "Item" i, "Language" l WHERE i."id" = '9a2794b2-dc59-4684-8736-3f7019040141' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Floor · Grass', 'Floor texture: pick it and drag over the ground.' FROM "Item" i, "Language" l WHERE i."id" = '9a2794b2-dc59-4684-8736-3f7019040141' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Boden · Gras', 'Bodentextur: auswählen und über den Boden ziehen.' FROM "Item" i, "Language" l WHERE i."id" = '9a2794b2-dc59-4684-8736-3f7019040141' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

-- Piso · Madera gris
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Piso · Madera gris', 'Textura de piso: elígela y arrastra sobre el suelo.' FROM "Item" i, "Language" l WHERE i."id" = 'c9dcf77e-35a3-4908-ad74-51175eb686b1' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Floor · Gray Wood', 'Floor texture: pick it and drag over the ground.' FROM "Item" i, "Language" l WHERE i."id" = 'c9dcf77e-35a3-4908-ad74-51175eb686b1' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Boden · Graues Holz', 'Bodentextur: auswählen und über den Boden ziehen.' FROM "Item" i, "Language" l WHERE i."id" = 'c9dcf77e-35a3-4908-ad74-51175eb686b1' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

-- Piso · Liso
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Piso · Liso', 'Textura de piso: elígela y arrastra sobre el suelo.' FROM "Item" i, "Language" l WHERE i."id" = '40b74f98-7ecc-493a-aca5-e32ee3db2755' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Floor · Plain', 'Floor texture: pick it and drag over the ground.' FROM "Item" i, "Language" l WHERE i."id" = '40b74f98-7ecc-493a-aca5-e32ee3db2755' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Boden · Glatt', 'Bodentextur: auswählen und über den Boden ziehen.' FROM "Item" i, "Language" l WHERE i."id" = '40b74f98-7ecc-493a-aca5-e32ee3db2755' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

-- Deco · Lámpara antigua
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deco · Lámpara antigua', 'Farol de hierro con fuego.' FROM "Item" i, "Language" l WHERE i."id" = 'ab30b6ec-4983-4ff7-aeb7-1bbb00415e72' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deco · Old Lantern', 'Iron lantern with fire.' FROM "Item" i, "Language" l WHERE i."id" = 'ab30b6ec-4983-4ff7-aeb7-1bbb00415e72' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deko · Alte Laterne', 'Eiserne Laterne mit Feuer.' FROM "Item" i, "Language" l WHERE i."id" = 'ab30b6ec-4983-4ff7-aeb7-1bbb00415e72' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = 'ab30b6ec-4983-4ff7-aeb7-1bbb00415e72' AND "coinsPrice" > 0;

-- Deco · Libros apilados
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deco · Libros apilados', 'Una pila de libros.' FROM "Item" i, "Language" l WHERE i."id" = '79b3e45b-fe4d-41b0-9f2c-b81482712234' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deco · Stacked Books', 'A pile of books.' FROM "Item" i, "Language" l WHERE i."id" = '79b3e45b-fe4d-41b0-9f2c-b81482712234' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deko · Bücherstapel', 'Ein Stapel Bücher.' FROM "Item" i, "Language" l WHERE i."id" = '79b3e45b-fe4d-41b0-9f2c-b81482712234' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = '79b3e45b-fe4d-41b0-9f2c-b81482712234' AND "coinsPrice" > 0;

-- Deco · Radio
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deco · Radio', 'Radio vieja.' FROM "Item" i, "Language" l WHERE i."id" = 'ca8c0171-22da-40be-9989-281cc10863c7' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deco · Radio', 'An old radio.' FROM "Item" i, "Language" l WHERE i."id" = 'ca8c0171-22da-40be-9989-281cc10863c7' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deko · Radio', 'Ein altes Radio.' FROM "Item" i, "Language" l WHERE i."id" = 'ca8c0171-22da-40be-9989-281cc10863c7' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = 'ca8c0171-22da-40be-9989-281cc10863c7' AND "coinsPrice" > 0;

-- Deco · Caja de pizza
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deco · Caja de pizza', 'Para la oficina después del deploy.' FROM "Item" i, "Language" l WHERE i."id" = 'efa91d52-275b-4949-bf92-6b4f3880f3f5' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deco · Pizza Box', 'For the office after a deploy.' FROM "Item" i, "Language" l WHERE i."id" = 'efa91d52-275b-4949-bf92-6b4f3880f3f5' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deko · Pizzakarton', 'Fürs Büro nach dem Deploy.' FROM "Item" i, "Language" l WHERE i."id" = 'efa91d52-275b-4949-bf92-6b4f3880f3f5' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
UPDATE "Item" SET "coinsPrice" = 2 WHERE "id" = 'efa91d52-275b-4949-bf92-6b4f3880f3f5' AND "coinsPrice" > 0;

-- Deco · Estatua de Zeus grande
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deco · Estatua de Zeus grande', 'Estatua enorme del dios del rayo.' FROM "Item" i, "Language" l WHERE i."id" = '87c16b03-edd9-4457-9d90-75a7ece5f147' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deco · Large Zeus Statue', 'A huge statue of the god of thunder.' FROM "Item" i, "Language" l WHERE i."id" = '87c16b03-edd9-4457-9d90-75a7ece5f147' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deko · Große Zeus-Statue', 'Eine riesige Statue des Donnergottes.' FROM "Item" i, "Language" l WHERE i."id" = '87c16b03-edd9-4457-9d90-75a7ece5f147' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

-- Deco · Estatua de Zeus
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deco · Estatua de Zeus', 'Estatua del dios del rayo.' FROM "Item" i, "Language" l WHERE i."id" = 'f130c3df-0d6f-4006-901b-07e0de6ee7aa' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deco · Zeus Statue', 'A statue of the god of thunder.' FROM "Item" i, "Language" l WHERE i."id" = 'f130c3df-0d6f-4006-901b-07e0de6ee7aa' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deko · Zeus-Statue', 'Eine Statue des Donnergottes.' FROM "Item" i, "Language" l WHERE i."id" = 'f130c3df-0d6f-4006-901b-07e0de6ee7aa' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

-- Deco · Fuente de agua
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deco · Fuente de agua', 'Fuente con agua animada.' FROM "Item" i, "Language" l WHERE i."id" = '79ea3fb6-516a-4200-88ff-12937b55f928' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deco · Water Fountain', 'Fountain with animated water.' FROM "Item" i, "Language" l WHERE i."id" = '79ea3fb6-516a-4200-88ff-12937b55f928' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Deko · Wasserbrunnen', 'Brunnen mit animiertem Wasser.' FROM "Item" i, "Language" l WHERE i."id" = '79ea3fb6-516a-4200-88ff-12937b55f928' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

-- Vehículos · Moto de motocross
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Vehículos · Moto de motocross', 'Moto de motocross para tu garaje.' FROM "Item" i, "Language" l WHERE i."id" = '03101445-a5b6-48c8-b633-35ea6e7c77f7' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Vehicles · Motocross Bike', 'A motocross bike for your garage.' FROM "Item" i, "Language" l WHERE i."id" = '03101445-a5b6-48c8-b633-35ea6e7c77f7' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Fahrzeuge · Motocross-Motorrad', 'Ein Motocross-Motorrad für deine Garage.' FROM "Item" i, "Language" l WHERE i."id" = '03101445-a5b6-48c8-b633-35ea6e7c77f7' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

-- Muebles · Armario
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Muebles · Armario', 'Armario grande.' FROM "Item" i, "Language" l WHERE i."id" = '4ea70e18-39b5-4fb3-97bc-ae2b26df657c' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Furniture · Wardrobe', 'A large wardrobe.' FROM "Item" i, "Language" l WHERE i."id" = '4ea70e18-39b5-4fb3-97bc-ae2b26df657c' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Möbel · Kleiderschrank', 'Ein großer Kleiderschrank.' FROM "Item" i, "Language" l WHERE i."id" = '4ea70e18-39b5-4fb3-97bc-ae2b26df657c' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

-- Muebles · Armario de pared largo
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Muebles · Armario de pared largo', 'Armario bajo para una pared entera.' FROM "Item" i, "Language" l WHERE i."id" = '67030685-ac08-43f0-afae-3c607b97161e' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Furniture · Long Wall Cabinet', 'A low cabinet for a whole wall.' FROM "Item" i, "Language" l WHERE i."id" = '67030685-ac08-43f0-afae-3c607b97161e' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Möbel · Langer Wandschrank', 'Ein niedriger Schrank für eine ganze Wand.' FROM "Item" i, "Language" l WHERE i."id" = '67030685-ac08-43f0-afae-3c607b97161e' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

-- Muebles · Chimenea
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Muebles · Chimenea', 'Chimenea para tu sala.' FROM "Item" i, "Language" l WHERE i."id" = '3bdc6c43-e86f-419d-b040-7b0cebe96d18' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Furniture · Fireplace', 'A fireplace for your room.' FROM "Item" i, "Language" l WHERE i."id" = '3bdc6c43-e86f-419d-b040-7b0cebe96d18' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Möbel · Kamin', 'Ein Kamin für dein Zimmer.' FROM "Item" i, "Language" l WHERE i."id" = '3bdc6c43-e86f-419d-b040-7b0cebe96d18' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

-- Muebles · Sofá negro
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Muebles · Sofá negro', 'Sofá de tres cuerpos.' FROM "Item" i, "Language" l WHERE i."id" = '0f7b1469-97ab-46f5-9788-46d8b23b10e1' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Furniture · Black Sofa', 'A three-seat sofa.' FROM "Item" i, "Language" l WHERE i."id" = '0f7b1469-97ab-46f5-9788-46d8b23b10e1' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Möbel · Schwarzes Sofa', 'Ein Dreisitzer-Sofa.' FROM "Item" i, "Language" l WHERE i."id" = '0f7b1469-97ab-46f5-9788-46d8b23b10e1' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

-- Muebles · Silla elegante blanca
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Muebles · Silla elegante blanca', 'Silla blanca de diseño.' FROM "Item" i, "Language" l WHERE i."id" = '238c169d-bd9d-4453-9312-69c108fa8e99' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Furniture · Elegant White Chair', 'A white designer chair.' FROM "Item" i, "Language" l WHERE i."id" = '238c169d-bd9d-4453-9312-69c108fa8e99' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Möbel · Eleganter weißer Stuhl', 'Ein weißer Designerstuhl.' FROM "Item" i, "Language" l WHERE i."id" = '238c169d-bd9d-4453-9312-69c108fa8e99' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

-- Muebles · Mesa de madera
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Muebles · Mesa de madera', 'Mesa larga de madera.' FROM "Item" i, "Language" l WHERE i."id" = '42276e74-b937-4ce1-8b2b-aeda36d0163a' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Furniture · Wooden Table', 'A long wooden table.' FROM "Item" i, "Language" l WHERE i."id" = '42276e74-b937-4ce1-8b2b-aeda36d0163a' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Möbel · Holztisch', 'Ein langer Holztisch.' FROM "Item" i, "Language" l WHERE i."id" = '42276e74-b937-4ce1-8b2b-aeda36d0163a' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

-- Muebles · Horno gris plata
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Muebles · Horno gris plata', 'Horno de cocina.' FROM "Item" i, "Language" l WHERE i."id" = 'ab87943c-d97a-496d-b99f-ef885ba137fe' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Furniture · Silver Oven', 'A kitchen oven.' FROM "Item" i, "Language" l WHERE i."id" = 'ab87943c-d97a-496d-b99f-ef885ba137fe' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Möbel · Silberner Ofen', 'Ein Küchenofen.' FROM "Item" i, "Language" l WHERE i."id" = 'ab87943c-d97a-496d-b99f-ef885ba137fe' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

-- Muebles · Máquina expendedora
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Muebles · Máquina expendedora', 'Snacks para la oficina.' FROM "Item" i, "Language" l WHERE i."id" = '0e912493-eb53-47ef-93db-885d3aa4642b' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Furniture · Vending Machine', 'Snacks for the office.' FROM "Item" i, "Language" l WHERE i."id" = '0e912493-eb53-47ef-93db-885d3aa4642b' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Möbel · Verkaufsautomat', 'Snacks fürs Büro.' FROM "Item" i, "Language" l WHERE i."id" = '0e912493-eb53-47ef-93db-885d3aa4642b' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

-- Muebles · PC gamer
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Muebles · PC gamer', 'Escritorio con PC gamer.' FROM "Item" i, "Language" l WHERE i."id" = '96b772b8-6b65-4c08-b339-2bef0a7f8c57' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Furniture · Gaming PC', 'A desk with a gaming PC.' FROM "Item" i, "Language" l WHERE i."id" = '96b772b8-6b65-4c08-b339-2bef0a7f8c57' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Möbel · Gaming-PC', 'Ein Schreibtisch mit Gaming-PC.' FROM "Item" i, "Language" l WHERE i."id" = '96b772b8-6b65-4c08-b339-2bef0a7f8c57' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

-- Muebles · Escritorio minimalista
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Muebles · Escritorio minimalista', 'Escritorio con equipo minimalista.' FROM "Item" i, "Language" l WHERE i."id" = '806d4737-56d2-49da-b71f-31d640e23fd5' AND l."code" = 'es'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Furniture · Minimal Desk', 'A desk with a minimal setup.' FROM "Item" i, "Language" l WHERE i."id" = '806d4737-56d2-49da-b71f-31d640e23fd5' AND l."code" = 'en'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
INSERT INTO "ItemTranslation" ("id", "itemId", "languageId", "name", "description")
SELECT gen_random_uuid()::text, i."id", l."id", 'Möbel · Minimalistischer Schreibtisch', 'Ein Schreibtisch mit minimalem Setup.' FROM "Item" i, "Language" l WHERE i."id" = '806d4737-56d2-49da-b71f-31d640e23fd5' AND l."code" = 'de'
ON CONFLICT ("itemId", "languageId") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
