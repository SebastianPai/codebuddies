import Phaser from "phaser";

const pendingTextures = new Map<string, Promise<string>>();

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

const LOAD_RETRIES = 3;
const LOAD_RETRY_DELAY_MS = 800;

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
        await loadImageOnce(scene, key, sourceUrl);
        if (options.pixelArt !== false && scene.textures.exists(key)) {
          scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
        return key;
      } catch (err) {
        lastError = err;
        if (attempt < LOAD_RETRIES) {
          console.warn(
            `⚠️ Reintentando carga de asset (${attempt}/${LOAD_RETRIES}):`,
            sourceUrl,
          );
          await delay(LOAD_RETRY_DELAY_MS * attempt);
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`No se pudo cargar asset: ${sourceUrl}`);
  })().finally(() => {
    pendingTextures.delete(pendingKey);
  });

  pendingTextures.set(pendingKey, promise);
  return promise;
}
