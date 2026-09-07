"use client";

import { useLanguage } from "@/i18n/LanguageContext";

// El switcher del navbar usa "en-us", pero Language.code en la base es "en".
// Este hook devuelve el idioma de UI activo (reactivo) ya normalizado al set
// de códigos que entiende la API, para usar en las queries `?lang=`.
export function useApiLang(): string {
  const lang = useLanguage()?.lang;
  if (!lang) return "es";
  return lang === "en-us" ? "en" : lang;
}
