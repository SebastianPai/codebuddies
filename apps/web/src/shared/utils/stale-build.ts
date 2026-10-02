// Errores típicos de una pestaña abierta antes de un deploy: pide un chunk
// de JS/CSS con el hash viejo, que ya no existe en el servidor.
const STALE_BUILD = /ChunkLoadError|Loading chunk [\w-]+ failed|Loading CSS chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;
const RELOAD_KEY = "cb-stale-reload-at";

/**
 * Si el error es por una versión vieja de la web, recarga la página una vez
 * (no más de una cada 30 s, para no entrar en bucle) y devuelve true.
 */
export function recoverFromStaleBuild(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? "");
  if (!STALE_BUILD.test(text) || typeof window === "undefined") return false;
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 30_000) return false;
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Sin sessionStorage: recargamos igual, una vez por error.
  }
  window.location.reload();
  return true;
}
