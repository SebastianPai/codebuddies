import {
  FurnitureCategory,
  InteractionType,
  PlacementType,
  WorldItemKind,
} from '@prisma/client';

export class UpdateWorldItemDto {
  width?: number;

  height?: number;

  footprintWidth?: number;

  footprintHeight?: number;

  kind?: WorldItemKind;

  category?: FurnitureCategory;

  isCollidable?: boolean;

  walkable?: boolean;

  isInteractable?: boolean;

  rotatable?: boolean;

  placementType?: PlacementType;

  allowsStacking?: boolean;

  canBeStacked?: boolean;

  stackHeight?: number;

  maxStackHeight?: number;

  interactionTypes?: InteractionType[];

  sitX?: number;

  sitY?: number;

  sitElevation?: number;

  teleportTargetRoomId?: string;

  teleportTargetX?: number;

  teleportTargetY?: number;

  spriteSheetUrl?: string;

  previewImageUrl?: string;

  frameWidth?: number;

  frameHeight?: number;

  directions?: number;

  // Calibración visual del artwork (píxeles). Solo mueve el sprite en
  // pantalla, no el footprint/anclaje. WorldItemDataService.update lo
  // normaliza (rango + sync + escalares legacy) antes de persistir.
  spriteOffsetX?: number;

  spriteOffsetY?: number;

  spriteOffsets?: Record<string, { x?: number; y?: number }>;

  spriteOffsetSync?: string;
}
