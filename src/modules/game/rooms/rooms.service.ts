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

type CanJoinRoomResult =
  | { allowed: false; reason: string }
  | { allowed: true; room: any };

@Injectable()
export class RoomsService {
  constructor(
    private prisma: PrismaService,
    private backgroundsService: BackgroundsService,
    private notificationsService: NotificationsService,
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
    await this.assertLayoutBackgroundCompatible(data.layoutId || null, background);

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
        background: { select: { name: true, imageUrl: true, previewUrl: true } },
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
        background: { select: { name: true, imageUrl: true, previewUrl: true } },
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
        background: { select: { name: true, imageUrl: true, previewUrl: true } },
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
    if (room.isPublic) return { allowed: true, room };

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
        metadata: { roomId: room.id, requestId: request.id, requesterId: userId },
      });
    }

    return request;
  }

  async getPendingRequests(roomId: string, callerUserId: string) {
    await this.assertCanEditRoom(roomId, callerUserId, 'ver las solicitudes');

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
    await this.assertCanEditRoom(request.room.id, callerUserId, 'aprobar solicitudes');

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
    await this.assertCanEditRoom(request.room.id, callerUserId, 'rechazar solicitudes');

    return this.prisma.roomJoinRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });
  }

  async inviteUser(roomId: string, fromUserId: string, toUserId: string) {
    return this.prisma.roomInvite.upsert({
      where: { roomId_toUserId: { roomId, toUserId } },
      update: { status: 'PENDING' },
      create: {
        roomId,
        fromUserId,
        toUserId,
        status: 'PENDING',
      },
    });
  }

  async givePermission(
    roomId: string,
    userId: string,
    role: 'ADMIN' | 'EDITOR' | 'VISITOR',
  ) {
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
    await this.assertCanEditRoom(roomId, userId, 'cambiar el fondo');

    const background = await this.backgroundsService.assertCanUse(
      userId,
      backgroundId,
    );
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { layoutId: true },
    });
    await this.assertLayoutBackgroundCompatible(room?.layoutId || null, background);

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
    const allowedBackgrounds = Array.isArray(layoutConfig.compatibleBackgroundIds)
      ? layoutConfig.compatibleBackgroundIds
      : [];
    const backgroundMetadata = (background.metadata ?? {}) as any;
    const allowedLayouts = Array.isArray(backgroundMetadata.compatibleLayoutIds)
      ? backgroundMetadata.compatibleLayoutIds
      : [];

    if (allowedBackgrounds.length && !allowedBackgrounds.includes(background.id)) {
      throw new BadRequestException('Este fondo no es compatible con el layout seleccionado');
    }

    if (allowedLayouts.length && !allowedLayouts.includes(layoutId)) {
      throw new BadRequestException('Este layout no es compatible con el fondo seleccionado');
    }
  }

  async updateThumbnail(roomId: string, userId: string, thumbnailUrl: string) {
    if (!thumbnailUrl || !/^https?:\/\//.test(thumbnailUrl)) {
      throw new BadRequestException('URL de miniatura inválida');
    }

    await this.assertCanEditRoom(roomId, userId, 'actualizar la captura');

    return this.prisma.room.update({
      where: { id: roomId },
      data: { thumbnailUrl },
      select: { id: true, thumbnailUrl: true, updatedAt: true },
    });
  }

  private async assertCanEditRoom(
    roomId: string,
    userId: string,
    action: string,
  ) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Sala no encontrada');

    if (room.ownerId === userId) return room;

    const perm = await this.prisma.roomPermission.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    const canEdit = perm?.role === 'ADMIN' || perm?.role === 'EDITOR';

    if (!canEdit) {
      throw new ForbiddenException(`No tienes permiso para ${action}`);
    }

    return room;
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
