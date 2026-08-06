import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { AvatarService } from '../../avatar/avatar.service';
import { PlayerHandler } from './player.handler';
import { EquipItemDto, ParsedAvatar, UpdateAvatarDto } from '../dto/avatar.dto';

@Injectable()
export class AvatarHandler {
  private readonly logger = new Logger(AvatarHandler.name);

  constructor(
    private readonly avatarService: AvatarService,
    private readonly playerHandler: PlayerHandler, // Para acceder a players y parseAvatar
  ) {}

  // ====================== PARSE AVATAR (Compartido) ======================
  parseAvatar(dbAvatar: any): ParsedAvatar {
    this.logger.debug('[parseAvatar] Iniciando parseo de avatar');

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
      if (normalized) {
        slotMap.set(normalized, slotEntry);
      }
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

    const result: ParsedAvatar = {
      slots: parsedSlots,
      skinColor: Number(dbAvatar?.skinColor) || 0xffffff,
    };

    this.logger.debug(
      `Avatar parseado - Slots con item: ${result.slots.filter((s) => s.itemId).length}`,
    );
    return result;
  }

  // ====================== EQUIPAR ITEM ======================
  async handleEquipItem(server: Server, socket: Socket, data: EquipItemDto) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const updatedAvatarDb = await this.avatarService.equipItem(
        userId,
        data.slot,
        data.itemId ?? null,
        data.color,
      );

      const parsedAvatar = this.parseAvatar(updatedAvatarDb);

      // Actualizar en memoria
      this.playerHandler.userAvatars[userId] = parsedAvatar;

      const player = this.playerHandler.getPlayer(socket.id);
      if (player) {
        player.avatar = parsedAvatar;
      }

      // Notificar a todos en la sala
      const room = player?.room || socket.data.currentRoom;
      if (room) {
        server.to(room).emit('playerAvatarUpdated', {
          playerId: socket.id,
          avatar: parsedAvatar,
        });
      } else {
        socket.emit('playerAvatarUpdated', {
          playerId: socket.id,
          avatar: parsedAvatar,
        });
      }

      this.logger.log(`Avatar actualizado para ${userId} - Slot: ${data.slot}`);
    } catch (err: any) {
      this.logger.error(`Error al equipar item: ${err.message}`);
      socket.emit('avatar:equip:error', {
        message: err.message || 'No se pudo equipar el item',
      });
    }
  }

  // ====================== OBTENER AVATAR ACTUAL ======================
  async handleGetCurrentAvatar(socket: Socket) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const dbAvatar = await this.avatarService.getUserAvatar(userId);
      const parsedAvatar = this.parseAvatar(dbAvatar);

      // Guardar en caché
      this.playerHandler.userAvatars[userId] = parsedAvatar;

      socket.emit('avatar:current', parsedAvatar);
    } catch (err) {
      this.logger.warn(`Error obteniendo avatar para ${userId}`, err);
      socket.emit('avatar:get:error', {
        message: 'No se pudo cargar el avatar',
      });
    }
  }

  // ====================== ACTUALIZAR AVATAR COMPLETO ======================
  async handleUpdateAvatar(
    server: Server,
    socket: Socket,
    avatarData: UpdateAvatarDto,
  ) {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    try {
      const updatedAvatarDb = await this.avatarService.updateAvatar(
        userId,
        avatarData,
      );
      const parsedAvatar = this.parseAvatar(updatedAvatarDb);

      this.playerHandler.userAvatars[userId] = parsedAvatar;

      const player = this.playerHandler.getPlayer(socket.id);
      if (player) {
        player.avatar = parsedAvatar;
      }

      const room = player?.room;
      if (room) {
        server.to(room).emit('playerAvatarUpdated', {
          playerId: socket.id,
          avatar: parsedAvatar,
        });
      } else {
        socket.emit('playerAvatarUpdated', {
          playerId: socket.id,
          avatar: parsedAvatar,
        });
      }
    } catch (err: any) {
      this.logger.error(`Error actualizando avatar completo: ${err.message}`);
      socket.emit('avatar:update:error', {
        message: 'No se pudo actualizar el avatar',
      });
    }
  }

  // ====================== ENSURE DEFAULT (Útil para PlayerHandler) ======================
  async ensureDefaultAvatar(userId: string): Promise<ParsedAvatar> {
    return this.playerHandler['ensureDefaultAvatar'].call(
      this.playerHandler,
      userId,
    );
    // Nota: Esta es una llamada interna temporal. Más adelante moveremos esta lógica a este handler.
  }
}
