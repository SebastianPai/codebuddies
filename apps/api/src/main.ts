import 'dotenv/config'; // debe ser el primer import: los módulos de abajo leen process.env al cargarse
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser from 'cookie-parser'; // 👈 para manejar cookies
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RedisIoAdapter } from './common/redis-io.adapter';

async function bootstrap() {
  // rawBody: true deja `req.rawBody` disponible en toda la app — lo necesita
  // el webhook de Paddle para verificar la firma HMAC contra los bytes
  // exactos del body (re-serializar el JSON parseado no garantiza el mismo
  // string byte a byte que Paddle firmó).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Cabeceras de seguridad estándar (HSTS, X-Content-Type-Options,
  // X-Frame-Options, etc.) — antes no había ninguna. crossOriginResourcePolicy
  // en "cross-origin" porque apps/game y apps/web (otros orígenes) cargan
  // imágenes/uploads servidos desde acá.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Límite explícito de tamaño de body en vez del default de Express
  // (100kb) — ese default es más chico que los límites por-campo que
  // valida MaxJsonSize (ver dto de course/module/lesson/exercise), así que
  // un payload de contenido grande pero legítimo terminaba en un 500 opaco
  // de body-parser antes de llegar siquiera a la validación del DTO.
  app.useBodyParser('json', { limit: '2mb' });
  app.useBodyParser('urlencoded', { limit: '2mb', extended: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: (
      process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3002'
    ).split(','),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, Accept',
    credentials: true,
  });

  app.use(cookieParser()); // 👈 ESTA LÍNEA ES CRUCIAL

  // Solo activa Redis pub/sub para Socket.IO si REDIS_URL está configurado;
  // sin esa variable (dev local por defecto) sigue usando el adapter en
  // memoria de siempre, sin ningún cambio de comportamiento.
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // 🔥 ESTA ES LA LÍNEA IMPORTANTE
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    maxAge: '1y',
    immutable: true,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  });

  await app.listen(3001);
}
bootstrap();
