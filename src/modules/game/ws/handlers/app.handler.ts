import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

import { AppService } from '../../../../game/apps/apps.service';

@Injectable()
export class AppHandler {
  private readonly logger = new Logger(AppHandler.name);
  private interval: NodeJS.Timeout | null = null;

  constructor(private readonly appService: AppService) {}

  // ====================== SYNC DE APPS (cada 5 segundos) ======================
  startAppsSync(server: Server) {
    if (this.interval) {
      clearInterval(this.interval);
    }

    this.interval = setInterval(async () => {
      try {
        const apps = await this.appService.getPublishedApps();

        // Enviar a todos los jugadores conectados
        server.emit('apps:update', apps);

        this.logger.debug(
          `Apps actualizadas enviadas a todos los clientes (${apps.length} apps)`,
        );
      } catch (err: any) {
        this.logger.error('Error al sincronizar apps:', err.message);
      }
    }, 5000);
  }

  // ====================== OBTENER APPS MANUALMENTE ======================
  async handleGetApps(socket: any) {
    try {
      const apps = await this.appService.getPublishedApps();
      socket.emit('apps:list', apps);
    } catch (err: any) {
      this.logger.error('Error obteniendo apps', err);
      socket.emit('apps:error', {
        message: 'No se pudieron cargar las aplicaciones',
      });
    }
  }

  // ====================== (Opcional) RECARGAR APPS ======================
  async handleRefreshApps(server: Server, socket: any) {
    try {
      const apps = await this.appService.getPublishedApps(); // forzar refresh si tienes caché
      server.emit('apps:update', apps);
      socket.emit('apps:refreshed', { success: true });
    } catch (err) {
      socket.emit('apps:error', { message: 'Error al refrescar apps' });
    }
  }

  // Cleanup al destruir el módulo (buena práctica)
  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
