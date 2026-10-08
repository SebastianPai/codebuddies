// Mapeo ÚNICO de `MarketplaceContent.payload.worldData` -> columnas de
// WorldItemData. Lo usan las dos rutas de publicación:
//
//   createPublishedItemFromContent  (primera publicación)
//   updatePublishedItemFromContent  (republicar un item ya publicado)
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUÉ EXISTE ESTE ARCHIVO
//
// Antes cada una de esas dos rutas escribía su propio objeto `data` a mano, y
// se habían desincronizado: el `update` sólo tocaba 11 de las ~30 columnas, y
// el `create` se olvidaba de otras. El resultado concreto era que republicar
// un item publicado BORRABA:
//
//   · interactionTypes  → el mueble dejaba de ser TOGGLE/OPEN y el menú
//                         contextual perdía sus botones
//   · isInteractable    → volvía a false, así que interactItem() lo
//                         rechazaba con "Este objeto no es interactivo"
//   · engineData        → el juego lee frameWidth de acá (ver
//                         getSpriteFrameWidth); sin él caía a width/4 y un
//                         sprite de 1 o 2 caras se recortaba fuera de rango
//   · spriteOffsets     → el arte se corría de su ancla
//   · rotatable, placementType, walkable, isCollidable, directions,
//     stacking, sit*, teleport*  → todos al default
//
// Con una sola función eso no puede volver a divergir: agregar una columna es
// tocar un lugar, y el test de paridad falla si create y update dejan de
// coincidir.
//
// ─────────────────────────────────────────────────────────────────────────
// SEMÁNTICA DE `existing`
//
//   existing = null  → primera publicación: lo que no venga en el payload
//                      toma el default del modelo.
//   existing = fila  → republicación: lo que NO venga en el payload CONSERVA
//                      el valor que ya tenía en la base.
//
// Esto último es la corrección de fondo. El editor del creador no manda los
// campos que sólo edita un admin (interactionTypes, sit*, teleport*,
// behavior), así que tomarlos como "ausente ⇒ default" era exactamente la
// forma de perderlos. Mismo criterio de update parcial que ya usan
// `buildSpriteOffsetData({ existing })` y `WorldItemDataService.update`.

import {
  FurnitureCategory,
  InteractionType,
  PlacementType,
  Prisma,
  WorldItemKind,
} from '@prisma/client';

import { buildWorldEngineData } from '../game/items/engine-data.util';
import { buildSpriteOffsetData } from '../game/items/sprite-offset.util';
import { buildBehaviorData } from '../game/items/world-behavior.util';

/** Sólo lo que el mapeo necesita del MarketplaceContent. */
export type MarketplaceWorldDataSource = {
  worldData: Record<string, any>;
  /** Imagen resuelta (spriteUrl || previewUrl || payload.*) por el servicio. */
  imageUrl: string | null;
  /** `content.previewUrl`, que gana sobre imageUrl para la preview. */
  previewUrl: string | null;
  /** Fila actual de WorldItemData, si el item ya estaba publicado. */
  existing?: Record<string, any> | null;
};

const VALID_INTERACTION_TYPES = new Set<string>(Object.values(InteractionType));

function pickBool(raw: unknown, existing: unknown, fallback: boolean): boolean {
  if (raw !== undefined && raw !== null) return Boolean(raw);
  if (existing !== undefined && existing !== null) return Boolean(existing);
  return fallback;
}

/** Entero >= `min`. Ausente ⇒ el existente; sin existente ⇒ `fallback`. */
function pickInt(
  raw: unknown,
  existing: unknown,
  fallback: number,
  min = 0,
): number {
  const candidates = [raw, existing, fallback];
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === '')
      continue;
    const n = Math.trunc(Number(candidate));
    if (Number.isFinite(n) && n >= min) return n;
  }
  return fallback;
}

/** Entero que puede quedar en NULL (frameWidth, sitX, teleportTargetX...). */
function pickNullableInt(raw: unknown, existing: unknown): number | null {
  for (const candidate of [raw, existing]) {
    if (candidate === undefined || candidate === null || candidate === '')
      continue;
    const n = Math.trunc(Number(candidate));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickString(raw: unknown, existing: unknown): string | null {
  for (const candidate of [raw, existing]) {
    if (typeof candidate === 'string' && candidate.length > 0) return candidate;
  }
  return null;
}

function pickEnum<T extends string>(
  raw: unknown,
  existing: unknown,
  allowed: Record<string, T>,
  fallback: T,
): T {
  const values = Object.values(allowed) as string[];
  for (const candidate of [raw, existing]) {
    if (typeof candidate === 'string' && values.includes(candidate))
      return candidate as T;
  }
  return fallback;
}

/**
 * Tipos de interacción, filtrados contra el enum real.
 *
 * Un valor inventado en el payload se descarta en silencio en vez de reventar
 * la publicación con un error de Postgres sobre el enum: el resto del item es
 * perfectamente publicable.
 */
function pickInteractionTypes(
  raw: unknown,
  existing: unknown,
): InteractionType[] {
  const source = Array.isArray(raw)
    ? raw
    : Array.isArray(existing)
      ? existing
      : [];
  const seen = new Set<string>();
  const out: InteractionType[] = [];
  for (const value of source) {
    if (typeof value !== 'string') continue;
    if (!VALID_INTERACTION_TYPES.has(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value as InteractionType);
  }
  return out;
}

/**
 * Objeto `data` completo para WorldItemData (sin `itemId`), idéntico para
 * crear y para actualizar.
 */
export function buildMarketplaceWorldData({
  worldData,
  imageUrl,
  previewUrl,
  existing = null,
}: MarketplaceWorldDataSource) {
  const width = pickInt(worldData.width, existing?.width, 1, 1);
  const height = pickInt(worldData.height, existing?.height, 1, 1);
  const footprintWidth = pickInt(
    worldData.footprintWidth,
    existing?.footprintWidth,
    1,
    1,
  );
  const footprintHeight = pickInt(
    worldData.footprintHeight,
    existing?.footprintHeight,
    1,
    1,
  );
  const directions = pickInt(worldData.directions, existing?.directions, 4, 1);

  // engineData se DERIVA en el servidor, nunca se copia del payload.
  //
  // Antes el `create` guardaba `worldData.engineData` tal como venía del
  // cliente: un dato que el motor usa para recortar el spritesheet, en manos
  // de quien sube el contenido. Ahora sale de buildWorldEngineData() igual
  // que en ItemsService, así que el mismo item da el mismo engineData sin
  // importar por qué ruta se publicó.
  const optimized = buildWorldEngineData({
    width,
    height,
    footprintWidth,
    footprintHeight,
    footprints: worldData.footprints ?? existing?.footprints,
    surfaces: worldData.surfaces ?? existing?.surfaces,
    faceCount: directions,
  });

  const resolvedSprite =
    pickString(worldData.spriteSheetUrl, existing?.spriteSheetUrl) ?? imageUrl;
  const resolvedPreview =
    previewUrl ??
    pickString(worldData.previewImageUrl, existing?.previewImageUrl) ??
    imageUrl;

  return {
    width,
    height,

    spriteSheetUrl: resolvedSprite,
    previewImageUrl: resolvedPreview,

    frameWidth: pickNullableInt(worldData.frameWidth, existing?.frameWidth),
    frameHeight: pickNullableInt(worldData.frameHeight, existing?.frameHeight),

    footprintWidth,
    footprintHeight,

    syncDirections: pickBool(
      worldData.syncDirections,
      existing?.syncDirections,
      true,
    ),

    footprints: optimized.footprints as Prisma.InputJsonValue,
    surfaces: optimized.surfaces as Prisma.InputJsonValue,
    engineData: optimized.engineData as Prisma.InputJsonValue,

    directions,

    kind: pickEnum(
      worldData.kind,
      existing?.kind,
      WorldItemKind,
      WorldItemKind.FURNITURE,
    ),
    category: pickEnum(
      worldData.furnitureCategory ?? worldData.category,
      existing?.category,
      FurnitureCategory,
      FurnitureCategory.DECORATION,
    ),

    isCollidable: pickBool(
      worldData.isCollidable,
      existing?.isCollidable,
      false,
    ),
    walkable: pickBool(worldData.walkable, existing?.walkable, false),
    isInteractable: pickBool(
      worldData.isInteractable,
      existing?.isInteractable,
      false,
    ),
    rotatable: pickBool(worldData.rotatable, existing?.rotatable, true),

    placementType: pickEnum(
      worldData.placementType,
      existing?.placementType,
      PlacementType,
      PlacementType.FLOOR,
    ),

    allowsStacking: pickBool(
      worldData.allowsStacking,
      existing?.allowsStacking,
      false,
    ),
    canBeStacked: pickBool(
      worldData.canBeStacked,
      existing?.canBeStacked,
      false,
    ),
    stackHeight: pickInt(worldData.stackHeight, existing?.stackHeight, 1, 1),
    maxStackHeight: pickInt(
      worldData.maxStackHeight,
      existing?.maxStackHeight,
      0,
    ),

    interactionTypes: pickInteractionTypes(
      worldData.interactionTypes,
      existing?.interactionTypes,
    ),

    sitX: pickNullableInt(worldData.sitX, existing?.sitX),
    sitY: pickNullableInt(worldData.sitY, existing?.sitY),
    sitElevation: pickNullableInt(
      worldData.sitElevation,
      existing?.sitElevation,
    ),

    teleportTargetRoomId: pickString(
      worldData.teleportTargetRoomId,
      existing?.teleportTargetRoomId,
    ),
    teleportTargetX: pickNullableInt(
      worldData.teleportTargetX,
      existing?.teleportTargetX,
    ),
    teleportTargetY: pickNullableInt(
      worldData.teleportTargetY,
      existing?.teleportTargetY,
    ),

    // Calibración de artwork: normalizada por el backend (rango, sync y
    // escalares legacy), con `existing` para el update parcial. Antes el
    // `create` la ignoraba por completo aunque el editor del creador sí la
    // manda.
    ...buildSpriteOffsetData({
      spriteOffsets: worldData.spriteOffsets,
      spriteOffsetSync: worldData.spriteOffsetSync,
      spriteOffsetX: worldData.spriteOffsetX,
      spriteOffsetY: worldData.spriteOffsetY,
      existing,
    }),

    // Ausente en el payload ⇒ NO se toca la columna. Un behavior puesto por
    // un admin sobrevive a que el creador reedite y republique su contenido.
    ...buildBehaviorData(worldData.behavior),
  };
}
