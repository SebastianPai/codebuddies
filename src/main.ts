import 'dotenv/config'; // debe ser el primer import: los módulos de abajo leen process.env al cargarse
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser from 'cookie-parser'; // 👈 para manejar cookies
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3002').split(','),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, Accept',
    credentials: true,
  });

  app.use(cookieParser()); // 👈 ESTA LÍNEA ES CRUCIAL

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
