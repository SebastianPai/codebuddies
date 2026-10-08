import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { RoomItemsService } from '../../room-items/room-items.service';
import {
  ClearRoomDto,
  InteractItemDto,
  MoveItemDto,
  PaintAllSurfaceDto,
  PaintSurfaceDto,
  PlaceItemDto,
  RemoveItemDto,
  RotateItemDto,
} from '../dto/room-items.dto';

/**
 * Ventana mínima entre dos interacciones del MISMO socket sobre el MISMO
 * objeto. No es la protección real contra el click spam — esa la da
 * `isTransitionInFlight()` sobre el dato persistido, que no se puede evadir
 * desde el cliente — sino un freno para no convertir 20 clicks seguidos en 20
 * consultas a la base.
 *
 * Deliberadamente corto: tiene que dejar pasar un doble click legítimo sobre
 * una bañera (abrir el agua y cerrarla), y quien decide si la interacción
 * procede es siempre el servicio.
 */
const INTERACT_THROTTLE_MS = 120;

@Injectable()
export class RoomItemsHandler {
  private readonly logger = new Logger(RoomItemsHandler.name);

  constructor(private readonly roomItemsService: RoomItemsService) {}

  /**
   * Último instante de interacción por socket y objeto.
   *
   * Vive en el propio `socket.data`, no en un Map del handler: así se va solo
   * cuando el socket se desconecta y no hay que acordarse de limpiar nada (un
   * Map a nivel de servicio sería una fuga de memoria proporcional a cuánta
   * gente pasó por el mundo).
   */
  private isThrottled(socket: Socket, roomItemId: string): boolean {
    const now = Date.now();
    const seen: Record<string, number> = (socket.data.lastInteractAt ??= {});

    if (now - (seen[roomItemId] ?? 0) < INTERACT_THROTTLE_MS) return true;

    seen[roomItemId] = now;
    return false;
  }

  // ====================== COLOCAR ITEM ======================
  async placeItem(
    server: Server,
    socket: Socket,
    userId: string,
    data: PlaceItemDto,
  ) {
    try {
      const roomItem = await this.roomItemsService.placeItem(
        userId,
        data.roomId,
        data.itemId,
        data.x,
        data.y,
        data.rotation ?? 0,
        data.wallSide,
        data.wallOffset,
      );

      // Notificar a todos en la sala
      server.to(data.roomId).emit('room:item:placed', roomItem);

      // Refrescar inventario del usuario
      socket.emit('inventory:refresh');

      this.logger.log(
        `Item ${data.itemId} colocado en sala ${data.roomId} por ${userId}`,
      );
    } catch (err: any) {
      this.logger.error(`Error al colocar item en sala`, err);
      socket.emit('room:item:error', {
        message: err.message || 'No se pudo colocar el item',
      });
    }
  }

  // ====================== MOVER ITEM ======================
  async moveItem(
    server: Server,
    socket: Socket,
    userId: string,
    data: MoveItemDto,
  ) {
    try {
      const updatedItem = await this.roomItemsService.moveItem(
        userId,
        data.roomItemId,
        data.x,
        data.y,
        data.rotation,
      );

      server.to(updatedItem.roomId).emit('room:item:moved', updatedItem);
    } catch (err: any) {
      this.logger.error(`Error moviendo item ${data.roomItemId}`, err);
      socket.emit('room:item:error', {
        message: err.message || 'No se pudo mover el item',
      });
    }
  }

  // ====================== ROTAR ITEM ======================
  async rotateItem(
    server: Server,
    socket: Socket,
    userId: string,
    data: RotateItemDto,
  ) {
    try {
      const updatedItem = await this.roomItemsService.rotateItem(
        userId,
        data.roomItemId,
      );

      server.to(updatedItem.roomId).emit('room:item:rotated', updatedItem);
    } catch (err: any) {
      this.logger.error(`Error rotando item ${data.roomItemId}`, err);
      socket.emit('room:item:error', {
        message: err.message || 'No se pudo rotar el item',
      });
    }
  }

  // ====================== ELIMINAR ITEM ======================
  async removeItem(
    server: Server,
    socket: Socket,
    userId: string,
    data: RemoveItemDto,
  ) {
    try {
      const item = await this.roomItemsService.getSingleItem(data.roomItemId);
      if (!item) {
        return socket.emit('room:item:error', {
          message: 'Item no encontrado',
        });
      }

      await this.roomItemsService.removeItem(userId, data.roomItemId);

      server.to(item.roomId).emit('room:item:removed', {
        roomItemId: data.roomItemId,
        itemId: item.itemId,
      });

      socket.emit('inventory:refresh');
      this.logger.log(`Item ${data.roomItemId} eliminado de la sala`);
    } catch (err: any) {
      this.logger.error(`Error eliminando item ${data.roomItemId}`, err);
      socket.emit('room:item:error', {
        message: err.message || 'No se pudo eliminar el item',
      });
    }
  }

  // ====================== INTERACTUAR CON UN OBJETO ======================
  async interactItem(
    server: Server,
    socket: Socket,
    userId: string,
    data: InteractItemDto,
  ) {
    // Freno barato ANTES de tocar la base. La corrección del anti-spam la da
    // `isTransitionInFlight()` en el servicio (que es lo que impide dos
    // transiciones solapadas); esto sólo evita que 20 clicks en 200 ms se
    // conviertan en 20 lecturas de RoomItem. Es por socket y por objeto, así
    // que no interfiere con otro jugador interactuando con el mismo mueble.
    if (this.isThrottled(socket, data.roomItemId)) return;

    try {
      const result = await this.roomItemsService.interactItem(
        userId,
        data.roomItemId,
        data.interaction,
      );

      // Un CLICK que no cambió nada (no había transición para ese estado, o
      // había una en curso) no se difunde: nada que contarle a la sala.
      if ('changed' in result && result.changed === false) return;

      server.to(result.roomItem.roomId).emit('room:item:state', {
        // ── payload de siempre, sin tocar ──
        roomItemId: data.roomItemId,
        interaction: result.interaction,
        // `state` sigue siendo el Json COMPLETO de RoomItem.state porque el
        // cliente lo mezcla por encima del que ya tenía
        // (FurnitureSocketSystem.handleItemState); mandar otra cosa rompería
        // TOGGLE y OPEN.
        state: result.state,

        // ── añadido, sólo para objetos con behavior ──
        // Estado final + animación de paso + instante de arranque. Es la forma
        // que consume `applyRemoteState()`, y llega IDÉNTICA a todos los
        // jugadores de la sala: ninguno recalcula la transición por su cuenta.
        ...('behavior' in result && result.behavior
          ? { behavior: result.behavior }
          : {}),
      });
    } catch (err: any) {
      this.logger.warn(
        `Interacción ${data.interaction} rechazada en ${data.roomItemId}: ${err.message}`,
      );
      socket.emit('room:item:error', {
        message: err.message || 'No se pudo interactuar con el objeto',
      });
    }
  }

  // ====================== PINTAR SUPERFICIE ======================
  async paintSurface(
    server: Server,
    socket: Socket,
    userId: string,
    data: PaintSurfaceDto,
  ) {
    try {
      const result = await this.roomItemsService.paintSurface(
        userId,
        data.roomId,
        data.itemId,
        data.x,
        data.y,
        data.width ?? 1,
        data.height ?? 1,
        data.wallSide,
      );

      server.to(data.roomId).emit('room:surface:painted', result);
    } catch (err: any) {
      this.logger.error('Error al pintar superficie', err);
      socket.emit('room:item:error', {
        message: err.message || 'No se pudo pintar la superficie',
      });
    }
  }

  // ====================== PINTAR TODA LA SUPERFICIE ======================
  async paintAllSurface(
    server: Server,
    socket: Socket,
    userId: string,
    data: PaintAllSurfaceDto,
  ) {
    try {
      // Throttleado por tiempo (no por cantidad de tiles): salas grandes
      // pueden tener miles de celdas y emitir un evento por cada una
      // saturaría el socket. Siempre se deja pasar el último tick (done ===
      // total) para que el cliente vea el 100% aunque caiga entre medio de
      // la ventana de throttle.
      let lastEmit = 0;
      const onProgress = (done: number, total: number) => {
        const now = Date.now();
        if (now - lastEmit < 120 && done !== total) return;
        lastEmit = now;
        socket.emit('room:surface:paint-all:progress', { done, total });
      };

      const result = await this.roomItemsService.paintAllSurface(
        userId,
        data.roomId,
        data.itemId,
        data.width ?? 1,
        data.height ?? 1,
        onProgress,
      );

      server.to(data.roomId).emit('room:surfaces:painted-all', result);
    } catch (err: any) {
      this.logger.error('Error al pintar toda la superficie', err);
      socket.emit('room:item:error', {
        message: err.message || 'No se pudo pintar toda la superficie',
      });
      socket.emit('room:surface:paint-all:error', {
        message: err.message || 'No se pudo pintar toda la superficie',
      });
    }
  }

  // ====================== LIMPIAR SALA ======================
  async clearRoom(
    server: Server,
    socket: Socket,
    userId: string,
    data: ClearRoomDto,
  ) {
    try {
      const result = await this.roomItemsService.clearRoom(userId, data.roomId);

      server.to(data.roomId).emit('room:items:cleared', result);
      socket.emit('inventory:refresh');

      this.logger.log(`Sala ${data.roomId} limpiada por usuario ${userId}`);
    } catch (err: any) {
      this.logger.error(`Error limpiando sala ${data.roomId}`, err);
      socket.emit('room:item:error', {
        message: err.message || 'No se pudo limpiar la sala',
      });
    }
  }
}
