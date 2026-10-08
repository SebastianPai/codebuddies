// Qué se guarda del cuerpo de una petición en el historial: nunca secretos,
// nunca textos largos. Suficiente para saber QUÉ se hizo y SOBRE QUÉ (ids,
// cantidades, estados), no para reconstruir datos personales.
const SECRET_KEY = /pass|token|secret|authorization|cookie|card|cvv|signature|otp/i;
const MAX_STRING = 160;
const MAX_KEYS = 30;
const MAX_ARRAY = 10;
const MAX_DEPTH = 3;

export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…(${value.length})` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (depth >= MAX_DEPTH) return '[…]';
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY).map((item) => sanitizeForLog(item, depth + 1));
    return value.length > MAX_ARRAY ? [...items, `…+${value.length - MAX_ARRAY}`] : items;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>).slice(0, MAX_KEYS)) {
      out[key] = SECRET_KEY.test(key) ? '[oculto]' : sanitizeForLog(inner, depth + 1);
    }
    return out;
  }
  return String(value);
}

// Id "principal" sobre el que se actuó, para poder filtrar el historial por
// objeto: el primer parámetro de ruta, o ids conocidos del cuerpo.
export function pickTargetId(
  params: Record<string, unknown> | undefined,
  body: Record<string, unknown> | undefined,
): string | null {
  const fromParams = params ? Object.values(params).find((v) => typeof v === 'string') : undefined;
  if (typeof fromParams === 'string') return fromParams.slice(0, 80);
  for (const key of ['roomItemId', 'itemId', 'roomId', 'contentId', 'userId', 'courseId', 'exerciseId', 'lessonId']) {
    const v = body?.[key];
    if (typeof v === 'string') return v.slice(0, 80);
  }
  return null;
}
