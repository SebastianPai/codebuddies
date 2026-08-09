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

  const promise = new Promise<string>((resolve, reject) => {
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
      if (options.pixelArt !== false && scene.textures.exists(key)) {
        scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      resolve(key);
    });
    if (!scene.load.isLoading()) scene.load.start();
  }).finally(() => {
    pendingTextures.delete(pendingKey);
  });

  pendingTextures.set(pendingKey, promise);
  return promise;
}
