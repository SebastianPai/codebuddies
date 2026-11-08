// Atribución de registros (primer toque) sin cookies de terceros.
//
// Si alguien entra con ?utm_source=...&utm_campaign=...&utm_content=..., se
// guarda SOLO un código corto ("tiktok:c2:v1") en este navegador y se manda
// con el registro (User.signupSource). Gana la primera campaña: si después
// vuelve por otro lado, no se pisa. Vence a los 30 días. Nada de datos
// personales, y no depende del banner de cookies (es nuestro propio servidor
// contando cuentas, no seguimiento entre sitios).
const KEY = "cb-signup-src";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const clean = (v: string | null) =>
  (v ?? "").toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 24);

export function captureCampaign(search: string): void {
  try {
    const q = new URLSearchParams(search);
    const source = clean(q.get("utm_source"));
    if (!source) return;
    const prev = JSON.parse(localStorage.getItem(KEY) || "null");
    if (prev && typeof prev.at === "number" && Date.now() - prev.at < MAX_AGE_MS) return;
    const code = [source, clean(q.get("utm_campaign")), clean(q.get("utm_content"))]
      .filter(Boolean)
      .join(":");
    localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    // Sin localStorage (modo privado, bloqueado): no se atribuye y listo.
  }
}

export function getCampaign(): string | undefined {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!v || typeof v.code !== "string" || Date.now() - v.at >= MAX_AGE_MS) return undefined;
    return /^[a-z0-9_:.-]{1,80}$/.test(v.code) ? v.code : undefined;
  } catch {
    return undefined;
  }
}

// Solo rutas internas: "/algo", nunca "//otro-sitio" ni "/\otro".
export function safeInternalPath(p: string | null | undefined): string | null {
  if (!p || !p.startsWith("/") || p.startsWith("//") || p.startsWith("/\\")) return null;
  return p;
}
