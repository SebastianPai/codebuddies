import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Postgres essential-0 admite 20 conexiones en total. Sin límite, Prisma abre
// 2×CPUs+1 = 17 en un dyno Basic, y al reiniciar el dyno (deploy o reinicio
// diario) el viejo y el nuevo suman más de 20 y la API no arranca (P2037).
const DEFAULT_CONNECTION_LIMIT = 5;

function withConnectionLimit(url: string | undefined): string | undefined {
  if (!url || /[?&]connection_limit=/.test(url)) return url;
  const limit = Number(process.env.PRISMA_CONNECTION_LIMIT) || DEFAULT_CONNECTION_LIMIT;
  return `${url}${url.includes('?') ? '&' : '?'}connection_limit=${limit}`;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const url = withConnectionLimit(process.env.DATABASE_URL);
    super(url ? { datasources: { db: { url } } } : undefined);
  }

  async onModuleInit() {
    await this.$connect();
  }
}
