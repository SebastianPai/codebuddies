import Phaser from "phaser";
import { getApiUrl, getAssetsUrl } from "../../config/env";

const pendingTextures = new Map<string, Promise<string>>();

// Si el navegador del usuario no puede pedir el asset directo a R2/Cloudflare
// (visto en producción: falla en todos los navegadores de una PC puntual
// pero funciona desde otra red -- algo local del equipo/red del usuario, no
// del bucket, verificado con curl repetidas veces desde el servidor), lo
// re-pedimos a través de nuestro propio backend, que sirve el mismo archivo
// bajo un dominio que sabemos que sí le funciona al cliente.
function toProxyUrl(sourceUrl: string): string | null {
  const assetsBase = getAssetsUrl();
  if (!assetsBase || !sourceUrl.startsWith(assetsBase)) return null;
  return `${getApiUrl()}/uploads/proxy?url=${encodeURIComponent(sourceUrl)}`;
}

export function canonicalAssetKey(url?: string | null) {
  if (!url) return "";
  try {
    // Antes esto borraba los params "cb"/"cacheBust"/"timestamp" antes de
    // usar la URL como clave — pero esos son justamente los params que el
    // backend agrega para forzar un refetch cuando el asset cambió (p. ej.
    // al editar una preview de marketplace). Al borrarlos, dos URLs con
    // distinto cache-bust colapsaban a la misma clave, scene.textures.exists()
    // encontraba la textura vieja ya cargada, y el asset editado nunca se
    // volvía a pedir en toda la sesión. Ahora la URL completa (con el param)
    // es la clave, tal como se pensó el mecanismo de cache-busting.
    return new URL(url, globalThis.location?.origin ?? "http://localhost").toString();
  } catch {
    return url;
  }
}

// Dos intentos directos (un tropiezo de red se recupera) y después, solo si
// el archivo existe, el proxy de la API. Antes eran 3 + proxy por imagen y,
// con imágenes rotas, cada una terminaba pegándole a la API: una sala con
// varias rotas llenaba la consola y cargaba el servidor.
const LOAD_RETRIES = 2;
const LOAD_RETRY_DELAY_MS = 800;

// Lo que ya falló no se vuelve a pedir en esta sesión (cada sala que se
// abría repetía todas las peticiones de las imágenes rotas).
const failedUrls = new Set<string>();

/**
 * URL con la que Phaser pide la imagen. Las fichas de React la cargan como
 * <img> o fondo CSS (sin CORS) y el navegador guarda esa respuesta sin el
 * header Access-Control-Allow-Origin; cuando Phaser pedía la MISMA URL con
 * CORS, el navegador reusaba la guardada y la bloqueaba ("blocked by CORS
 * policy"). Con un parámetro propio es otra entrada de caché, siempre CORS.
 */
function corsSafeUrl(sourceUrl: string): string {
  const assetsBase = getAssetsUrl();
  if (!assetsBase || !sourceUrl.startsWith(assetsBase)) return sourceUrl;
  return `${sourceUrl}${sourceUrl.includes("?") ? "&" : "?"}cors=1`;
}

/** ¿El archivo existe? Para no mandar al proxy de la API lo que es un 404. */
async function assetExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD", mode: "cors" });
    return response.ok;
  } catch {
    // Sin respuesta legible (red/CORS): puede existir, que lo intente el proxy.
    return true;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadImageOnce(scene: Phaser.Scene, key: string, sourceUrl: string) {
  return new Promise<string>((resolve, reject) => {
    scene.load.setCORS("anonymous");
    scene.load.image(key, sourceUrl);

    // "loaderror" es un evento global de TODA la cola de carga, no de este
    // archivo puntual (a diferencia de "filecomplete-image-${key}", que sí
    // está scopeado). Antes, con .once, la primera falla de CUALQUIER otro
    // archivo cargando en paralelo (p. ej. la textura de otro jugador)
    // rechazaba esta promesa igual — rompiendo cualquier Promise.all() que
    // esperara varias texturas a la vez por una falla completamente ajena.
    const onLoadError = (file: Phaser.Loader.File) => {
      if (file.key !== key) return;
      scene.load.off("loaderror", onLoadError);
      reject(new Error(`No se pudo cargar asset: ${sourceUrl}`));
    };

    scene.load.on("loaderror", onLoadError);
    scene.load.once(`filecomplete-image-${key}`, () => {
      scene.load.off("loaderror", onLoadError);
      resolve(key);
    });
    if (!scene.load.isLoading()) scene.load.start();
  });
}

export function loadTextureOnce(
  scene: Phaser.Scene,
  url?: string | null,
  options: { key?: string; pixelArt?: boolean } = {},
) {
  const sourceUrl = canonicalAssetKey(url);
  const key = options.key ?? sourceUrl;
  if (!sourceUrl || !key) return Promise.resolve("");
  if (scene.textures.exists(key)) return Promise.resolve(key);
  if (failedUrls.has(sourceUrl)) {
    return Promise.reject(new Error(`Asset no disponible: ${sourceUrl}`));
  }

  const pendingKey = `${scene.game.registry.get("asset-cache-id") ?? "game"}:${key}`;
  const pending = pendingTextures.get(pendingKey);
  if (pending) return pending;

  const promise = (async () => {
    let lastError: unknown;

    // Reintenta antes de rendirse -- una falla de carga (CORS, timeout, 5xx
    // del CDN) suele ser transitoria (ej: un nodo de borde con config
    // desactualizada), y sin esto un solo hiccup de red dejaba ese slot del
    // avatar/mueble invisible por el resto de la sesión sin ninguna
    // oportunidad de recuperarse.
    for (let attempt = 1; attempt <= LOAD_RETRIES; attempt++) {
      try {
        await loadImageOnce(scene, key, corsSafeUrl(sourceUrl));
        if (options.pixelArt !== false && scene.textures.exists(key)) {
          scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
        return key;
      } catch (err) {
        lastError = err;
        if (attempt < LOAD_RETRIES) await delay(LOAD_RETRY_DELAY_MS * attempt);
      }
    }

    const proxyUrl = toProxyUrl(sourceUrl);
    if (proxyUrl && (await assetExists(corsSafeUrl(sourceUrl)))) {
      try {
        await loadImageOnce(scene, key, proxyUrl);
        if (options.pixelArt !== false && scene.textures.exists(key)) {
          scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
        return key;
      } catch (err) {
        lastError = err;
      }
    }

    failedUrls.add(sourceUrl);
    console.warn("Imagen no disponible (no se vuelve a pedir en esta sesión):", sourceUrl);
    throw lastError instanceof Error
      ? lastError
      : new Error(`No se pudo cargar asset: ${sourceUrl}`);
  })().finally(() => {
    pendingTextures.delete(pendingKey);
  });

  pendingTextures.set(pendingKey, promise);
  return promise;
}
