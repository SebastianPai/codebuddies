-- Economy Foundation v1: remap de rareza de 4 a 5 niveles.
-- Orden descendente para no encadenar remaps sobre filas ya movidas en el
-- mismo pase: old3->new4 primero, luego old2->new3, luego old1->new2.
-- old0 (Common) no cambia. En la base actual solo existen filas rarity=0
-- (17) y rarity=2 (1) -- las otras dos sentencias son no-op hoy, pero
-- documentan la regla completa para cualquier fila futura.
UPDATE "Item" SET rarity = 4 WHERE rarity = 3;
UPDATE "Item" SET rarity = 3 WHERE rarity = 2;
UPDATE "Item" SET rarity = 2 WHERE rarity = 1;

-- Oculta de la tienda pública los 2 items identificados como contenido de
-- QA/prueba inequívoco (nombres literales "aaaaaaa" y "zzzzzzz", sin
-- ningún valor de catálogo real -- ver auditoría de economía de items,
-- 2026-08-20). No se borra ninguna fila, no se toca ownership/inventario,
-- no se cambian IDs -- solo shopVisible pasa a false.
UPDATE "Item" SET "shopVisible" = false
WHERE id IN ('732a5027-5f63-49b2-80a4-bce73fafdb26', 'fa3d883a-8450-48fd-bed6-23f8af01df57');
