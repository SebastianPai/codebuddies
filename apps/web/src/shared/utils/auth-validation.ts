// Mismas reglas que apps/api/src/modules/identity/auth-rules.ts (la fuente de
// verdad): acá solo sirven para avisar antes de enviar el formulario.

export const USERNAME_REGEX = /^(?!.*\.\.)(?!\.)(?!.*\.$)[a-zA-Z0-9_.]{3,20}$/;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

// Local + dominio con al menos un punto y TLD de 2+ letras; sin espacios,
// sin dos @, sin puntos al borde ni dobles.
const EMAIL_REGEX =
  /^(?!\.)(?!.*\.\.)(?!.*\.@)[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com",
  "10minutemail.com", "10minutemail.net", "temp-mail.org", "tempmail.com",
  "tempmail.net", "tempmailo.com", "throwawaymail.com", "yopmail.com",
  "yopmail.net", "trashmail.com", "getnada.com", "dispostable.com",
  "maildrop.cc", "mailnesia.com", "fakeinbox.com", "emailondeck.com",
  "mohmal.com", "moakt.com", "minuteinbox.com", "discard.email", "burnermail.io",
]);

// Errores de tipeo frecuentes -> sugerencia "¿Quisiste decir…?".
const DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmal.com": "gmail.com",
  "gmail.co": "gmail.com", "gmail.con": "gmail.com", "gamil.com": "gmail.com",
  "gnail.com": "gmail.com", "gmail.cm": "gmail.com", "gmaill.com": "gmail.com",
  "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmail.co": "hotmail.com",
  "hotmail.con": "hotmail.com", "hotmal.com": "hotmail.com", "homtail.com": "hotmail.com",
  "outlok.com": "outlook.com", "outlook.co": "outlook.com", "outllok.com": "outlook.com",
  "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com", "yahoo.co": "yahoo.com",
  "icloud.co": "icloud.com", "iclod.com": "icloud.com",
};

const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "contraseña", "contrasena",
  "12345678", "123456789", "1234567890", "qwerty123", "qwertyuiop",
  "iloveyou", "admin123", "welcome1", "abc12345", "codebuddies",
]);

export type EmailCheck =
  | { valid: true; suggestion?: string }
  | { valid: false; reason: "empty" | "format" | "disposable"; suggestion?: string };

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function checkEmail(raw: string): EmailCheck {
  const email = normalizeEmail(raw);
  if (!email) return { valid: false, reason: "empty" };
  const domain = email.split("@")[1] ?? "";
  const suggestion = DOMAIN_TYPOS[domain]
    ? `${email.split("@")[0]}@${DOMAIN_TYPOS[domain]}`
    : undefined;
  if (email.length > 254 || !EMAIL_REGEX.test(email)) {
    return { valid: false, reason: "format", suggestion };
  }
  if (DISPOSABLE_DOMAINS.has(domain)) return { valid: false, reason: "disposable" };
  return { valid: true, suggestion };
}

export type PasswordRule = "length" | "lower" | "upper" | "number" | "symbol";

export function passwordRules(password: string): Record<PasswordRule, boolean> {
  return {
    length: password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9\s]/.test(password),
  };
}

export function isCommonOrPersonalPassword(
  password: string,
  context: { username?: string; email?: string },
) {
  const lower = password.toLowerCase();
  const stripped = lower.replace(/[^a-z0-9ñ]/g, "");
  if (COMMON_PASSWORDS.has(lower) || COMMON_PASSWORDS.has(stripped)) return true;
  const username = context.username?.trim().toLowerCase();
  if (username && username.length >= 3 && lower.includes(username)) return true;
  const local = context.email?.split("@")[0]?.trim().toLowerCase();
  if (local && local.length >= 3 && lower.includes(local)) return true;
  return false;
}

// 0-4 para el medidor visual.
export function passwordScore(
  password: string,
  context: { username?: string; email?: string } = {},
): number {
  if (!password) return 0;
  const rules = passwordRules(password);
  const passed = Object.values(rules).filter(Boolean).length;
  if (isCommonOrPersonalPassword(password, context)) return 1;
  let score = passed <= 2 ? 1 : passed === 3 ? 2 : passed === 4 ? 3 : 4;
  if (score === 4 && password.length < 12) score = 3;
  if (passed === 5 && password.length >= 12) score = 4;
  return score;
}

export function isPasswordValid(
  password: string,
  context: { username?: string; email?: string } = {},
) {
  return (
    Object.values(passwordRules(password)).every(Boolean) &&
    !isCommonOrPersonalPassword(password, context)
  );
}
