"use client";

import { useEffect, useRef } from "react";

// Clip corto en bucle, sin sonido (más liviano y nítido que un GIF).
// - No descarga nada hasta que el clip se acerca a la pantalla
//   (preload="none" + el src se pone recién al verse).
// - Se pausa al salir de la vista: no gasta CPU ni batería fuera de ella.
// - Con "reducir movimiento" o "ahorro de datos" se queda en el póster.
export function LoopVideo({
  src,
  poster,
  width,
  height,
  label,
  className = "",
}: {
  src: string;
  poster: string;
  width: number;
  height: number;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (reduced || saveData || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // El src se pone acá (no en el HTML): hasta este momento no se
          // descarga ni un byte del video.
          if (!video.getAttribute("src")) video.setAttribute("src", src);
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { rootMargin: "200px 0px", threshold: 0.15 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [src]);

  return (
    <video
      ref={ref}
      poster={poster}
      width={width}
      height={height}
      muted
      loop
      playsInline
      preload="none"
      aria-label={label}
      className={`block h-auto w-full ${className}`}
    />
  );
}
