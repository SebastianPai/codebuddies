import { Controller, Get, Header, HttpCode, Post, Query } from '@nestjs/common';
import { EmailService } from './email.service';
import { verifyUnsubscribeToken } from './unsubscribe-token';

const page = (title: string, body: string) => `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0c0e12;color:#f5f5f5;font-family:system-ui,sans-serif;padding:16px;text-align:center">
<div style="max-width:420px"><h1 style="font-size:24px">${title}</h1><p style="color:#a1a1aa;line-height:1.6">${body}</p>
<a href="https://codebuddies.tech/settings" style="display:inline-block;margin-top:16px;background:#facc15;color:#000;padding:12px 20px;border-radius:12px;font-weight:800;text-decoration:none">Ir a CodeBuddies</a></div>
</body></html>`;

// Público a propósito (sin JWT): se abre desde el enlace del correo.
@Controller('email/unsubscribe')
export class EmailUnsubscribeController {
  constructor(private readonly emailService: EmailService) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  async unsubscribePage(@Query('token') token?: string) {
    const userId = token ? verifyUnsubscribeToken(token) : null;
    if (!userId) {
      return page(
        'Enlace no válido',
        'Este enlace de baja no es válido. Puedes desactivar los correos desde Ajustes en tu cuenta.',
      );
    }
    await this.emailService.unsubscribeMarketing(userId);
    return page(
      'Listo, te diste de baja',
      'Ya no te enviaremos correos de novedades ni promociones. Seguirás recibiendo los avisos necesarios de tu cuenta y tus compras. Puedes volver a activarlos cuando quieras desde Ajustes.',
    );
  }

  // One-click (RFC 8058): el cliente de correo hace POST a la misma URL.
  @Post()
  @HttpCode(200)
  async oneClick(@Query('token') token?: string) {
    const userId = token ? verifyUnsubscribeToken(token) : null;
    if (userId) await this.emailService.unsubscribeMarketing(userId);
    return { ok: Boolean(userId) };
  }
}
