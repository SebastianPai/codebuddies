import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { RoomsService } from '../../rooms/rooms.service';
import { LayoutsService } from '../../layouts/layouts.service';
import { RoomItemsService } from '../../room-items/room-items.service';

import { PlayerHandler } from './player.handler';
import { ParsedAvatar } from '../dto/avatar.dto';
import {
  AcceptInviteDto,
  ApproveJoinRequestDto,
  AssignCustomRoleDto,
  ChangeBackgroundDto,
  CreateCustomRoleDto,
  CreateRoomDto,
  DeclineInviteDto,
  DeleteCustomRoleDto,
  GetLightingStatusDto,
  GetRoomDetailsDto,
  GivePermissionDto,
  InviteDto,
  InviteFriendsSearchDto,
  JoinRequestsListDto,
  JoinRoomDto,
  KickGuestDto,
  ListCustomRolesDto,
  ListGuestsDto,
  ListRoomInvitesDto,
  RateRoomDto,
  RejectJoinRequestDto,
  RequestJoinDto,
  RevokeInviteDto,
  RevokePermissionDto,
  SetAmbientLightDto,
  UpdateCustomRoleDto,
  UpdateRoomDto,
  UpdateThumbnailDto,
} from '../dto/room.dto';

interface Player {
  id: string;
  x: number;
  y: number;
  room: string;
  username: string;
  avatar: ParsedAvatar;
  currentAnimation?: string;
  nameEffectId?: string | null;
}

@Injectable()
export class RoomHandler {
  private readonly logger = new Logger(RoomHandler.name);

  constructor(
    private readonly roomsService: RoomsService,
    private readonly layoutsService: LayoutsService,
    private readonly roomItemsService: RoomItemsService,
    private readonly playerHandler: PlayerHandler, // Para gestionar jugadores
  ) {}

  // ====================== CREAR SALA ======================
  async handleCreateRoom(socket: Socket, data: CreateRoomDto) {
    const userId = socket.data.user?.userId;
    if (!userId) {
      return socket.emit('room:error', { message: 'No autenticado' });
    }

    try {
      const room = await this.roomsService.createRoom(userId, data);
      socket.emit('room:created', room);
      this.logger.log(`Sala creada: ${room.name} por ${userId}`);
    } catch (err: any) {
      this.logger.error('Error creando sala', err);
      socket.emit('room:error', {
        message: err.message || 'No se pudo crear la sala',
      });
    }
  }

  // ====================== OBTENER SALAS PÚBLICAS ======================
  async handleGetPublicRooms(socket: Socket) {
    try {
      const rooms = await this.roomsService.getPublicRooms();
      socket.emit('publicRooms', rooms);
    } catch (err) {
      socket.emit('room:error', {
        message: 'No se pudieron obtener las salas públicas',
      });
    }
  }

  // ====================== MIS SALAS ======================
  async handleGetMyRooms(socket: Socket) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const rooms = await this.roomsService.getMyRooms(userId);
      socket.emit('myRooms', rooms);
    } catch (err) {
      socket.emit('room:error', {
        message: 'No se pudieron obtener tus salas',
      });
    }
  }

  // ====================== UNIRSE A SALA ======================
  async handleJoinRoom(server: Server, socket: Socket, data: JoinRoomDto) {
    const userId = socket.data.user?.userId;
    const roomId = data?.roomId;

    if (!userId) {
      return socket.emit('room:join:error', { reason: 'No autenticado' });
    }

    if (!roomId) {
      return socket.emit('room:join:error', { reason: 'ROOM_ID_REQUIRED' });
    }

    try {
      // Verificar permisos
      const canJoin = await this.roomsService.canJoinRoom(userId, roomId);
      if (!canJoin.allowed) {
        return socket.emit('room:join:error', { reason: canJoin.reason });
      }

      await this.roomsService.joinRoom(userId, roomId);

      const room = await this.roomsService.getRoomById(roomId);
      if (!room) {
        return socket.emit('room:error', { message: 'Sala no encontrada' });
      }

      // Unirse a la sala Socket.IO
      socket.join(roomId);
      socket.data.currentRoom = roomId;

      // Obtener o crear avatar
      const avatar =
        this.playerHandler.userAvatars[userId] ||
        (await this.playerHandler['ensureDefaultAvatar'].call(
          this.playerHandler,
          userId,
        )); // Temporal

      const player = this.playerHandler['buildPlayer'].call(
        this.playerHandler,
        socket,
        roomId,
        avatar,
      );
      this.playerHandler.players[socket.id] = player;

      // Obtener jugadores actuales en la sala
      const roomPlayers = Object.values(this.playerHandler.players).filter(
        (p: any) => p.room === roomId,
      );

      // Obtener items de la sala
      const roomItems = await this.roomItemsService.getRoomItems(roomId);

      // Permisos efectivos del usuario que entra — el cliente los necesita
      // para decidir qué mostrar (botones de mueble, pestañas de Editar
      // Mundo) sin tener que preguntarle al servidor acción por acción.
      const myPermissions = await this.roomsService.getMyPermissions(
        roomId,
        userId,
      );

      // Enviar información completa al usuario que se une
      socket.emit('room:joined', {
        room: {
          id: room.id,
          name: room.name,
          ownerId: room.ownerId,
          thumbnailUrl: room.thumbnailUrl,
          width: room.width,
          height: room.height,
          layout: room.layout,
          background: room.background,
          // Antes esto nunca viajaba en room:joined — un jugador que entraba
          // a una sala con iluminación ya configurada nunca la veía aplicada
          // hasta que (si tenía permiso) abría la pestaña de Iluminación.
          ambientLightIntensity: room.ambientLightIntensity ?? null,
        },
        players: roomPlayers,
        items: roomItems,
        myPermissions,
      });

      // Notificar a los demás jugadores
      socket.broadcast.to(roomId).emit('newPlayer', player);

      this.logger.log(`Usuario ${userId} se unió a la sala ${roomId}`);
    } catch (err: any) {
      this.logger.error(`Error al unirse a sala ${roomId}`, err);
      socket.emit('room:error', {
        message: err.message || 'Error al unirse a la sala',
      });
    }
  }

  // ====================== SALIR DE SALA ======================
  handleLeaveRoom(server: Server, socket: Socket) {
    const player = this.playerHandler.players[socket.id];
    if (!player) return;

    socket.leave(player.room);
    delete this.playerHandler.players[socket.id];
    socket.data.currentRoom = null;

    server.to(player.room).emit('playerDisconnected', socket.id);

    this.logger.log(`Usuario ${socket.id} abandonó la sala ${player.room}`);
  }

  // ====================== SOLICITUD PARA UNIRSE ======================
  async handleRequestJoin(socket: Socket, data: RequestJoinDto) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      await this.roomsService.requestJoin(userId, data.roomId);
      socket.emit('room:requestSent');
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  // ====================== SOLICITUDES PENDIENTES (DUEÑO) ======================
  async handleGetJoinRequests(socket: Socket, data: JoinRequestsListDto) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const requests = await this.roomsService.getPendingRequests(
        data.roomId,
        userId,
      );
      socket.emit('room:joinRequests', { roomId: data.roomId, requests });
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  async handleApproveJoinRequest(socket: Socket, data: ApproveJoinRequestDto) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const request = await this.roomsService.approveRequest(
        data.requestId,
        userId,
      );
      socket.emit('room:joinRequest:approved', request);
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  async handleRejectJoinRequest(socket: Socket, data: RejectJoinRequestDto) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const request = await this.roomsService.rejectRequest(
        data.requestId,
        userId,
      );
      socket.emit('room:joinRequest:rejected', request);
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  // ====================== INVITAR USUARIO ======================
  async handleInvite(socket: Socket, data: InviteDto) {
    const fromUserId = socket.data.user?.userId;
    if (!fromUserId) return;

    try {
      await this.roomsService.inviteUser(
        data.roomId,
        fromUserId,
        data.toUserId,
      );
      socket.emit('room:inviteSent');
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  // ====================== RESPONDER UNA INVITACIÓN (lado del invitado) ======================
  async handleAcceptInvite(socket: Socket, data: AcceptInviteDto) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const invite = await this.roomsService.acceptInvite(data.inviteId, userId);
      socket.emit('room:invite:accepted', invite);
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  async handleDeclineInvite(socket: Socket, data: DeclineInviteDto) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const invite = await this.roomsService.declineInvite(data.inviteId, userId);
      socket.emit('room:invite:declined', invite);
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  async handleFriendsSearch(socket: Socket, data: InviteFriendsSearchDto) {
    const callerUserId = socket.data.user?.userId;
    if (!callerUserId) return;

    try {
      const friends = await this.roomsService.listInvitableFriends(
        data.roomId,
        callerUserId,
        data.query,
      );
      socket.emit('room:invite:friends-search:result', {
        roomId: data.roomId,
        friends,
      });
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  // ====================== INVITADOS Y PERMISOS OTORGADOS ======================
  async handleListGuests(socket: Socket, data: ListGuestsDto) {
    const callerUserId = socket.data.user?.userId;
    if (!callerUserId) return;

    try {
      const guests = await this.roomsService.listGuests(
        data.roomId,
        callerUserId,
      );
      socket.emit('room:guests:list', { roomId: data.roomId, guests });
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  async handleListInvites(socket: Socket, data: ListRoomInvitesDto) {
    const callerUserId = socket.data.user?.userId;
    if (!callerUserId) return;

    try {
      const invites = await this.roomsService.listInvites(
        data.roomId,
        callerUserId,
      );
      socket.emit('room:invites:list', { roomId: data.roomId, invites });
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  async handleRevokeInvite(socket: Socket, data: RevokeInviteDto) {
    const callerUserId = socket.data.user?.userId;
    if (!callerUserId) return;

    try {
      const invite = await this.roomsService.revokeInvite(
        data.inviteId,
        callerUserId,
      );
      socket.emit('room:invite:revoked', invite);
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  async handleRevokePermission(socket: Socket, data: RevokePermissionDto) {
    const callerUserId = socket.data.user?.userId;
    if (!callerUserId) return;

    try {
      await this.roomsService.revokePermission(
        data.roomId,
        data.targetUserId,
        callerUserId,
      );
      socket.emit('room:permission:revoked', {
        roomId: data.roomId,
        userId: data.targetUserId,
      });
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  // Expulsa al invitado AHORA de la sala (si está conectado, fuerza a su
  // socket a salir de la room de Socket.IO y avisa a los demás como si se
  // hubiera desconectado) — no revoca su invitación ni sus permisos.
  async handleKickGuest(server: Server, socket: Socket, data: KickGuestDto) {
    const callerUserId = socket.data.user?.userId;
    if (!callerUserId) return;

    try {
      await this.roomsService.kickGuest(
        data.roomId,
        data.targetUserId,
        callerUserId,
      );

      const roomSockets = await server.in(data.roomId).fetchSockets();
      const targetSocket = roomSockets.find(
        (remoteSocket) => remoteSocket.data.user?.userId === data.targetUserId,
      );

      if (targetSocket) {
        targetSocket.leave(data.roomId);
        targetSocket.data.currentRoom = null;
        delete this.playerHandler.players[targetSocket.id];
        targetSocket.emit('room:kicked', { roomId: data.roomId });
        server.to(data.roomId).emit('playerDisconnected', targetSocket.id);
      }

      socket.emit('room:guest:kicked', {
        roomId: data.roomId,
        userId: data.targetUserId,
      });
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  // ====================== DAR PERMISOS ======================
  async handleGivePermission(socket: Socket, data: GivePermissionDto) {
    const fromUserId = socket.data.user?.userId;
    if (!fromUserId) return;

    try {
      await this.roomsService.givePermission(
        data.roomId,
        data.userId,
        data.role,
        fromUserId,
      );
      socket.emit('room:permissionUpdated');
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  // ====================== CAMBIAR FONDO ======================
  async handleChangeBackground(
    server: Server,
    socket: Socket,
    data: ChangeBackgroundDto,
  ) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const room = await this.roomsService.setBackground(
        data.roomId,
        data.backgroundId,
        userId,
      );
      server.to(data.roomId).emit('room:backgroundChanged', {
        backgroundId: data.backgroundId,
        background: room.background,
      });
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  async handleUpdateThumbnail(
    server: Server,
    socket: Socket,
    data: UpdateThumbnailDto,
  ) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const room = await this.roomsService.updateThumbnail(
        data.roomId,
        userId,
        data.thumbnailUrl,
      );

      server.to(data.roomId).emit('room:thumbnailUpdated', room);
    } catch (err: any) {
      this.logger.warn(`No se pudo actualizar miniatura: ${err.message}`);
    }
  }

  // ====================== EDITAR MUNDO (General/Acceso/Límites) ======================
  async handleUpdateRoom(server: Server, socket: Socket, data: UpdateRoomDto) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const { roomId, ...patch } = data;
      const room = await this.roomsService.updateRoom(roomId, userId, patch);
      server.to(roomId).emit('room:updated', room);
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  // ====================== ILUMINACIÓN AMBIENTAL ======================
  async handleGetLightingStatus(socket: Socket, data: GetLightingStatusDto) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const status = await this.roomsService.getLightingStatus(
        data.roomId,
        userId,
      );
      socket.emit('room:lighting:status', { roomId: data.roomId, ...status });
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  async handleSetAmbientLight(
    server: Server,
    socket: Socket,
    data: SetAmbientLightDto,
  ) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const result = await this.roomsService.setAmbientLight(
        data.roomId,
        userId,
        data.intensity,
      );

      if (!result.canUse) {
        socket.emit('room:lighting:status', { roomId: data.roomId, ...result });
        return;
      }

      server.to(data.roomId).emit('room:lighting:changed', {
        roomId: data.roomId,
        ambientLightIntensity: result.ambientLightIntensity,
      });
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  // ====================== CALIFICAR SALA ======================
  async handleRateRoom(server: Server, socket: Socket, data: RateRoomDto) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const updated = await this.roomsService.rateRoom(
        userId,
        data.roomId,
        data.value,
      );
      server.to(data.roomId).emit('room:ratingUpdated', updated);
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  // ====================== DETALLES DE SALA ======================
  async handleGetRoomDetails(socket: Socket, data: GetRoomDetailsDto) {
    try {
      const room = await this.roomsService.getRoomDetails(data.roomId);
      socket.emit('room:details', room);
    } catch (err) {
      socket.emit('room:error', {
        message: 'No se pudieron obtener los detalles',
      });
    }
  }

  // ====================== ROLES PERSONALIZADOS ======================
  async handleListCustomRoles(socket: Socket, data: ListCustomRolesDto) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const roles = await this.roomsService.listCustomRoles(
        data.roomId,
        userId,
      );
      socket.emit('room:role:list', { roomId: data.roomId, roles });
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  async handleCreateCustomRole(socket: Socket, data: CreateCustomRoleDto) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const { roomId, ...flags } = data;
      const role = await this.roomsService.createCustomRole(
        roomId,
        userId,
        flags,
      );
      socket.emit('room:role:created', role);
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  async handleUpdateCustomRole(socket: Socket, data: UpdateCustomRoleDto) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const { roleId, ...flags } = data;
      const role = await this.roomsService.updateCustomRole(
        roleId,
        userId,
        flags,
      );
      socket.emit('room:role:updated', role);
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  async handleDeleteCustomRole(socket: Socket, data: DeleteCustomRoleDto) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const role = await this.roomsService.deleteCustomRole(
        data.roleId,
        userId,
      );
      socket.emit('room:role:deleted', { id: role.id, roomId: role.roomId });
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  async handleAssignCustomRole(socket: Socket, data: AssignCustomRoleDto) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const permission = await this.roomsService.assignCustomRole(
        data.roomId,
        data.targetUserId,
        data.roleId ?? null,
        userId,
      );
      socket.emit('room:role:assigned', permission);
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  }

  // ====================== FONDOS ======================
  async handleGetBackgrounds(socket: Socket) {
    try {
      const userId = socket.data.user?.userId;
      if (!userId)
        return socket.emit('room:error', { message: 'No autenticado' });
      const backgrounds = await this.roomsService.getBackgrounds(userId);
      socket.emit(
        'backgrounds:list',
        backgrounds.filter((background: any) => background.canUse),
      );
    } catch (err) {
      socket.emit('room:error', {
        message: 'No se pudieron obtener los fondos',
      });
    }
  }

  // ====================== LAYOUTS ======================
  async handleGetLayouts(socket: Socket) {
    try {
      const layouts = await this.layoutsService.getLayouts();
      socket.emit('layouts:list', layouts);
    } catch (err) {
      socket.emit('room:error', {
        message: 'No se pudieron obtener los layouts',
      });
    }
  }
}
