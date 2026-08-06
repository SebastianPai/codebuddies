import { RoomRole } from '@prisma/client';

// Los 11 permisos independientes que un propietario puede combinar en un rol
// personalizado (RoomCustomRole) para su sala. "Puede administrar permisos"
// y "puede modificar iluminación" son deliberadamente equivalentes a lo que
// antes SOLO podía hacer un RoomPermission.role === 'ADMIN' (ver
// LEGACY_ROLE_PERMISSIONS más abajo) — son los poderes "de confianza alta"
// que un EDITOR nunca tuvo.
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

export const ALL_PERMISSIONS_GRANTED: EffectivePermissions = {
  canPlaceObjects: true,
  canMoveObjects: true,
  canRotateObjects: true,
  canDeleteObjects: true,
  canEditConfig: true,
  canChangeFloor: true,
  canChangeWalls: true,
  canChangeBackground: true,
  canManageGuests: true,
  canManagePermissions: true,
  canModifyLighting: true,
};

const NO_PERMISSIONS_GRANTED: EffectivePermissions = {
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

// Antes del sistema de roles personalizados, TODO lo que hoy son 11 flags
// independientes vivía detrás de un único chequeo por tier (ADMIN/EDITOR/
// VISITOR) repetido en rooms.service.ts y room-items.service.ts. Esta tabla
// preserva EXACTAMENTE ese comportamiento para cualquier sala que nunca haya
// tocado el sistema nuevo (sin filas en RoomCustomRole): un EDITOR sigue
// pudiendo colocar/mover/rotar/eliminar objetos, cambiar piso/paredes/fondo,
// editar la miniatura y aprobar/rechazar solicitudes de invitados — todo lo
// que ya podía hacer via el viejo `assertCanEditRoom`/`canEditRoom` (ADMIN o
// EDITOR) — pero NO otorgar permisos ni limpiar la sala entera, que antes
// eran exclusivos de ADMIN (`assertCanGrantPermissions`/`canClearRoom`), ni
// modificar iluminación (concepto nuevo, sin equivalente previo).
const LEGACY_ROLE_PERMISSIONS: Record<RoomRole, EffectivePermissions> = {
  OWNER: ALL_PERMISSIONS_GRANTED, // nunca se asigna en la práctica; Room.ownerId manda
  ADMIN: ALL_PERMISSIONS_GRANTED,
  EDITOR: {
    canPlaceObjects: true,
    canMoveObjects: true,
    canRotateObjects: true,
    canDeleteObjects: true,
    canEditConfig: true,
    canChangeFloor: true,
    canChangeWalls: true,
    canChangeBackground: true,
    canManageGuests: true,
    canManagePermissions: false,
    canModifyLighting: false,
  },
  VISITOR: NO_PERMISSIONS_GRANTED,
};

type PermissionRow = {
  role: RoomRole;
  customRole?: Partial<EffectivePermissions> | null;
} | null;

// Resolver puro: no toca la base de datos, así que rooms.service.ts y
// room-items.service.ts (dos módulos distintos) pueden compartirlo sin
// crear una dependencia circular entre servicios de Nest.
export function resolveEffectivePermissions(
  isOwner: boolean,
  permission: PermissionRow,
): EffectivePermissions {
  if (isOwner) return ALL_PERMISSIONS_GRANTED;
  if (!permission) return NO_PERMISSIONS_GRANTED;

  if (permission.customRole) {
    const role = permission.customRole;
    return {
      canPlaceObjects: Boolean(role.canPlaceObjects),
      canMoveObjects: Boolean(role.canMoveObjects),
      canRotateObjects: Boolean(role.canRotateObjects),
      canDeleteObjects: Boolean(role.canDeleteObjects),
      canEditConfig: Boolean(role.canEditConfig),
      canChangeFloor: Boolean(role.canChangeFloor),
      canChangeWalls: Boolean(role.canChangeWalls),
      canChangeBackground: Boolean(role.canChangeBackground),
      canManageGuests: Boolean(role.canManageGuests),
      canManagePermissions: Boolean(role.canManagePermissions),
      canModifyLighting: Boolean(role.canModifyLighting),
    };
  }

  return LEGACY_ROLE_PERMISSIONS[permission.role] ?? NO_PERMISSIONS_GRANTED;
}
