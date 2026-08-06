import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isVipOnly?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxUsers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  height?: number;

  @IsOptional()
  @IsString()
  layoutId?: string;

  @IsOptional()
  @IsString()
  backgroundId?: string;
}

export class JoinRoomDto {
  @IsString()
  roomId!: string;
}

export class RequestJoinDto {
  @IsString()
  roomId!: string;
}

export class InviteDto {
  @IsString()
  roomId!: string;

  @IsString()
  toUserId!: string;
}

export class JoinRequestsListDto {
  @IsString()
  roomId!: string;
}

export class ApproveJoinRequestDto {
  @IsString()
  requestId!: string;
}

export class RejectJoinRequestDto {
  @IsString()
  requestId!: string;
}

export class GivePermissionDto {
  @IsString()
  roomId!: string;

  @IsString()
  userId!: string;

  @IsIn(['ADMIN', 'EDITOR', 'VISITOR'])
  role!: 'ADMIN' | 'EDITOR' | 'VISITOR';
}

export class ChangeBackgroundDto {
  @IsString()
  roomId!: string;

  @IsString()
  backgroundId!: string;
}

export class UpdateThumbnailDto {
  @IsString()
  roomId!: string;

  @IsString()
  thumbnailUrl!: string;
}

// El rating es 1-5: antes se reenviaba data.value tal cual al servicio, sin
// acotar rango, permitiendo corromper el promedio de la sala con NaN/negativos.
export class RateRoomDto {
  @IsString()
  roomId!: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  value!: number;
}

export class GetRoomDetailsDto {
  @IsString()
  roomId!: string;
}

// ====================== ROLES PERSONALIZADOS ======================
// Los 11 flags son todos opcionales acá: si no vienen, el service los trata
// como `false` (crear) o los deja sin tocar (actualizar parcial).

export class ListCustomRolesDto {
  @IsString()
  roomId!: string;
}

export class CreateCustomRoleDto {
  @IsString()
  roomId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;

  @IsOptional()
  @IsString()
  colorHex?: string;

  @IsOptional() @IsBoolean() canPlaceObjects?: boolean;
  @IsOptional() @IsBoolean() canMoveObjects?: boolean;
  @IsOptional() @IsBoolean() canRotateObjects?: boolean;
  @IsOptional() @IsBoolean() canDeleteObjects?: boolean;
  @IsOptional() @IsBoolean() canEditConfig?: boolean;
  @IsOptional() @IsBoolean() canChangeFloor?: boolean;
  @IsOptional() @IsBoolean() canChangeWalls?: boolean;
  @IsOptional() @IsBoolean() canChangeBackground?: boolean;
  @IsOptional() @IsBoolean() canManageGuests?: boolean;
  @IsOptional() @IsBoolean() canManagePermissions?: boolean;
  @IsOptional() @IsBoolean() canModifyLighting?: boolean;
}

export class UpdateCustomRoleDto {
  @IsString()
  roleId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsString()
  colorHex?: string;

  @IsOptional() @IsBoolean() canPlaceObjects?: boolean;
  @IsOptional() @IsBoolean() canMoveObjects?: boolean;
  @IsOptional() @IsBoolean() canRotateObjects?: boolean;
  @IsOptional() @IsBoolean() canDeleteObjects?: boolean;
  @IsOptional() @IsBoolean() canEditConfig?: boolean;
  @IsOptional() @IsBoolean() canChangeFloor?: boolean;
  @IsOptional() @IsBoolean() canChangeWalls?: boolean;
  @IsOptional() @IsBoolean() canChangeBackground?: boolean;
  @IsOptional() @IsBoolean() canManageGuests?: boolean;
  @IsOptional() @IsBoolean() canManagePermissions?: boolean;
  @IsOptional() @IsBoolean() canModifyLighting?: boolean;
}

export class DeleteCustomRoleDto {
  @IsString()
  roleId!: string;
}

export class AssignCustomRoleDto {
  @IsString()
  roomId!: string;

  @IsString()
  targetUserId!: string;

  // null quita el rol personalizado asignado (vuelve al RoomRole legado).
  @IsOptional()
  @IsString()
  roleId?: string | null;
}

// ====================== INVITADOS ======================

export class ListGuestsDto {
  @IsString()
  roomId!: string;
}

export class ListRoomInvitesDto {
  @IsString()
  roomId!: string;
}

export class RevokeInviteDto {
  @IsString()
  inviteId!: string;
}

// Contraparte del lado del invitado (no del dueño): aceptar/rechazar una
// invitación que a ÉL le mandaron.
export class AcceptInviteDto {
  @IsString()
  inviteId!: string;
}

export class DeclineInviteDto {
  @IsString()
  inviteId!: string;
}

export class RevokePermissionDto {
  @IsString()
  roomId!: string;

  @IsString()
  targetUserId!: string;
}

export class KickGuestDto {
  @IsString()
  roomId!: string;

  @IsString()
  targetUserId!: string;
}

export class InviteFriendsSearchDto {
  @IsString()
  roomId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  query?: string;
}

// ====================== EDITAR MUNDO (General/Acceso/Límites) ======================

export class UpdateRoomDto {
  @IsString()
  roomId!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(['PUBLIC', 'PRIVATE_INVITE_ONLY', 'PRIVATE_REQUEST'])
  accessMode?: 'PUBLIC' | 'PRIVATE_INVITE_ONLY' | 'PRIVATE_REQUEST';

  @IsOptional()
  @IsBoolean()
  isVipOnly?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxUsers?: number;
}

// ====================== ILUMINACIÓN AMBIENTAL ======================

export class GetLightingStatusDto {
  @IsString()
  roomId!: string;
}

export class SetAmbientLightDto {
  @IsString()
  roomId!: string;

  @IsInt()
  @Min(0)
  @Max(100)
  intensity!: number;
}
