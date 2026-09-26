// Reglas de registro compartidas por RegisterDto e IdentityService. La web
// (apps/web/src/shared/utils/auth-validation.ts) replica estas mismas reglas
// para avisar antes de enviar; esta es la fuente de verdad.

// 3-20 caracteres: letras, números, "_" y "."; sin punto al inicio/final ni
// dos puntos seguidos.
export const USERNAME_REGEX = /^(?!.*\.\.)(?!\.)(?!.*\.$)[a-zA-Z0-9_.]{3,20}$/;

// 8-72 (bcrypt ignora lo que pasa de 72 bytes), con minúscula, mayúscula,
// número y símbolo.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,72}$/;

const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  'contraseña',
  'contrasena',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'qwertyuiop',
  'iloveyou',
  'admin123',
  'welcome1',
  'abc12345',
  'codebuddies',
]);

// Proveedores de correo temporal más usados: cuentas descartables que
// después abusan de referidos/recompensas.
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'sharklasers.com',
  '10minutemail.com',
  '10minutemail.net',
  'temp-mail.org',
  'tempmail.com',
  'tempmail.net',
  'tempmailo.com',
  'throwawaymail.com',
  'yopmail.com',
  'yopmail.net',
  'trashmail.com',
  'getnada.com',
  'dispostable.com',
  'maildrop.cc',
  'mailnesia.com',
  'fakeinbox.com',
  'emailondeck.com',
  'mohmal.com',
  'moakt.com',
  'minuteinbox.com',
  'discard.email',
  'burnermail.io',
]);

export function normalizeEmail(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  return DISPOSABLE_DOMAINS.has(domain);
}

// Contraseña que cumple el formato pero es obvia o repite los datos del
// usuario.
export function isWeakPassword(
  password: string,
  context: { username?: string; email?: string },
): boolean {
  const lower = password.toLowerCase();
  const stripped = lower.replace(/[^a-z0-9ñ]/g, '');
  if (COMMON_PASSWORDS.has(lower) || COMMON_PASSWORDS.has(stripped))
    return true;
  const username = context.username?.toLowerCase();
  if (username && username.length >= 3 && lower.includes(username)) return true;
  const local = context.email?.split('@')[0]?.toLowerCase();
  if (local && local.length >= 3 && lower.includes(local)) return true;
  return false;
}
