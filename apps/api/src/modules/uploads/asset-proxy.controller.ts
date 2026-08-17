import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

// Fallback para cuando el navegador del usuario no puede pedir el asset
// directo a R2 (visto en producción: falla en TODOS los navegadores de una
// PC puntual, pero funciona desde otra red -- algo local del equipo/red del
// usuario, ni el bucket ni Cloudflare tienen el problema, verificado con
// curl repetidas veces). Re-sirve el archivo desde nuestro propio dominio
// (que ya sabemos que le funciona al cliente), sin depender de la config de
// CORS de un tercero. Sin JwtAuthGuard a propósito: los assets ya son
// públicos de por sí (se sirven sin auth directo desde R2).
@Controller('uploads')
export class AssetProxyController {
  private readonly logger = new Logger(AssetProxyController.name);

  @Get('proxy')
  async proxy(@Query('url') url: string, @Res() res: Response) {
    if (!url) {
      throw new BadRequestException('url requerido');
    }

    const allowedBase = process.env.R2_PUBLIC_URL;
    if (!allowedBase || !url.startsWith(allowedBase)) {
      // Evita que esto se use como proxy abierto hacia cualquier URL --
      // solo re-sirve lo que ya está en nuestro propio bucket.
      throw new BadRequestException('URL no permitida');
    }

    let upstream: globalThis.Response;
    try {
      upstream = await fetch(url);
    } catch (err) {
      this.logger.warn(`No se pudo obtener asset via proxy: ${url}`, err);
      throw new NotFoundException('No se pudo obtener el asset');
    }

    if (!upstream.ok || !upstream.body) {
      throw new NotFoundException('Asset no encontrado');
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(buffer);
  }
}
