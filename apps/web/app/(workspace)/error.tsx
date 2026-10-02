"use client";

import { useEffect } from "react";
import ErrorScreen from "../../components/system/ErrorScreen";
import { recoverFromStaleBuild } from "@/shared/utils/stale-build";

// Error dentro del editor de ejercicios: se muestra dentro del layout (con
// navbar) en vez de la pantalla global. Si es una versión vieja de la web
// tras un deploy, recarga sola.
export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    recoverFromStaleBuild(error);
  }, [error]);

  return <ErrorScreen digest={error.digest} onRetry={reset} />;
}
