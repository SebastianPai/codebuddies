"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

interface AdSlotProps {
  // Ad unit id creado en el dashboard de AdSense (uno por ubicación real en
  // el sitio, ej. "1234567890") -- distinto del client id global de arriba.
  slot: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
  className?: string;
}

// Un espacio de anuncio individual. Nunca se renderiza:
// - sin NEXT_PUBLIC_ADSENSE_CLIENT_ID configurado (AdSense no está listo), o
// - mientras no se confirmó el estado de la sesión (evita el parpadeo de
//   mostrar un anuncio y sacarlo apenas se confirma que el usuario es
//   Premium), o
// - para cualquier usuario con Premium activo (user.isPremium, que ya viene
//   resuelto server-side en /identity/me -- ver utils/auth.ts).
export function AdSlot({ slot, format = "auto", className }: AdSlotProps) {
  const { user, loading } = useAuth();
  const pushedRef = useRef(false);

  const shouldRender = Boolean(CLIENT_ID) && !loading && !user?.isPremium;

  useEffect(() => {
    if (!shouldRender || pushedRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch {
      // AdSense todavía no cargó el script (bloqueador de anuncios, red
      // lenta, etc.) -- no es un error nuestro, no hay nada que reintentar.
    }
  }, [shouldRender]);

  if (!shouldRender) return null;

  return (
    <ins
      className={`adsbygoogle block ${className ?? ""}`}
      style={{ display: "block" }}
      data-ad-client={CLIENT_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
