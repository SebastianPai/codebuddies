"use client";

import { useTrackToolAction } from "../../../../components/analytics/tool-tracking";

// La página de verificación (page.tsx) es un server component: solo llega a
// renderizar este componente cuando ya confirmó del lado del server que el
// certificado existe y es válido -- por eso el "éxito" de la acción
// "verify" está garantizado con solo montarse acá, nunca en la rama de
// "certificado inválido".
export function CertificateVerifiedTracker() {
  useTrackToolAction("certificates", "certification", "verify");
  return null;
}
