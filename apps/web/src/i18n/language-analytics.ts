import type { Lang } from "./LanguageContext";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

// GA4 quiere códigos limpios (es/en/de), pero el valor interno de inglés es
// "en-us" (ver Lang en LanguageContext.tsx) -- se normaliza acá para no
// filtrar el detalle interno hacia afuera ni tener que tocar el tipo `Lang`
// existente (usado en todo el sitio para resolver el diccionario de
// traducciones).
const GA4_LANGUAGE_CODE: Record<Lang, "es" | "en" | "de"> = {
  es: "es",
  "en-us": "en",
  de: "de",
};

let lastTrackedLang: Lang | null = null;

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
    language: GA4_LANGUAGE_CODE[lang],
  });
}
