"use client";

import { useEffect } from "react";
import ErrorScreen from "../../components/system/ErrorScreen";

// Error inesperado dentro de una página del sitio: se muestra dentro del
// layout (navbar y footer siguen) en vez de la pantalla en blanco de Next.
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorScreen digest={error.digest} onRetry={reset} />;
}
