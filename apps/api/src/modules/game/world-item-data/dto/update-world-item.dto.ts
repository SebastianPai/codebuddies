import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  FurnitureCategory,
  InteractionType,
  PlacementType,
  WorldItemKind,
} from '@prisma/client';

/**
 * Config avanzada de un world item (`PATCH /world-item-data/:itemId`, usado
 * por /admin/world-items).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTE DTO TIENE DECORADORES AHORA
 *
 * No tenía NINGUNO. El ValidationPipe global corre con
 * `whitelist: true, forbidNonWhitelisted: true` (ver main.ts), y esa
 * combinación descarta toda propiedad sin decorador y además la reporta como
 * error. O sea que este endpoint respondía 400 con
 * "property width should not exist" (y una línea por cada campo) ante
 * CUALQUIER body: guardar desde /admin/world-items no funcionaba en absoluto,
 * la página sólo mostraba su mensaje de error genérico.
 *
 * Los decoradores son, por tanto, lo que hace que el endpoint exista de
 * verdad — no un adorno. Todo es `@IsOptional()` porque es un PATCH parcial:
 * lo que no venga, no se toca.
 */
export class UpdateWorldItemDto {
  @IsOptional()
  @IsInt()
  width?: number;

  @IsOptional()
  @IsInt()
  height?: number;

  @IsOptional()
  @IsInt()
  footprintWidth?: number;

  @IsOptional()
  @IsInt()
  footprintHeight?: number;

  @IsOptional()
  @IsEnum(WorldItemKind)
  kind?: WorldItemKind;

  @IsOptional()
  @IsEnum(FurnitureCategory)
  category?: FurnitureCategory;

  @IsOptional()
  @IsBoolean()
  isCollidable?: boolean;

  @IsOptional()
  @IsBoolean()
  walkable?: boolean;

  @IsOptional()
  @IsBoolean()
  isInteractable?: boolean;

  @IsOptional()
  @IsBoolean()
  rotatable?: boolean;

  @IsOptional()
  @IsEnum(PlacementType)
  placementType?: PlacementType;

  @IsOptional()
  @IsBoolean()
  allowsStacking?: boolean;

  @IsOptional()
  @IsBoolean()
  canBeStacked?: boolean;

  @IsOptional()
  @IsInt()
  stackHeight?: number;

  @IsOptional()
  @IsInt()
  maxStackHeight?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(InteractionType, { each: true })
  interactionTypes?: InteractionType[];

  @IsOptional()
  @IsInt()
  sitX?: number;

  @IsOptional()
  @IsInt()
  sitY?: number;

  @IsOptional()
  @IsInt()
  sitElevation?: number;

  @IsOptional()
  @IsString()
  teleportTargetRoomId?: string;

  @IsOptional()
  @IsInt()
  teleportTargetX?: number;

  @IsOptional()
  @IsInt()
  teleportTargetY?: number;

  @IsOptional()
  @IsString()
  spriteSheetUrl?: string;

  @IsOptional()
  @IsString()
  previewImageUrl?: string;

  @IsOptional()
  @IsInt()
  frameWidth?: number;

  @IsOptional()
  @IsInt()
  frameHeight?: number;

  @IsOptional()
  @IsInt()
  directions?: number;

  // Calibración visual del artwork (píxeles). Solo mueve el sprite en
  // pantalla, no el footprint/anclaje. WorldItemDataService.update lo
  // normaliza (rango + sync + escalares legacy) antes de persistir.
  @IsOptional()
  @IsInt()
  spriteOffsetX?: number;

  @IsOptional()
  @IsInt()
  spriteOffsetY?: number;

  @IsOptional()
  @IsObject()
  spriteOffsets?: Record<string, { x?: number; y?: number }>;

  @IsOptional()
  @IsString()
  spriteOffsetSync?: string;

  // Comportamiento declarativo (estados / animaciones / transiciones). Acá
  // sólo se comprueba la forma gruesa; la validación real la hace
  // normalizeBehaviorForWrite() con @codebuddies/world-objects — el mismo
  // validador que usan ItemsService y MarketplaceService, y el mismo contrato
  // que el juego ejecuta.
  //
  // Ausente = no se toca la columna · null = se limpia (objeto estático).
  @IsOptional()
  @IsObject()
  behavior?: Record<string, any> | null;
}
