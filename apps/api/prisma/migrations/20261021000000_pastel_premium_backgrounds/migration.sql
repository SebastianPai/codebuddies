-- Fondos de sala de color sólido en tonos pastel, solo Premium.
-- El juego los pinta como color de la cámara (metadata.color), sin cargar
-- ninguna imagen: imageUrl es un SVG data: de 64px que solo sirve de
-- miniatura en el selector. Idempotente: ids fijos + ON CONFLICT DO NOTHING.

INSERT INTO "RoomBackground" ("id","name","imageUrl","previewUrl","active","sortOrder","accessType","isPremium","shopVisible","metadata","createdAt","updatedAt")
VALUES ('3cdfad34-5b55-5aef-b2d6-eba59ae1a586','Rosa pastel','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23FFD1DC%27%2F%3E%3C%2Fsvg%3E','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23FFD1DC%27%2F%3E%3C%2Fsvg%3E',true,900,'PREMIUM',true,true,'{"color":"#FFD1DC","kind":"SOLID_COLOR"}'::jsonb,NOW(),NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "RoomBackgroundTranslation" ("id","backgroundId","languageId","name")
SELECT md5('3cdfad34-5b55-5aef-b2d6-eba59ae1a586' || l."code")::uuid::text, '3cdfad34-5b55-5aef-b2d6-eba59ae1a586', l."id", t.name
FROM (VALUES ('es','Rosa pastel'),('en','Pastel pink'),('en-us','Pastel pink'),('de','Pastellrosa')) AS t(code, name)
JOIN "Language" l ON l."code" = t.code
ON CONFLICT ("backgroundId","languageId") DO NOTHING;

INSERT INTO "RoomBackground" ("id","name","imageUrl","previewUrl","active","sortOrder","accessType","isPremium","shopVisible","metadata","createdAt","updatedAt")
VALUES ('a6af1553-bc29-5fb3-b7c6-edab593b61ff','Durazno pastel','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23FFDAB9%27%2F%3E%3C%2Fsvg%3E','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23FFDAB9%27%2F%3E%3C%2Fsvg%3E',true,901,'PREMIUM',true,true,'{"color":"#FFDAB9","kind":"SOLID_COLOR"}'::jsonb,NOW(),NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "RoomBackgroundTranslation" ("id","backgroundId","languageId","name")
SELECT md5('a6af1553-bc29-5fb3-b7c6-edab593b61ff' || l."code")::uuid::text, 'a6af1553-bc29-5fb3-b7c6-edab593b61ff', l."id", t.name
FROM (VALUES ('es','Durazno pastel'),('en','Pastel peach'),('en-us','Pastel peach'),('de','Pastellpfirsich')) AS t(code, name)
JOIN "Language" l ON l."code" = t.code
ON CONFLICT ("backgroundId","languageId") DO NOTHING;

INSERT INTO "RoomBackground" ("id","name","imageUrl","previewUrl","active","sortOrder","accessType","isPremium","shopVisible","metadata","createdAt","updatedAt")
VALUES ('12f5eb47-16c4-5a87-af0b-900ef77fac57','Coral pastel','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23F8B4A6%27%2F%3E%3C%2Fsvg%3E','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23F8B4A6%27%2F%3E%3C%2Fsvg%3E',true,902,'PREMIUM',true,true,'{"color":"#F8B4A6","kind":"SOLID_COLOR"}'::jsonb,NOW(),NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "RoomBackgroundTranslation" ("id","backgroundId","languageId","name")
SELECT md5('12f5eb47-16c4-5a87-af0b-900ef77fac57' || l."code")::uuid::text, '12f5eb47-16c4-5a87-af0b-900ef77fac57', l."id", t.name
FROM (VALUES ('es','Coral pastel'),('en','Pastel coral'),('en-us','Pastel coral'),('de','Pastellkoralle')) AS t(code, name)
JOIN "Language" l ON l."code" = t.code
ON CONFLICT ("backgroundId","languageId") DO NOTHING;

INSERT INTO "RoomBackground" ("id","name","imageUrl","previewUrl","active","sortOrder","accessType","isPremium","shopVisible","metadata","createdAt","updatedAt")
VALUES ('634d0826-2900-501e-ad7b-2221a2e5daf4','Amarillo pastel','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23FFF5BA%27%2F%3E%3C%2Fsvg%3E','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23FFF5BA%27%2F%3E%3C%2Fsvg%3E',true,903,'PREMIUM',true,true,'{"color":"#FFF5BA","kind":"SOLID_COLOR"}'::jsonb,NOW(),NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "RoomBackgroundTranslation" ("id","backgroundId","languageId","name")
SELECT md5('634d0826-2900-501e-ad7b-2221a2e5daf4' || l."code")::uuid::text, '634d0826-2900-501e-ad7b-2221a2e5daf4', l."id", t.name
FROM (VALUES ('es','Amarillo pastel'),('en','Pastel yellow'),('en-us','Pastel yellow'),('de','Pastellgelb')) AS t(code, name)
JOIN "Language" l ON l."code" = t.code
ON CONFLICT ("backgroundId","languageId") DO NOTHING;

INSERT INTO "RoomBackground" ("id","name","imageUrl","previewUrl","active","sortOrder","accessType","isPremium","shopVisible","metadata","createdAt","updatedAt")
VALUES ('8bdcff23-42a0-58a8-9cfe-2bd0ff3569b6','Menta pastel','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23C1F0DC%27%2F%3E%3C%2Fsvg%3E','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23C1F0DC%27%2F%3E%3C%2Fsvg%3E',true,904,'PREMIUM',true,true,'{"color":"#C1F0DC","kind":"SOLID_COLOR"}'::jsonb,NOW(),NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "RoomBackgroundTranslation" ("id","backgroundId","languageId","name")
SELECT md5('8bdcff23-42a0-58a8-9cfe-2bd0ff3569b6' || l."code")::uuid::text, '8bdcff23-42a0-58a8-9cfe-2bd0ff3569b6', l."id", t.name
FROM (VALUES ('es','Menta pastel'),('en','Pastel mint'),('en-us','Pastel mint'),('de','Pastellminze')) AS t(code, name)
JOIN "Language" l ON l."code" = t.code
ON CONFLICT ("backgroundId","languageId") DO NOTHING;

INSERT INTO "RoomBackground" ("id","name","imageUrl","previewUrl","active","sortOrder","accessType","isPremium","shopVisible","metadata","createdAt","updatedAt")
VALUES ('e54d3284-774b-55d1-8659-7b94dd944715','Verde pastel','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23CDEAC0%27%2F%3E%3C%2Fsvg%3E','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23CDEAC0%27%2F%3E%3C%2Fsvg%3E',true,905,'PREMIUM',true,true,'{"color":"#CDEAC0","kind":"SOLID_COLOR"}'::jsonb,NOW(),NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "RoomBackgroundTranslation" ("id","backgroundId","languageId","name")
SELECT md5('e54d3284-774b-55d1-8659-7b94dd944715' || l."code")::uuid::text, 'e54d3284-774b-55d1-8659-7b94dd944715', l."id", t.name
FROM (VALUES ('es','Verde pastel'),('en','Pastel green'),('en-us','Pastel green'),('de','Pastellgrün')) AS t(code, name)
JOIN "Language" l ON l."code" = t.code
ON CONFLICT ("backgroundId","languageId") DO NOTHING;

INSERT INTO "RoomBackground" ("id","name","imageUrl","previewUrl","active","sortOrder","accessType","isPremium","shopVisible","metadata","createdAt","updatedAt")
VALUES ('521b5a2c-f4fa-5f1b-9af3-39576b59b364','Celeste pastel','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23BDE0FE%27%2F%3E%3C%2Fsvg%3E','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23BDE0FE%27%2F%3E%3C%2Fsvg%3E',true,906,'PREMIUM',true,true,'{"color":"#BDE0FE","kind":"SOLID_COLOR"}'::jsonb,NOW(),NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "RoomBackgroundTranslation" ("id","backgroundId","languageId","name")
SELECT md5('521b5a2c-f4fa-5f1b-9af3-39576b59b364' || l."code")::uuid::text, '521b5a2c-f4fa-5f1b-9af3-39576b59b364', l."id", t.name
FROM (VALUES ('es','Celeste pastel'),('en','Pastel sky'),('en-us','Pastel sky'),('de','Pastellhimmelblau')) AS t(code, name)
JOIN "Language" l ON l."code" = t.code
ON CONFLICT ("backgroundId","languageId") DO NOTHING;

INSERT INTO "RoomBackground" ("id","name","imageUrl","previewUrl","active","sortOrder","accessType","isPremium","shopVisible","metadata","createdAt","updatedAt")
VALUES ('2aa54a39-00ce-500a-b85a-34e6d25a4ac5','Azul pastel','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23A2C8EC%27%2F%3E%3C%2Fsvg%3E','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23A2C8EC%27%2F%3E%3C%2Fsvg%3E',true,907,'PREMIUM',true,true,'{"color":"#A2C8EC","kind":"SOLID_COLOR"}'::jsonb,NOW(),NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "RoomBackgroundTranslation" ("id","backgroundId","languageId","name")
SELECT md5('2aa54a39-00ce-500a-b85a-34e6d25a4ac5' || l."code")::uuid::text, '2aa54a39-00ce-500a-b85a-34e6d25a4ac5', l."id", t.name
FROM (VALUES ('es','Azul pastel'),('en','Pastel blue'),('en-us','Pastel blue'),('de','Pastellblau')) AS t(code, name)
JOIN "Language" l ON l."code" = t.code
ON CONFLICT ("backgroundId","languageId") DO NOTHING;

INSERT INTO "RoomBackground" ("id","name","imageUrl","previewUrl","active","sortOrder","accessType","isPremium","shopVisible","metadata","createdAt","updatedAt")
VALUES ('37792498-5845-516c-ac2d-3652c875662f','Lavanda pastel','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23E0D4F7%27%2F%3E%3C%2Fsvg%3E','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23E0D4F7%27%2F%3E%3C%2Fsvg%3E',true,908,'PREMIUM',true,true,'{"color":"#E0D4F7","kind":"SOLID_COLOR"}'::jsonb,NOW(),NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "RoomBackgroundTranslation" ("id","backgroundId","languageId","name")
SELECT md5('37792498-5845-516c-ac2d-3652c875662f' || l."code")::uuid::text, '37792498-5845-516c-ac2d-3652c875662f', l."id", t.name
FROM (VALUES ('es','Lavanda pastel'),('en','Pastel lavender'),('en-us','Pastel lavender'),('de','Pastelllavendel')) AS t(code, name)
JOIN "Language" l ON l."code" = t.code
ON CONFLICT ("backgroundId","languageId") DO NOTHING;

INSERT INTO "RoomBackground" ("id","name","imageUrl","previewUrl","active","sortOrder","accessType","isPremium","shopVisible","metadata","createdAt","updatedAt")
VALUES ('854305bc-0624-5e65-831d-ac1e4a984999','Lila pastel','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23D7B9F0%27%2F%3E%3C%2Fsvg%3E','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23D7B9F0%27%2F%3E%3C%2Fsvg%3E',true,909,'PREMIUM',true,true,'{"color":"#D7B9F0","kind":"SOLID_COLOR"}'::jsonb,NOW(),NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "RoomBackgroundTranslation" ("id","backgroundId","languageId","name")
SELECT md5('854305bc-0624-5e65-831d-ac1e4a984999' || l."code")::uuid::text, '854305bc-0624-5e65-831d-ac1e4a984999', l."id", t.name
FROM (VALUES ('es','Lila pastel'),('en','Pastel lilac'),('en-us','Pastel lilac'),('de','Pastellflieder')) AS t(code, name)
JOIN "Language" l ON l."code" = t.code
ON CONFLICT ("backgroundId","languageId") DO NOTHING;

INSERT INTO "RoomBackground" ("id","name","imageUrl","previewUrl","active","sortOrder","accessType","isPremium","shopVisible","metadata","createdAt","updatedAt")
VALUES ('64aedb60-9a67-5626-ba69-2ab197e39782','Crema','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23FFF8E7%27%2F%3E%3C%2Fsvg%3E','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23FFF8E7%27%2F%3E%3C%2Fsvg%3E',true,910,'PREMIUM',true,true,'{"color":"#FFF8E7","kind":"SOLID_COLOR"}'::jsonb,NOW(),NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "RoomBackgroundTranslation" ("id","backgroundId","languageId","name")
SELECT md5('64aedb60-9a67-5626-ba69-2ab197e39782' || l."code")::uuid::text, '64aedb60-9a67-5626-ba69-2ab197e39782', l."id", t.name
FROM (VALUES ('es','Crema'),('en','Cream'),('en-us','Cream'),('de','Creme')) AS t(code, name)
JOIN "Language" l ON l."code" = t.code
ON CONFLICT ("backgroundId","languageId") DO NOTHING;

INSERT INTO "RoomBackground" ("id","name","imageUrl","previewUrl","active","sortOrder","accessType","isPremium","shopVisible","metadata","createdAt","updatedAt")
VALUES ('ff35832f-3e95-53d5-bc52-db59f49a8de4','Gris perla','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23E3E6EA%27%2F%3E%3C%2Fsvg%3E','data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2764%27%20height%3D%2764%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20fill%3D%27%23E3E6EA%27%2F%3E%3C%2Fsvg%3E',true,911,'PREMIUM',true,true,'{"color":"#E3E6EA","kind":"SOLID_COLOR"}'::jsonb,NOW(),NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "RoomBackgroundTranslation" ("id","backgroundId","languageId","name")
SELECT md5('ff35832f-3e95-53d5-bc52-db59f49a8de4' || l."code")::uuid::text, 'ff35832f-3e95-53d5-bc52-db59f49a8de4', l."id", t.name
FROM (VALUES ('es','Gris perla'),('en','Pearl gray'),('en-us','Pearl gray'),('de','Perlgrau')) AS t(code, name)
JOIN "Language" l ON l."code" = t.code
ON CONFLICT ("backgroundId","languageId") DO NOTHING;
