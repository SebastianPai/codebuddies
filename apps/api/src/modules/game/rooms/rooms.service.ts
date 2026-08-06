import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { BackgroundsService } from '../backgrounds/backgrounds.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { FriendshipsService } from '../../friendships/friendships.service';
import {
  EffectivePermissions,
  resolveEffectivePermissions,
} from './room-permissions.util';

type CanJoinRoomResult =
  | { allowed: false; reason: string }
  | { allowed: true; room: any };

@Injectable()
export class RoomsService {
  constructor(
    private prisma: PrismaService,
    private backgroundsService: BackgroundsService,
    private notificationsService: NotificationsService,
    private friendshipsService: FriendshipsService,
  ) {}

  // ====================== CREACIÓN Y LISTADO ======================

  async createRoom(userId: string, data: any) {
    if (!data.name || data.name.trim().length < 3) {
      throw new BadRequestException(
        'El nombre de la sala debe tener al menos 3 caracteres',
      );
    }

    const maxUsers = data.maxUsers ?? 20;
    const isVipRoom = data.isVipOnly ?? false;
    const background = await this.backgroundsService.assertCanUse(
      userId,
      data.backgroundId || null,
    );
    await this.assertLayoutBackgroundCompatible(
      data.layoutId || null,
      background,
    );

    return this.prisma.room.create({
      data: {
        ownerId: userId,
        name: data.name.trim(),
        description: data.description ?? '',
        isPublic: data.isPublic ?? true,
        isVipOnly: isVipRoom,
        maxUsers: isVipRoom ? Math.max(maxUsers, 20) : Math.min(maxUsers, 30),
        width: data.width ?? 800,
        height: data.height ?? 600,
        layoutId: data.layoutId || null,
        backgroundId: background?.id || null,
      },
      include: {
        owner: { select: { username: true } },
        background: true,
        layout: true,
      },
    });
  }

  async getPublicRooms() {
    return this.prisma.room.findMany({
      where: { isPublic: true },
      include: {
        owner: { select: { username: true } },
        background: {
          select: { name: true, imageUrl: true, previewUrl: true },
        },
        _count: { select: { users: true } },
      },
      orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getMyRooms(userId: string) {
    return this.prisma.room.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { permissions: { some: { userId } } },
          { invites: { some: { toUserId: userId, status: 'APPROVED' } } },
        ],
      },
      include: {
        owner: { select: { username: true } },
        background: {
          select: { name: true, imageUrl: true, previewUrl: true },
        },
        _count: { select: { users: true } },
      },
    });
  }

  // Salas que se muestran en el perfil público de un jugador: las privadas
  // se listan igual (para que se sepa que existen) pero marcadas para que el
  // front pida acceso en vez de ofrecer un botón de "Entrar" directo.
  async getRoomsForProfile(username: string, viewerId?: string) {
    const owner = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!owner) throw new NotFoundException('Usuario no encontrado');

    const rooms = await this.prisma.room.findMany({
      where: { ownerId: owner.id },
      include: {
        background: {
          select: { name: true, imageUrl: true, previewUrl: true },
        },
        _count: { select: { users: true } },
        joinRequests: viewerId
          ? { where: { userId: viewerId }, select: { status: true } }
          : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    return rooms.map((room) => {
      const { joinRequests, ...rest } = room as typeof room & {
        joinRequests?: Array<{ status: string }>;
      };
      const isOwner = viewerId === room.ownerId;
      const pendingRequestStatus = joinRequests?.[0]?.status ?? null;

      return {
        ...rest,
        canJoinDirectly: room.isPublic || isOwner,
        joinRequestStatus: pendingRequestStatus,
      };
    });
  }

  async getRoomById(roomId: string) {
    if (!roomId) {
      throw new BadRequestException('roomId es undefined');
    }

    return this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        owner: { select: { username: true, id: true } },
        users: true,
        permissions: true,
        background: true,
        ratings: true,
        layout: true,
      },
    });
  }

  // ====================== UNIÓN Y PERMISOS ======================

  async canJoinRoom(
    userId: string,
    roomId: string,
  ): Promise<CanJoinRoomResult> {
    const room = await this.getRoomById(roomId);
    if (!room) return { allowed: false, reason: 'ROOM_NOT_FOUND' };

    if (room.users.length >= room.maxUsers) {
      return { allowed: false, reason: 'ROOM_FULL' };
    }

    if (room.ownerId === userId) return { allowed: true, room };
    // accessMode reemplaza a isPublic para esta decisión (se mantienen en
    // sync desde updateRoom, así que equivalen siempre a lo mismo).
    if (room.accessMode === 'PUBLIC') return { allowed: true, room };

    // Verificar permiso explícito
    const permission = await this.prisma.roomPermission.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (permission) return { allowed: true, room };

    // Verificar invitación aceptada
    const invite = await this.prisma.roomInvite.findUnique({
      where: { roomId_toUserId: { roomId, toUserId: userId } },
    });

    if (invite && invite.status === 'APPROVED') {
      return { allowed: true, room };
    }

    // "Solo invitados": a diferencia de PRIVATE_REQUEST, acá no existe el
    // camino de "pedir acceso" — sin permiso/invitación aprobada, no entra.
    if (room.accessMode === 'PRIVATE_INVITE_ONLY') {
      return { allowed: false, reason: 'INVITE_ONLY' };
    }

    // Verificar solicitud de acceso aprobada por el dueño (room:requestJoin
    // + room:joinRequest:approve). Antes solo se chequeaba RoomInvite, así
    // que una solicitud aprobada nunca dejaba entrar a nadie.
    const joinRequest = await this.prisma.roomJoinRequest.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (joinRequest && joinRequest.status === 'APPROVED') {
      return { allowed: true, room };
    }

    return { allowed: false, reason: 'REQUEST' };
  }

  async joinRoom(userId: string, roomId: string) {
    return this.prisma.roomUser.upsert({
      where: { roomId_userId: { roomId, userId } },
      update: {},
      create: {
        roomId,
        userId,
        x: 100,
        y: 100,
        direction: 'SOUTH',
        role: 'VISITOR',
      },
    });
  }

  // ====================== SOLICITUDES E INVITACIONES ======================

  async requestJoin(userId: string, roomId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, name: true, ownerId: true },
    });
    if (!room) throw new NotFoundException('Sala no encontrada');

    const request = await this.prisma.roomJoinRequest.upsert({
      where: { roomId_userId: { roomId, userId } },
      update: { status: 'PENDING' },
      create: {
        roomId,
        userId,
        status: 'PENDING',
      },
    });

    if (room.ownerId !== userId) {
      const requester = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });

      await this.notificationsService.create({
        userId: room.ownerId,
        type: NotificationType.ROOM_JOIN_REQUEST,
        title: 'Solicitud para entrar a tu sala',
        body: `${requester?.username ?? 'Alguien'} quiere entrar a "${room.name}".`,
        metadata: {
          roomId: room.id,
          requestId: request.id,
          requesterId: userId,
        },
      });
    }

    return request;
  }

  async getPendingRequests(roomId: string, callerUserId: string) {
    await this.assertPermission(
      roomId,
      callerUserId,
      'canManageGuests',
      'ver las solicitudes',
    );

    return this.prisma.roomJoinRequest.findMany({
      where: { roomId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
  }

  async approveRequest(requestId: string, callerUserId: string) {
    const request = await this.prisma.roomJoinRequest.findUnique({
      where: { id: requestId },
      include: { room: { select: { id: true, name: true, ownerId: true } } },
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    await this.assertPermission(
      request.room.id,
      callerUserId,
      'canManageGuests',
      'aprobar solicitudes',
    );

    const updated = await this.prisma.roomJoinRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' },
    });

    await this.notificationsService.create({
      userId: request.userId,
      type: NotificationType.ROOM_JOIN_APPROVED,
      title: 'Te dejaron entrar',
      body: `Ya puedes entrar a "${request.room.name}".`,
      metadata: { roomId: request.room.id },
    });

    return updated;
  }

  async rejectRequest(requestId: string, callerUserId: string) {
    const request = await this.prisma.roomJoinRequest.findUnique({
      where: { id: requestId },
      include: { room: { select: { id: true } } },
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    await this.assertPermission(
      request.room.id,
      callerUserId,
      'canManageGuests',
      'rechazar solicitudes',
    );

    return this.prisma.roomJoinRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });
  }

  async inviteUser(roomId: string, fromUserId: string, toUserId: string) {
    // Antes cualquier usuario autenticado podía invitar a cualquier otro a
    // cualquier sala, sin ningún chequeo — ahora exige canManageGuests igual
    // que el resto de la administración de invitados.
    await this.assertPermission(
      roomId,
      fromUserId,
      'canManageGuests',
      'invitar jugadores',
    );

    const isFriend = (await this.friendshipsService.list(fromUserId)).some(
      (friendship: any) => friendship.friend.id === toUserId,
    );
    if (!isFriend) {
      throw new BadRequestException('Solo puedes invitar a tus amigos');
    }

    const [room, fromUser] = await Promise.all([
      this.prisma.room.findUnique({ where: { id: roomId }, select: { name: true } }),
      this.prisma.user.findUnique({ where: { id: fromUserId }, select: { username: true } }),
    ]);

    const invite = await this.prisma.roomInvite.upsert({
      where: { roomId_toUserId: { roomId, toUserId } },
      update: { status: 'PENDING' },
      create: {
        roomId,
        fromUserId,
        toUserId,
        status: 'PENDING',
      },
    });

    // Antes no existía ningún aviso: el invitado no tenía forma de enterarse
    // de que lo invitaron salvo que abriera la sala del otro por casualidad.
    await this.notificationsService.create({
      userId: toUserId,
      type: NotificationType.ROOM_INVITE,
      title: 'Te invitaron a una sala',
      body: `${fromUser?.username ?? 'Alguien'} te invitó a "${room?.name ?? 'su sala'}".`,
      metadata: { roomId, inviteId: invite.id, fromUserId },
    });

    return invite;
  }

  // Contraparte que faltaba: una invitación se creaba en PENDING y nunca
  // pasaba a APPROVED en ningún lado — canJoinRoom exige exactamente ese
  // status para dejar entrar por invitación (ver arriba), así que nadie
  // invitado podía realmente usar la invitación para entrar a una sala
  // PRIVATE_INVITE_ONLY. Este es el método que faltaba.
  async acceptInvite(inviteId: string, userId: string) {
    const invite = await this.prisma.roomInvite.findUnique({
      where: { id: inviteId },
      include: { room: { select: { id: true, name: true } } },
    });
    if (!invite) throw new NotFoundException('Invitación no encontrada');
    if (invite.toUserId !== userId) {
      throw new ForbiddenException('Esta invitación no es para vos');
    }
    if (invite.status !== 'PENDING') {
      throw new BadRequestException('Esta invitación ya no está disponible');
    }

    return this.prisma.roomInvite.update({
      where: { id: inviteId },
      data: { status: 'APPROVED' },
      include: { room: { select: { id: true, name: true } } },
    });
  }

  async declineInvite(inviteId: string, userId: string) {
    const invite = await this.prisma.roomInvite.findUnique({ where: { id: inviteId } });
    if (!invite) throw new NotFoundException('Invitación no encontrada');
    if (invite.toUserId !== userId) {
      throw new ForbiddenException('Esta invitación no es para vos');
    }

    return this.prisma.roomInvite.update({
      where: { id: inviteId },
      data: { status: 'REJECTED' },
    });
  }

  // Amigos que todavía se pueden invitar a esta sala puntual (ni ya
  // invitados con invitación pendiente, ni ya con acceso otorgado), filtrado
  // opcionalmente por nombre. El buscador de invitación queda scoped a
  // amigos a propósito — no hay endpoint de búsqueda global de usuarios.
  async listInvitableFriends(
    roomId: string,
    callerUserId: string,
    query?: string,
  ) {
    await this.assertPermission(
      roomId,
      callerUserId,
      'canManageGuests',
      'invitar jugadores',
    );

    const friendships = await this.friendshipsService.list(callerUserId);
    const friends = friendships.map((friendship: any) => friendship.friend);

    const [existingPermissions, pendingInvites] = await Promise.all([
      this.prisma.roomPermission.findMany({
        where: { roomId },
        select: { userId: true },
      }),
      this.prisma.roomInvite.findMany({
        where: { roomId, status: 'PENDING' },
        select: { toUserId: true },
      }),
    ]);

    const excluded = new Set<string>([
      ...existingPermissions.map((permission) => permission.userId),
      ...pendingInvites.map((invite) => invite.toUserId),
    ]);

    const term = query?.trim().toLowerCase();

    return friends.filter((friend: { id: string; username: string }) => {
      if (excluded.has(friend.id)) return false;
      if (term && !friend.username.toLowerCase().includes(term)) return false;
      return true;
    });
  }

  // Invitaciones pendientes de esta sala — para el panel de invitados del
  // dueño/administrador.
  async listInvites(roomId: string, callerUserId: string) {
    await this.assertPermission(
      roomId,
      callerUserId,
      'canManageGuests',
      'ver las invitaciones',
    );

    return this.prisma.roomInvite.findMany({
      where: { roomId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        toUser: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
  }

  async revokeInvite(inviteId: string, callerUserId: string) {
    const invite = await this.prisma.roomInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) throw new NotFoundException('Invitación no encontrada');

    await this.assertPermission(
      invite.roomId,
      callerUserId,
      'canManageGuests',
      'revocar invitaciones',
    );

    return this.prisma.roomInvite.update({
      where: { id: inviteId },
      data: { status: 'REVOKED' },
    });
  }

  // Miembros con acceso otorgado (RoomPermission), con su rol/rol
  // personalizado — el dueño no aparece acá porque no necesita una fila de
  // RoomPermission, la UI lo muestra aparte.
  async listGuests(roomId: string, callerUserId: string) {
    await this.assertPermission(
      roomId,
      callerUserId,
      'canManageGuests',
      'ver los invitados',
    );

    return this.prisma.roomPermission.findMany({
      where: { roomId },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        customRole: true,
      },
    });
  }

  // Contraparte que le faltaba a givePermission: hoy solo se podía otorgar
  // o cambiar un permiso, nunca quitarlo del todo. Mismo gate que otorgar
  // (canManagePermissions), para que quien puede dar también pueda quitar.
  async revokePermission(
    roomId: string,
    targetUserId: string,
    callerUserId: string,
  ) {
    await this.assertPermission(
      roomId,
      callerUserId,
      'canManagePermissions',
      'revocar permisos de invitados',
    );

    await this.prisma.roomPermission.deleteMany({
      where: { roomId, userId: targetUserId },
    });
  }

  // Expulsa a alguien de la sala AHORA (borra su presencia en vivo); no
  // revoca su invitación ni sus permisos — si el dueño quiere que no pueda
  // volver a entrar, eso es una acción aparte (revokeInvite/revokePermission).
  async kickGuest(roomId: string, targetUserId: string, callerUserId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Sala no encontrada');

    if (room.ownerId === targetUserId) {
      throw new ForbiddenException('No puedes expulsar al dueño de la sala');
    }

    await this.assertPermission(
      roomId,
      callerUserId,
      'canManageGuests',
      'expulsar invitados',
    );

    await this.prisma.roomUser.deleteMany({
      where: { roomId, userId: targetUserId },
    });
  }

  async givePermission(
    roomId: string,
    userId: string,
    role: 'ADMIN' | 'EDITOR' | 'VISITOR',
    callerUserId: string,
  ) {
    await this.assertCanGrantPermissions(roomId, callerUserId);

    return this.prisma.roomPermission.upsert({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
      update: {
        role,
      },
      create: {
        roomId,
        userId,
        role,
      },
    });
  }

  // Punto público para que el cliente sepa sus propios permisos al entrar a
  // una sala — gating de UI (botones de FurnitureContextMenu, pestañas de
  // EditWorldPanel, visibilidad de GuestsPanel/PermissionsPanel) sin exponer
  // el detalle de cómo se resuelven.
  async getMyPermissions(
    roomId: string,
    userId: string,
  ): Promise<EffectivePermissions> {
    const { permissions } = await this.getEffectivePermissions(roomId, userId);
    return permissions;
  }

  // Solo el dueño de la sala o quien tenga canManagePermissions puede otorgar
  // permisos (legado: EDITOR nunca lo tuvo, ADMIN sí — ver
  // LEGACY_ROLE_PERMISSIONS en room-permissions.util.ts). Un EDITOR pudiendo
  // otorgar ADMIN a cualquier cuenta sería en sí mismo un camino de escalación.
  private async assertCanGrantPermissions(
    roomId: string,
    callerUserId: string,
  ) {
    await this.assertPermission(
      roomId,
      callerUserId,
      'canManagePermissions',
      'otorgar permisos en esta sala',
    );
  }

  // Resuelve los 11 permisos independientes de un usuario en una sala:
  // dueño -> todo permitido; con rol personalizado asignado -> flags de esa
  // plantilla; si no -> mapeo fijo desde el RoomRole legado (ver
  // room-permissions.util.ts). Punto único de lectura para no repetir la
  // consulta a RoomPermission en cada método (antes duplicada acá y en
  // room-items.service.ts).
  private async getEffectivePermissions(
    roomId: string,
    userId: string,
  ): Promise<{
    room: { id: string; ownerId: string };
    permissions: EffectivePermissions;
  }> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Sala no encontrada');

    if (room.ownerId === userId) {
      return { room, permissions: resolveEffectivePermissions(true, null) };
    }

    const permission = await this.prisma.roomPermission.findUnique({
      where: { roomId_userId: { roomId, userId } },
      include: { customRole: true },
    });

    return {
      room,
      permissions: resolveEffectivePermissions(false, permission),
    };
  }

  // Reemplaza al antiguo assertCanEditRoom: en vez de un único check por
  // tier, cada acción pide el flag granular que le corresponde.
  private async assertPermission(
    roomId: string,
    userId: string,
    flag: keyof EffectivePermissions,
    action: string,
  ) {
    const { room, permissions } = await this.getEffectivePermissions(
      roomId,
      userId,
    );

    if (!permissions[flag]) {
      throw new ForbiddenException(`No tienes permiso para ${action}`);
    }

    return room;
  }

  // ====================== ROLES PERSONALIZADOS ======================

  async listCustomRoles(roomId: string, callerUserId: string) {
    await this.assertPermission(
      roomId,
      callerUserId,
      'canManagePermissions',
      'ver los roles personalizados',
    );

    return this.prisma.roomCustomRole.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createCustomRole(
    roomId: string,
    callerUserId: string,
    data: Partial<EffectivePermissions> & { name: string; colorHex?: string },
  ) {
    await this.assertPermission(
      roomId,
      callerUserId,
      'canManagePermissions',
      'crear roles personalizados',
    );

    return this.prisma.roomCustomRole.create({
      data: {
        roomId,
        name: data.name.trim(),
        colorHex: data.colorHex ?? null,
        canPlaceObjects: Boolean(data.canPlaceObjects),
        canMoveObjects: Boolean(data.canMoveObjects),
        canRotateObjects: Boolean(data.canRotateObjects),
        canDeleteObjects: Boolean(data.canDeleteObjects),
        canEditConfig: Boolean(data.canEditConfig),
        canChangeFloor: Boolean(data.canChangeFloor),
        canChangeWalls: Boolean(data.canChangeWalls),
        canChangeBackground: Boolean(data.canChangeBackground),
        canManageGuests: Boolean(data.canManageGuests),
        canManagePermissions: Boolean(data.canManagePermissions),
        canModifyLighting: Boolean(data.canModifyLighting),
      },
    });
  }

  async updateCustomRole(
    roleId: string,
    callerUserId: string,
    data: Partial<EffectivePermissions> & { name?: string; colorHex?: string },
  ) {
    const role = await this.prisma.roomCustomRole.findUnique({
      where: { id: roleId },
    });
    if (!role) throw new NotFoundException('Rol no encontrado');

    await this.assertPermission(
      role.roomId,
      callerUserId,
      'canManagePermissions',
      'editar roles personalizados',
    );

    const {
      name,
      colorHex,
      canPlaceObjects,
      canMoveObjects,
      canRotateObjects,
      canDeleteObjects,
      canEditConfig,
      canChangeFloor,
      canChangeWalls,
      canChangeBackground,
      canManageGuests,
      canManagePermissions,
      canModifyLighting,
    } = data;

    return this.prisma.roomCustomRole.update({
      where: { id: roleId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(colorHex !== undefined && { colorHex }),
        ...(canPlaceObjects !== undefined && { canPlaceObjects }),
        ...(canMoveObjects !== undefined && { canMoveObjects }),
        ...(canRotateObjects !== undefined && { canRotateObjects }),
        ...(canDeleteObjects !== undefined && { canDeleteObjects }),
        ...(canEditConfig !== undefined && { canEditConfig }),
        ...(canChangeFloor !== undefined && { canChangeFloor }),
        ...(canChangeWalls !== undefined && { canChangeWalls }),
        ...(canChangeBackground !== undefined && { canChangeBackground }),
        ...(canManageGuests !== undefined && { canManageGuests }),
        ...(canManagePermissions !== undefined && { canManagePermissions }),
        ...(canModifyLighting !== undefined && { canModifyLighting }),
      },
    });
  }

  async deleteCustomRole(roleId: string, callerUserId: string) {
    const role = await this.prisma.roomCustomRole.findUnique({
      where: { id: roleId },
    });
    if (!role) throw new NotFoundException('Rol no encontrado');

    await this.assertPermission(
      role.roomId,
      callerUserId,
      'canManagePermissions',
      'eliminar roles personalizados',
    );

    return this.prisma.roomCustomRole.delete({ where: { id: roleId } });
  }

  // roleId en null quita el rol personalizado del usuario (vuelve a caer al
  // RoomRole legado de esa fila, VISITOR por defecto si nunca tuvo uno).
  async assignCustomRole(
    roomId: string,
    targetUserId: string,
    roleId: string | null,
    callerUserId: string,
  ) {
    await this.assertPermission(
      roomId,
      callerUserId,
      'canManagePermissions',
      'asignar roles personalizados',
    );

    if (roleId) {
      const role = await this.prisma.roomCustomRole.findUnique({
        where: { id: roleId },
      });
      if (!role || role.roomId !== roomId) {
        throw new BadRequestException('El rol no pertenece a esta sala');
      }
    }

    return this.prisma.roomPermission.upsert({
      where: { roomId_userId: { roomId, userId: targetUserId } },
      update: { customRoleId: roleId },
      create: {
        roomId,
        userId: targetUserId,
        role: 'VISITOR',
        customRoleId: roleId,
      },
    });
  }

  // ====================== CALIFICACIÓN Y FONDOS ======================

  async rateRoom(userId: string, roomId: string, value: number) {
    await this.prisma.roomRating.upsert({
      where: { roomId_userId: { roomId, userId } },
      update: { value },
      create: { roomId, userId, value },
    });

    const ratings = await this.prisma.roomRating.findMany({
      where: { roomId },
    });
    const avg =
      ratings.length > 0
        ? ratings.reduce((acc, r) => acc + r.value, 0) / ratings.length
        : 0;

    return this.prisma.room.update({
      where: { id: roomId },
      data: {
        rating: avg,
        totalVotes: ratings.length,
      },
    });
  }

  async getBackgrounds(userId: string) {
    return this.backgroundsService.listAvailableForUser(userId);
  }

  async setBackground(roomId: string, backgroundId: string, userId: string) {
    await this.assertPermission(
      roomId,
      userId,
      'canChangeBackground',
      'cambiar el fondo',
    );

    const background = await this.backgroundsService.assertCanUse(
      userId,
      backgroundId,
    );
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { layoutId: true },
    });
    await this.assertLayoutBackgroundCompatible(
      room?.layoutId || null,
      background,
    );

    return this.prisma.room.update({
      where: { id: roomId },
      data: { backgroundId: background?.id ?? null },
      include: { background: true },
    });
  }

  private async assertLayoutBackgroundCompatible(
    layoutId?: string | null,
    background?: any,
  ) {
    if (!layoutId || !background?.id) return;

    const layout = await this.prisma.roomLayout.findUnique({
      where: { id: layoutId },
      select: { layoutJson: true },
    });

    const layoutConfig = (layout?.layoutJson as any)?.__codebuddies ?? {};
    const allowedBackgrounds = Array.isArray(
      layoutConfig.compatibleBackgroundIds,
    )
      ? layoutConfig.compatibleBackgroundIds
      : [];
    const backgroundMetadata = background.metadata ?? {};
    const allowedLayouts = Array.isArray(backgroundMetadata.compatibleLayoutIds)
      ? backgroundMetadata.compatibleLayoutIds
      : [];

    if (
      allowedBackgrounds.length &&
      !allowedBackgrounds.includes(background.id)
    ) {
      throw new BadRequestException(
        'Este fondo no es compatible con el layout seleccionado',
      );
    }

    if (allowedLayouts.length && !allowedLayouts.includes(layoutId)) {
      throw new BadRequestException(
        'Este layout no es compatible con el fondo seleccionado',
      );
    }
  }

  async updateThumbnail(roomId: string, userId: string, thumbnailUrl: string) {
    if (!thumbnailUrl || !/^https?:\/\//.test(thumbnailUrl)) {
      throw new BadRequestException('URL de miniatura inválida');
    }

    await this.assertPermission(
      roomId,
      userId,
      'canEditConfig',
      'actualizar la captura',
    );

    return this.prisma.room.update({
      where: { id: roomId },
      data: { thumbnailUrl },
      select: { id: true, thumbnailUrl: true, updatedAt: true },
    });
  }

  // Update genérico que faltaba: antes solo existían setBackground/
  // updateThumbnail/rateRoom sueltos, sin forma de tocar name/description/
  // category/tags/accessMode/isVipOnly/maxUsers después de crear la sala.
  // Pestaña "General"/"Acceso"/"Límites" de Editar Mundo.
  async updateRoom(
    roomId: string,
    callerUserId: string,
    patch: {
      name?: string;
      description?: string;
      category?: string;
      tags?: string[];
      accessMode?: 'PUBLIC' | 'PRIVATE_INVITE_ONLY' | 'PRIVATE_REQUEST';
      isVipOnly?: boolean;
      maxUsers?: number;
    },
  ) {
    await this.assertPermission(
      roomId,
      callerUserId,
      'canEditConfig',
      'editar la configuración de la sala',
    );

    const data: Record<string, unknown> = {};
    if (patch.name !== undefined) data.name = patch.name.trim();
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.category !== undefined) data.category = patch.category;
    if (patch.tags !== undefined) data.tags = patch.tags;
    if (patch.isVipOnly !== undefined) data.isVipOnly = patch.isVipOnly;
    if (patch.maxUsers !== undefined) data.maxUsers = patch.maxUsers;
    if (patch.accessMode !== undefined) {
      data.accessMode = patch.accessMode;
      // isPublic se mantiene en sync para no romper getPublicRooms/getMyRooms,
      // que todavía filtran por ese campo.
      data.isPublic = patch.accessMode === 'PUBLIC';
    }

    return this.prisma.room.update({ where: { id: roomId }, data });
  }

  // ====================== ILUMINACIÓN AMBIENTAL (PREMIUM) ======================

  // Estado actual para pintar la pestaña "Iluminación": intensidad, si
  // quien pregunta puede modificarla, y si la sala (según el Premium del
  // DUEÑO, no de quien pregunta) tiene la función desbloqueada.
  async getLightingStatus(roomId: string, callerUserId: string) {
    const { room, permissions } = await this.getEffectivePermissions(
      roomId,
      callerUserId,
    );

    const fullRoom = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { ambientLightIntensity: true },
    });

    const canUse = await this.backgroundsService.hasPremium(room.ownerId);

    return {
      ambientLightIntensity: fullRoom?.ambientLightIntensity ?? null,
      canModify: permissions.canModifyLighting,
      canUse,
      lockedReason: canUse ? null : 'PREMIUM_REQUIRED',
    };
  }

  // La iluminación se sigue el Premium del DUEÑO de la sala (es una función
  // de SU sala), no de quien la ajusta — así un rol personalizado con
  // canModifyLighting que el dueño le dio a un invitado también funciona.
  async setAmbientLight(
    roomId: string,
    callerUserId: string,
    intensity: number,
  ) {
    const { room } = await this.getEffectivePermissions(roomId, callerUserId);
    await this.assertPermission(
      roomId,
      callerUserId,
      'canModifyLighting',
      'modificar la iluminación',
    );

    const canUse = await this.backgroundsService.hasPremium(room.ownerId);
    if (!canUse) {
      return {
        id: room.id,
        ambientLightIntensity: null,
        canUse: false,
        lockedReason: 'PREMIUM_REQUIRED' as const,
      };
    }

    const clamped = Math.max(0, Math.min(100, Math.round(intensity)));

    const updated = await this.prisma.room.update({
      where: { id: roomId },
      data: { ambientLightIntensity: clamped },
      select: { id: true, ambientLightIntensity: true },
    });

    return { ...updated, canUse: true, lockedReason: null as string | null };
  }

  // ====================== LOBBY ======================

  async getOrCreateDefaultRoom() {
    let room = await this.prisma.room.findFirst({
      where: { name: 'Lobby' },
    });

    if (!room) {
      room = await this.prisma.room.create({
        data: {
          name: 'Lobby',
          description: 'Sala principal - Bienvenidos',
          isPublic: true,
          isVipOnly: false,
          maxUsers: 100,
          width: 800,
          height: 600,
          ownerId: '9fdba249-0533-4530-a9d8-86dfb294840c',
        },
      });
    }
    return room;
  }

  // ====================== BACKGROUND CRUD ======================
  async createBackground(data: {
    name: string;
    imageUrl: string;
    thumbnailUrl?: string;
  }) {
    return this.backgroundsService.create({
      name: data.name,
      imageUrl: data.imageUrl,
      previewUrl: data.thumbnailUrl,
    });
  }

  async deleteBackground(id: string) {
    return this.prisma.roomBackground.delete({ where: { id } });
  }

  // ====================== ROOM DETAILS PARA UI ======================
  async getRoomDetails(roomId: string) {
    return this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        owner: { select: { id: true, username: true } },
        background: true,
        _count: { select: { users: true, ratings: true } },
        ratings: { select: { value: true } },
      },
    });
  }
}
