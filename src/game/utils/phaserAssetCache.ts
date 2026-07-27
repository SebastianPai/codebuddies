import Phaser from "phaser";

const pendingTextures = new Map<string, Promise<string>>();

export function canonicalAssetKey(url?: string | null) {
  if (!url) return "";
  try {
    const parsed = new URL(url, globalThis.location?.origin ?? "http://localhost");
    ["cb", "cacheBust", "timestamp"].forEach((key) => parsed.searchParams.delete(key));
    return parsed.toString();
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
    scene.load.once(`filecomplete-image-${key}`, () => {
      if (options.pixelArt !== false && scene.textures.exists(key)) {
        scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      resolve(key);
    });
    scene.load.once(`loaderror`, (_file: unknown) => {
      reject(new Error(`No se pudo cargar asset: ${sourceUrl}`));
    });
    if (!scene.load.isLoading()) scene.load.start();
  }).finally(() => {
    pendingTextures.delete(pendingKey);
  });

  pendingTextures.set(pendingKey, promise);
  return promise;
}
