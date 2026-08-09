"use client";

import { ImgHTMLAttributes, useEffect, useMemo, useRef, useState } from "react";

const loadedImages = new Set<string>();
const pendingImages = new Map<string, Promise<string>>();

function canonicalAssetUrl(url?: string | null) {
  if (!url) return "";
  try {
    const parsed = new URL(url, window.location.origin);
    ["cb", "cacheBust", "timestamp"].forEach((key) => parsed.searchParams.delete(key));
    return parsed.toString();
  } catch {
    return url;
  }
}

const SCROLLABLE_OVERFLOW = /(auto|scroll|overlay)/;

// IntersectionObserver con root=null (el default) mide contra el viewport
// del navegador, sin tener en cuenta que un ancestro con overflow:auto/scroll
// puede estar recortando el elemento visualmente. Sin esto, una imagen dentro
// de una grilla con scroll propio (salas, tienda, inventario) puede quedar
// marcada como "visible" mientras sigue tapada por el recorte del contenedor,
// y nunca dispara la carga.
function findScrollParent(node: Element | null): Element | null {
  let el = node?.parentElement ?? null;
  while (el) {
    const style = window.getComputedStyle(el);
    if (SCROLLABLE_OVERFLOW.test(style.overflowY) || SCROLLABLE_OVERFLOW.test(style.overflowX)) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

function preloadImage(url?: string | null) {
  const src = canonicalAssetUrl(url);
  if (!src || loadedImages.has(src)) return Promise.resolve(src);
  const pending = pendingImages.get(src);
  if (pending) return pending;

  const promise = new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.loading = "eager";
    image.onload = () => {
      loadedImages.add(src);
      resolve(src);
    };
    image.onerror = reject;
    image.src = src;
  }).finally(() => pendingImages.delete(src));

  pendingImages.set(src, promise);
  return promise;
}

type Props = ImgHTMLAttributes<HTMLImageElement> & { src?: string | null };

export default function CachedGameImage({ src, loading = "lazy", decoding = "async", ...props }: Props) {
  const stableSrc = useMemo(() => canonicalAssetUrl(src), [src]);
  const imageRef = useRef<HTMLImageElement>(null);
  const [shouldLoad, setShouldLoad] = useState(loading !== "lazy");
  const [readySrc, setReadySrc] = useState(loading === "lazy" ? "" : stableSrc);

  useEffect(() => {
    setShouldLoad(loading !== "lazy");
    setReadySrc(loading === "lazy" ? "" : stableSrc);
  }, [loading, stableSrc]);

  useEffect(() => {
    if (shouldLoad || loading !== "lazy") return;
    const target = imageRef.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { root: findScrollParent(target), rootMargin: "320px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, shouldLoad]);

  useEffect(() => {
    let cancelled = false;
    if (!shouldLoad) return;
    preloadImage(stableSrc)
      .then((loadedSrc) => {
        if (!cancelled) setReadySrc(loadedSrc);
      })
      .catch(() => {
        if (!cancelled) setReadySrc(stableSrc);
      });
    return () => {
      cancelled = true;
    };
  }, [shouldLoad, stableSrc]);

  if (!stableSrc) return null;
  return <img {...props} ref={imageRef} src={readySrc || undefined} loading={loading} decoding={decoding} />;
}
