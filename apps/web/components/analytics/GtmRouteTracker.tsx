"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

// Next.js App Router navega sin recargar la página (SPA) -- el snippet
// estándar de GTM detecta solo la carga inicial de cada pestaña, no los
// cambios de ruta posteriores hechos con <Link>/router.push(). Sin esto,
// GTM/GA4 solo "vería" la primera página que visita cada usuario y nunca el
// resto de la navegación real dentro del sitio.
//
// Esto empuja un evento "page_view" al dataLayer en cada cambio de ruta,
// para que GTM lo detecte como una página nueva -- adentro de GTM
// (tagmanager.google.com) hace falta un trigger de "Evento personalizado"
// con nombre "page_view" (o reusar el trigger "Cambio de historial") en la
// tag de configuración de GA4 para que efectivamente registre cada una.
function RouteChangeTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!window.dataLayer) return;

    const query = searchParams.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;

    // Evita duplicar el mismo page_view si el efecto corre dos veces
    // seguidas con la misma ruta (ej. Strict Mode en desarrollo).
    if (lastTracked.current === pagePath) return;
    lastTracked.current = pagePath;

    window.dataLayer.push({
      event: "page_view",
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}

export function GtmRouteTracker() {
  const containerId = process.env.NEXT_PUBLIC_GTM_CONTAINER_ID;
  if (!containerId) return null;

  // useSearchParams() exige un límite Suspense (ver docs de Next.js) para
  // no forzar toda la ruta a renderizado dinámico.
  return (
    <Suspense fallback={null}>
      <RouteChangeTracker />
    </Suspense>
  );
}
