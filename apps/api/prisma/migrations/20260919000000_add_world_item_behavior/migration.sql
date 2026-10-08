-- Comportamiento declarativo de los World Objects interactivos.
--
-- Migración ESTRICTAMENTE ADITIVA: una columna nullable y un valor de enum.
-- No toca ni una fila existente. Todo el catálogo actual queda con
-- behavior = NULL, que el contrato define como "objeto de siempre": mismo
-- render, misma interacción (TOGGLE / OPEN por menú), mismo footprint.
--
-- Rollback: DROP COLUMN "behavior". El valor de enum no se puede quitar en
-- Postgres sin recrear el tipo, pero sobra sin usar: ninguna fila lo tiene
-- hasta que un objeto declare una transición CLICK.

-- AlterEnum
-- CLICK: el trigger de "click izquierdo directo sobre el objeto". Conviven
-- con TOGGLE y OPEN, que siguen siendo exactamente lo que eran.
ALTER TYPE "InteractionType" ADD VALUE IF NOT EXISTS 'CLICK';

-- AlterTable
ALTER TABLE "WorldItemData" ADD COLUMN     "behavior" JSONB;
