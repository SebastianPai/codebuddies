// src/game/types/WorldObject.ts

import Phaser from "phaser";

export interface WorldObject {
  roomItemId: string;

  roomId: string;

  ownerId: string;

  rotation: number;

  tileX: number;
  tileY: number;

  elevation: number;

  parentRoomItemId?: string | null;

  wallSide?: string | null;

  wallOffset?: number | null;

  state?: any;

  sprite: Phaser.GameObjects.Sprite;

  surfaceSprites?: Phaser.GameObjects.Sprite[];

  // Luz de "encendido" (interacción TOGGLE): existe solo mientras state.on
  // es true. La maneja RoomItemsManager.applyItemState.
  glowLight?: Phaser.GameObjects.PointLight | null;

  item: any;
}
