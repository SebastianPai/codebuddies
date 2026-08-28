import type { Lang } from "./LanguageContext";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

// GA4 quiere códigos limpios (es/en/de/...), pero algún valor interno de
// Lang trae región (ej. "en-us") u otro formato -- se normaliza acá sin
// depender de un Record<Lang, ...> exhaustivo a propósito: esto tiene que
// seguir compilando y funcionando aunque cambie el set de idiomas
// soportados (ver Lang en LanguageContext.tsx), sin tocar este archivo.
// Cualquier valor no listado cae al fallback: el prefijo antes del guion.
const GA4_LANGUAGE_CODE: Record<string, string> = {
  es: "es",
  "en-us": "en",
  de: "de",
};

function toGa4LanguageCode(lang: string): string {
  return GA4_LANGUAGE_CODE[lang] ?? lang.split("-")[0];
}

let lastTrackedLang: string | null = null;

// Empuja "language_change" al dataLayer -- nunca crea ni configura ninguna
// tag/trigger de GTM, eso se hace en tagmanager.google.com. No duplica: si
// ya se envió este mismo idioma (esta pestaña, esta carga de página), no
// vuelve a empujar. Inerte sin NEXT_PUBLIC_GTM_CONTAINER_ID -- no tiene
// sentido trackear un GTM que no está cargado.
export function trackLanguage(lang: Lang) {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_GTM_CONTAINER_ID) return;
  if (lastTrackedLang === lang) return;

  lastTrackedLang = lang;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "language_change",
    language: toGa4LanguageCode(lang),
  });
}
