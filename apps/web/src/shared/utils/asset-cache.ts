"use client";

const imagePromises = new Map<string, Promise<string>>();
const loadedImages = new Set<string>();

export function canonicalAssetUrl(url?: string | null): string {
  if (!url || typeof window === "undefined") return url ?? "";

  try {
    const parsed = new URL(url, window.location.origin);
    ["cb", "cacheBust", "timestamp"].forEach((key) =>
      parsed.searchParams.delete(key),
    );
    return parsed.toString();
  } catch {
    return url;
  }
}

export function preloadImage(url?: string | null): Promise<string> {
  const source = canonicalAssetUrl(url);
  if (!source) return Promise.resolve("");
  if (loadedImages.has(source)) return Promise.resolve(source);

  const existingPromise = imagePromises.get(source);
  if (existingPromise) return existingPromise;

  const promise = new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.loading = "eager";
    image.onload = () => {
      loadedImages.add(source);
      resolve(source);
    };
    image.onerror = reject;
    image.src = source;
  }).finally(() => imagePromises.delete(source));

  imagePromises.set(source, promise);
  return promise;
}

export function isImageCached(url?: string | null): boolean {
  return loadedImages.has(canonicalAssetUrl(url));
}
