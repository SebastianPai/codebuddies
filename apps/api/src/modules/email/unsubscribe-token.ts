import { JwtService } from '@nestjs/jwt';
import { JWT_SECRET } from '../../config/env';

// Enlace de baja de correos de marketing sin iniciar sesión (lo exigen la
// Ley 1581, el RGPD y, desde 2024, Gmail/Yahoo para envíos masivos). El
// token va firmado y con un propósito propio, así no sirve como sesión. No
// vence: un correo viejo tiene que poder seguir dando de baja.
const jwt = new JwtService({ secret: JWT_SECRET });
const PURPOSE = 'email-unsubscribe';

const API_PUBLIC_URL = (
  process.env.API_PUBLIC_URL ?? 'https://api.codebuddies.tech'
).replace(/\/$/, '');

export function unsubscribeUrl(userId: string): string {
  const token = jwt.sign({ sub: userId, purpose: PURPOSE });
  return `${API_PUBLIC_URL}/email/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const payload = jwt.verify<{ sub?: string; purpose?: string }>(token);
    return payload.purpose === PURPOSE && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}
