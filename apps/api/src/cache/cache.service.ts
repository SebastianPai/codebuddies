import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

// HI12/PERF4: cache de aplicación para las rutas más visitadas (catálogo,
// rankings, dashboard admin) — antes cada request pegaba directo a
// Postgres. TTL corto en vez de invalidación precisa por escritura: para
// datos que cambian todo el tiempo por naturaleza (XP ganado a cada rato,
// rankings) perseguir cada mutation site para invalidar agregaría más
// complejidad que el beneficio de unos segundos de frescura extra.
//
// Si Redis no está disponible (ej. dev local sin `docker compose up
// redis`), se degrada a "sin cache" en vez de tirar abajo la app —
// cachear es una optimización, no una dependencia dura.
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis | null;
  private warnedUnavailable = false;

  constructor() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
        lazyConnect: false,
      });
      this.client.on('error', () => {
        if (!this.warnedUnavailable) {
          this.logger.warn(`Redis no disponible en ${url} — sirviendo sin cache.`);
          this.warnedUnavailable = true;
        }
      });
    } catch {
      this.client = null;
    }
  }

  async getOrSet<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    const cached = await this.safeGet(key);
    if (cached !== null) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        // valor corrupto/de otro shape — se recalcula.
      }
    }

    const fresh = await load();
    await this.safeSet(key, JSON.stringify(fresh), ttlSeconds);
    return fresh;
  }

  async invalidate(prefix: string): Promise<void> {
    if (!this.client) return;
    try {
      const keys = await this.client.keys(`${prefix}*`);
      if (keys.length) await this.client.del(...keys);
    } catch {
      // best-effort — un fallo acá no debe romper la mutación que lo disparó.
    }
  }

  private async safeGet(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  private async safeSet(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } catch {
      // best-effort
    }
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }
}
