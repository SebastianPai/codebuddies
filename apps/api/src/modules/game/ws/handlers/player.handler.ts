import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

import { AvatarService } from '../../avatar/avatar.service';
import { PlayerService } from '../../player/player.service';
import { EnergyService } from '../../energy/energy.service';

import { ParsedAvatar } from '../dto/avatar.dto';
import {
  ChatMessageDto,
  PlayerAnimationChangeDto,
  PlayerMoveDto,
  PlayerReactionDto,
} from '../dto/player.dto';
import { GetItemSpritesDto } from '../dto/item-sprites.dto';
import { JWT_SECRET } from '../../../../config/env';

interface Player {
  id: string;
  x: number;
  y: number;
  room: string;
  username: string;
  avatar: ParsedAvatar;
  currentAnimation?: string;
  lastMoveAt?: number;
}

// Límite generoso de velocidad (px/s) para el anti-teleport de handlePlayerMove:
// bastante por encima de la velocidad real del cliente (180px/s en LobbyScene)
// para absorber jitter de red, pero suficiente para bloquear un salto instantáneo
// de un extremo a otro del mapa.
const MAX_PLAYER_SPEED_PX_PER_SEC = 600;

@Injectable()
export class PlayerHandler {
  private readonly logger = new Logger(PlayerHandler.name);

  // Estado compartido (se moverá a un servicio más adelante)
  private userToSocketId: Map<string, string> = new Map();
  private socketToUserId: Map<string, string> = new Map();
  // Antes el JWT solo se validaba una vez, al conectar: una sesión WS podía
  // sobrevivir hasta ~24h a su propio token ya vencido (la duración real del
  // token). Este timer desconecta el socket exactamente cuando expira,
  // en vez de confiar en que el cliente reconecte por su cuenta.
  private sessionExpiryTimers: Map<string, NodeJS.Timeout> = new Map();
  public userAvatars: Record<string, ParsedAvatar> = {};
  public players: Record<string, Player> = {}; // público para que el gateway pueda acceder si es necesario

  constructor(
    private readonly jwtService: JwtService,
    private readonly avatarService: AvatarService,
    private readonly playerService: PlayerService,
    private readonly energyService: EnergyService,
  ) {}

  private readCookie(cookies: string | undefined, name: string) {
    if (!cookies) return undefined;

    const cookie = cookies
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`));

    return cookie
      ? decodeURIComponent(cookie.split('=').slice(1).join('='))
      : undefined;
  }

  // ====================== BUILDER ======================
  private buildPlayer(
    socket: Socket,
    room: string,
    avatar: ParsedAvatar,
  ): Player {
    return {
      id: socket.id,
      x: 100,
      y: 100,
      room,
      username: socket.data.user.username || 'Jugador',
      avatar,
      currentAnimation: 'idle',
    };
  }

  // ====================== PARSE AVATAR ======================
  parseAvatar(dbAvatar: any): ParsedAvatar {
    this.logger.debug('[parseAvatar] Iniciando parseo', {
      hasAvatar: !!dbAvatar,
    });

    const allSlotNames = [
      'BODY',
      'HEAD',
      'HAIR',
      'EYES',
      'SHIRT',
      'LEGS',
      'SHOES',
      'LEFT_ARM',
      'RIGHT_ARM',
      'ACCESSORY_HEAD',
      'ACCESSORY_FACE',
      'ACCESSORY_BACK',
      'ACCESSORY_LEFT',
      'ACCESSORY_RIGHT',
    ] as const;

    const slotMap = new Map<string, any>();

    const rawSlots = Array.isArray(dbAvatar?.slots) ? dbAvatar.slots : [];

    rawSlots.forEach((slotEntry: any) => {
      const normalized = slotEntry?.slot?.toUpperCase?.();
      if (normalized) slotMap.set(normalized, slotEntry);
    });

    const parsedSlots = allSlotNames.map((slotName) => {
      const entry = slotMap.get(slotName) || {
        itemId: null,
        item: null,
        color: null,
      };
      const item = entry.item;

      return {
        slot: slotName,
        itemId: entry.itemId ?? null,
        imageUrl: item?.imageUrl ?? null,
        layer: item?.layer ?? 0,
        color: entry.color ?? null,
        colorable: item?.colorable ?? false,
        sprites: Array.isArray(item?.sprites)
          ? item.sprites.map((s: any) => ({
              imageUrl: s.imageUrl || '',
              frameWidth: Number(s.frameWidth) || 32,
              frameHeight: Number(s.frameHeight) || 32,
              framesCount: Number(s.framesCount) || 16,
              rows: 4,
              animation: {
                speed: Number(s.animation?.speed) || 6,
                loop: s.animation?.loop ?? true,
              },
            }))
          : [],
      };
    });

    return {
      slots: parsedSlots,
      skinColor: Number(dbAvatar?.skinColor) || 0xffffff,
    };
  }

  // ====================== AVATAR POR DEFECTO ======================
  private async ensureDefaultAvatar(userId: string): Promise<ParsedAvatar> {
    let dbAvatar: any = null;

    try {
      dbAvatar = await this.avatarService.getUserAvatar(userId);
    } catch (err) {
      this.logger.warn(`Avatar no encontrado para ${userId}`);
    }

    if (!dbAvatar) {
      this.logger.log(`Creando avatar default para ${userId}`);
      try {
        await this.avatarService.updateAvatar(userId, {
          skinColor: 0xffffff,
          slots: [
            { slot: 'BODY', itemId: '1' },
            { slot: 'HEAD', itemId: '1' },
            { slot: 'HAIR', itemId: '1' },
            { slot: 'EYES', itemId: '1' },
            { slot: 'SHIRT', itemId: '1' },
            { slot: 'LEGS', itemId: '1' },
            { slot: 'SHOES', itemId: '1' },
            { slot: 'LEFT_ARM', itemId: '0' },
            { slot: 'RIGHT_ARM', itemId: '0' },
            { slot: 'ACCESSORY_HEAD', itemId: '0' },
            { slot: 'ACCESSORY_FACE', itemId: '0' },
            { slot: 'ACCESSORY_BACK', itemId: '0' },
            { slot: 'ACCESSORY_LEFT', itemId: '0' },
            { slot: 'ACCESSORY_RIGHT', itemId: '0' },
          ],
        });
        dbAvatar = await this.avatarService.getUserAvatar(userId);
      } catch (err) {
        this.logger.error('Error creando avatar default', err);
        dbAvatar = { skinColor: 0xffffff, slots: [] };
      }
    }

    const parsed = this.parseAvatar(dbAvatar);
    this.userAvatars[userId] = parsed;
    return parsed;
  }

  // ====================== CONEXIÓN ======================
  async handleConnection(socket: Socket) {
    try {
      const cookies = socket.handshake.headers.cookie;
      const token =
        this.readCookie(cookies, 'access_token') ||
        this.readCookie(cookies, 'codebuddies_token') ||
        socket.handshake.auth?.token;

      if (!token) {
        this.logger.warn(`Conexión sin token: ${socket.id}`);
        socket.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: JWT_SECRET,
      });

      socket.data.user = {
        userId: payload.sub || payload.userId,
        username: payload.username,
      };

      const userId = socket.data.user.userId;
      if (!userId) {
        socket.disconnect(true);
        return;
      }

      if (typeof payload.exp === 'number') {
        const msUntilExpiry = payload.exp * 1000 - Date.now();
        if (msUntilExpiry <= 0) {
          socket.disconnect(true);
          return;
        }
        // Node's setTimeout hace overflow (dispara de inmediato) con delays
        // mayores a ~24.8 días (límite de un int32) — un clamp defensivo por
        // si algún día el token dura más que eso.
        const delay = Math.min(msUntilExpiry, 2_147_483_647);
        const timer = setTimeout(() => {
          this.logger.log(`Token expirado, desconectando a ${socket.id}`);
          socket.disconnect(true);
        }, delay);
        this.sessionExpiryTimers.set(socket.id, timer);
      }

      // Evitar doble conexión
      if (this.userToSocketId.has(userId)) {
        const oldSocketId = this.userToSocketId.get(userId)!;
        const oldSocket = socket.nsp.sockets.get(oldSocketId);
        if (oldSocket?.connected) oldSocket.disconnect(true);
      }

      const avatar = await this.ensureDefaultAvatar(userId);

      this.userToSocketId.set(userId, socket.id);
      this.socketToUserId.set(socket.id, userId);

      this.logger.log(
        `✅ Usuario conectado: ${socket.data.user.username} (${socket.id})`,
      );
    } catch (err: any) {
      this.logger.error(
        `Error en handleConnection ${socket.id}: ${err.message}`,
      );
      socket.disconnect(true);
    }
  }

  // ====================== DESCONEXIÓN ======================
  handleDisconnect(socket: Socket) {
    const expiryTimer = this.sessionExpiryTimers.get(socket.id);
    if (expiryTimer) {
      clearTimeout(expiryTimer);
      this.sessionExpiryTimers.delete(socket.id);
    }

    const userId = this.socketToUserId.get(socket.id);
    if (userId) {
      this.userToSocketId.delete(userId);
      this.socketToUserId.delete(socket.id);
    }

    const player = this.players[socket.id];
    if (player) {
      delete this.players[socket.id];
      socket.to(player.room).emit('playerDisconnected', socket.id);
    }

    this.logger.log(`Usuario desconectado: ${socket.id}`);
  }

  // ====================== CHAT ======================
  handleChat(server: Server, socket: Socket, data: ChatMessageDto) {
    const player = this.players[socket.id];
    if (!player) return;

    server.to(player.room).emit('playerChat', {
      playerId: socket.id,
      username: player.username,
      message: data.message,
      chatBubbleThemeId: data.chatBubbleThemeId ?? null,
    });
  }

  // ====================== REACCIÓN RÁPIDA ======================
  handleReaction(server: Server, socket: Socket, data: PlayerReactionDto) {
    const player = this.players[socket.id];
    if (!player || !data?.reaction) return;

    server.to(player.room).emit('playerReaction', {
      playerId: socket.id,
      username: player.username,
      reaction: data.reaction,
      chatBubbleThemeId: data.chatBubbleThemeId ?? null,
    });
  }

  // ====================== MOVIMIENTO ======================
  // Antes se asignaba data.x/data.y directo, sin ningún límite: un cliente
  // (o un bot) podía "teletransportarse" a cualquier punto del mapa en un
  // solo mensaje. Ahora se acota la distancia contra el tiempo real
  // transcurrido desde el último move aceptado: si implica una velocidad
  // mayor a la físicamente posible, se recorta el desplazamiento en vez de
  // rechazarlo (evita que un lag spike legítimo se sienta como un error).
  handlePlayerMove(server: Server, socket: Socket, data: PlayerMoveDto) {
    const player = this.players[socket.id];
    if (!player) return;

    const now = Date.now();
    let nextX = data.x;
    let nextY = data.y;

    if (player.lastMoveAt) {
      const elapsedSeconds = (now - player.lastMoveAt) / 1000;
      const dx = data.x - player.x;
      const dy = data.y - player.y;
      const dist = Math.hypot(dx, dy);
      const maxDist = Math.max(0, MAX_PLAYER_SPEED_PX_PER_SEC * elapsedSeconds);

      if (dist > maxDist) {
        const ratio = dist === 0 ? 0 : maxDist / dist;
        nextX = player.x + dx * ratio;
        nextY = player.y + dy * ratio;
      }
    }

    player.x = nextX;
    player.y = nextY;
    player.lastMoveAt = now;
    player.currentAnimation = data.isMoving ? `walk_${data.direction}` : 'idle';

    server.to(player.room).emit('playerMoved', {
      id: socket.id,
      x: player.x,
      y: player.y,
      direction: data.direction,
      animation: player.currentAnimation,
      isMoving: data.isMoving,
    });
  }

  // ====================== ANIMACIÓN ======================
  handleChangeAnimation(
    server: Server,
    socket: Socket,
    data: PlayerAnimationChangeDto,
  ) {
    const player = this.players[socket.id];
    if (!player) return;

    player.currentAnimation = data.animationName;

    server.to(player.room).emit('playerAnimationChanged', {
      playerId: socket.id,
      animationName: data.animationName,
    });
  }

  // ====================== STATS ======================
  async handleGetStats(socket: Socket) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const [stats, energy] = await Promise.all([
        this.playerService.getStats(userId),
        this.energyService.getStatus(userId),
      ]);
      socket.emit('player:stats', { ...stats, energy });
    } catch (err) {
      this.logger.error('Error obteniendo stats', err);
      socket.emit('player:stats:error', {
        message: 'No se pudieron cargar las estadísticas',
      });
    }
  }

  // ====================== ITEM SPRITES ======================
  async handleGetItemSprites(socket: Socket, data: GetItemSpritesDto) {
    // Por ahora lo dejamos aquí, luego podemos moverlo a un handler separado
    // (necesitaríamos inyectar ItemSpritesService)
    socket.emit('itemSprites:error', { message: 'Handler en construcción' });
  }

  // Getters útiles
  getPlayer(socketId: string) {
    return this.players[socketId];
  }

  getUserId(socketId: string): string | undefined {
    return this.socketToUserId.get(socketId);
  }
}
