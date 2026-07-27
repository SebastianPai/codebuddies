import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { RoomsService } from '../../rooms/rooms.service';
import { LayoutsService } from '../../layouts/layouts.service';
import { RoomItemsService } from '../../room-items/room-items.service';

import { PlayerHandler } from './player.handler';
import { ParsedAvatar } from '../dto/avatar.dto';
import { createPlayer } from '../../../../game/engine';

interface Player {
  id: string;
  x: number;
  y: number;
  room: string;
  username: string;
  avatar: ParsedAvatar;
  currentAnimation?: string;
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
  async handleCreateRoom(socket: Socket, data: any) {
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
  async handleJoinRoom(
    server: Server,
    socket: Socket,
    data: { roomId: string },
  ) {
    const userId = socket.data.user?.userId;
    const roomId =
      typeof data === 'string'
        ? data
        : typeof data === 'object'
          ? data?.roomId
          : undefined;

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

      // Crear jugador en el motor del juego
      createPlayer(socket.id); // Si usas engine

      // Obtener jugadores actuales en la sala
      const roomPlayers = Object.values(this.playerHandler.players).filter(
        (p: any) => p.room === roomId,
      );

      // Obtener items de la sala
      const roomItems = await this.roomItemsService.getRoomItems(roomId);

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
        },
        players: roomPlayers,
        items: roomItems,
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
  async handleRequestJoin(socket: Socket, data: { roomId: string }) {
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
  async handleGetJoinRequests(socket: Socket, data: { roomId: string }) {
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

  async handleApproveJoinRequest(socket: Socket, data: { requestId: string }) {
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

  async handleRejectJoinRequest(socket: Socket, data: { requestId: string }) {
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
  async handleInvite(
    socket: Socket,
    data: { roomId: string; toUserId: string },
  ) {
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

  // ====================== DAR PERMISOS ======================
  async handleGivePermission(
    socket: Socket,
    data: {
      roomId: string;
      userId: string;
      role: 'ADMIN' | 'EDITOR' | 'VISITOR';
    },
  ) {
    const fromUserId = socket.data.user?.userId;
    if (!fromUserId) return;

    try {
      await this.roomsService.givePermission(
        data.roomId,
        data.userId,
        data.role,
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
    data: { roomId: string; backgroundId: string },
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
    data: { roomId: string; thumbnailUrl: string },
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

  // ====================== CALIFICAR SALA ======================
  async handleRateRoom(
    server: Server,
    socket: Socket,
    data: { roomId: string; value: number },
  ) {
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
  async handleGetRoomDetails(socket: Socket, data: { roomId: string }) {
    try {
      const room = await this.roomsService.getRoomDetails(data.roomId);
      socket.emit('room:details', room);
    } catch (err) {
      socket.emit('room:error', {
        message: 'No se pudieron obtener los detalles',
      });
    }
  }

  // ====================== FONDOS ======================
  async handleGetBackgrounds(socket: Socket) {
    try {
      const userId = socket.data.user?.userId;
      if (!userId) return socket.emit('room:error', { message: 'No autenticado' });
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
