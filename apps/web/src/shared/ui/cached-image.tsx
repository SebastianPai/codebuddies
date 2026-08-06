"use client";

import type { ImgHTMLAttributes } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { canonicalAssetUrl, preloadImage } from "../utils/asset-cache";

type CachedImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
};

export function CachedImage({
  src,
  loading = "lazy",
  decoding = "async",
  ...props
}: CachedImageProps) {
  const stableSource = useMemo(() => canonicalAssetUrl(src), [src]);
  const imageRef = useRef<HTMLImageElement>(null);
  const [shouldLoad, setShouldLoad] = useState(loading !== "lazy");
  const [readySource, setReadySource] = useState(loading === "lazy" ? "" : stableSource);

  useEffect(() => {
    setShouldLoad(loading !== "lazy");
    setReadySource(loading === "lazy" ? "" : stableSource);
  }, [loading, stableSource]);

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
      { rootMargin: "320px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, shouldLoad]);

  useEffect(() => {
    if (!shouldLoad) return;

    let isCancelled = false;
    if (!stableSource) {
      setReadySource("");
      return;
    }

    preloadImage(stableSource)
      .then((loadedSource) => {
        if (!isCancelled) setReadySource(loadedSource);
      })
      .catch(() => {
        if (!isCancelled) setReadySource(stableSource);
      });

    return () => {
      isCancelled = true;
    };
  }, [shouldLoad, stableSource]);

  if (!stableSource) return null;

  return (
    <img
      {...props}
      ref={imageRef}
      src={readySource || undefined}
      loading={loading}
      decoding={decoding}
    />
  );
}

export default CachedImage;
