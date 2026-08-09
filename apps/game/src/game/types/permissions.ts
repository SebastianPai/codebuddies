// Espejo del EffectivePermissions de apps/api/src/modules/game/rooms/room-permissions.util.ts
// — el servidor manda esto en el payload de "room:joined" (myPermissions) y
// vuelve a resolverlo en cada acción, así que esto es solo para gating de UI
// (mostrar/ocultar botones), nunca la fuente de verdad.
export interface EffectivePermissions {
  canPlaceObjects: boolean;
  canMoveObjects: boolean;
  canRotateObjects: boolean;
  canDeleteObjects: boolean;
  canEditConfig: boolean;
  canChangeFloor: boolean;
  canChangeWalls: boolean;
  canChangeBackground: boolean;
  canManageGuests: boolean;
  canManagePermissions: boolean;
  canModifyLighting: boolean;
}

export const NO_PERMISSIONS: EffectivePermissions = {
  canPlaceObjects: false,
  canMoveObjects: false,
  canRotateObjects: false,
  canDeleteObjects: false,
  canEditConfig: false,
  canChangeFloor: false,
  canChangeWalls: false,
  canChangeBackground: false,
  canManageGuests: false,
  canManagePermissions: false,
  canModifyLighting: false,
};
