import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { JWT_SECRET } from '../../config/env';

// El límite global se contaba por IP. En un colegio/aula todos los alumnos
// salen por la MISMA IP pública, así que 50 personas compartían un solo cupo
// de 120 req/min y empezaban a recibir 429 entre ellas. Con un token válido
// el cupo pasa a ser por usuario; sin token (login, registro, visitas) sigue
// siendo por IP.
//
// El token se VERIFICA (firma HMAC, barato): si solo se decodificara, alguien
// podría inventar un `sub` distinto en cada request y saltarse el límite.
const jwt = new JwtService({ secret: JWT_SECRET });

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || null;
  // El stream SSE manda el token por query (EventSource no acepta headers).
  const queryToken = req.query?.token;
  return typeof queryToken === 'string' ? queryToken : null;
}

@Injectable()
export class UserAwareThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as Request;
    const token = extractToken(request);

    if (token) {
      try {
        const payload = jwt.verify<{ sub?: string }>(token);
        if (payload?.sub) return Promise.resolve(`user:${payload.sub}`);
      } catch {
        // token vencido o inválido: se cuenta por IP
      }
    }
    const ip = request.ips?.length ? request.ips[0] : request.ip;
    return Promise.resolve(ip ?? 'unknown');
  }
}
