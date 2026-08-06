import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { Server, ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

// Sin esto, el estado del juego (jugadores conectados, salas, avatares en
// memoria — ver PlayerHandler) vive en un único proceso Node: no se puede
// escalar horizontalmente (dos instancias del backend no se enterarían la
// una de la otra) y un reinicio del proceso pierde todo el estado en vivo.
//
// Con REDIS_URL configurado, Socket.IO reenvía los eventos entre todas las
// instancias del backend a través de Redis pub/sub. Sin REDIS_URL (el caso
// por defecto en desarrollo local, donde no hay Redis corriendo), se usa el
// adapter en memoria de siempre — cero cambio de comportamiento respecto a
// antes de este archivo.
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.logger.log(
        'REDIS_URL no configurado: usando el adapter de Socket.IO en memoria (un solo proceso)',
      );
      return;
    }

    try {
      const pubClient = new Redis(redisUrl, { lazyConnect: true });
      const subClient = pubClient.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('Adaptador Redis para Socket.IO conectado');
    } catch (err) {
      // No tirar abajo el boot del server por esto: seguir con el adapter
      // en memoria es mejor que no levantar el backend en absoluto.
      this.logger.error(
        'No se pudo conectar a Redis, usando el adapter en memoria por defecto',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    // IoAdapter.createIOServer está tipado como `any` en @nestjs/platform-socket.io;
    // el cast documenta lo que realmente devuelve en runtime para este adapter.
    const server = super.createIOServer(port, options) as Server;
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
