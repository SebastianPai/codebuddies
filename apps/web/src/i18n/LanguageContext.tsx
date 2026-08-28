"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { dictionary } from "./dictionary";
import { api } from "../shared/api/client";
import { trackLanguage } from "./language-analytics";

export type Lang = "es" | "en-us" | "de";

// El locale chino (zh-Hans) fue reemplazado por alemán (de). Cualquier valor
// viejo guardado en localStorage o devuelto por la API se migra en caliente
// a "de" para no romper la preferencia de usuarios existentes.
function migrateLegacyLang(value: string | null | undefined): Lang | null {
  if (!value) return null;
  if (value === "zh-Hans" || value === "zh" || value.startsWith("zh")) return "de";
  return value as Lang;
}

type TranslationParams = Record<string, string | number>;
type TranslationDictionary = Record<string, any>;
type TranslationFunction = ((key: string, params?: TranslationParams) => string) & TranslationDictionary;

function resolveTranslation(dictionary: TranslationDictionary, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, dictionary);
  return typeof value === "string" ? value : undefined;
}

function interpolate(value: string, params?: TranslationParams): string {
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

const LanguageContext = createContext<{
  lang: Lang;
  changeLanguage: (newLang: Lang) => void;
  t: TranslationFunction;
} | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("es");

  useEffect(() => {
    const saved = migrateLegacyLang(localStorage.getItem("lang"));
    let resolved: Lang = "es";
    if (saved) {
      resolved = saved;
      setLang(saved);
      localStorage.setItem("lang", saved);
    }

    // La cuenta manda sobre el cache local: si el usuario ya eligió un
    // idioma desde apps/game (o desde otro dispositivo), se aplica acá
    // apenas responde /identity/me. Falla en silencio si no hay sesión.
    api
      .get<{ uiLanguage?: string }>("/identity/me")
      .then((profile) => {
        const remote = migrateLegacyLang(profile.uiLanguage);
        if (remote && remote !== saved) {
          resolved = remote;
          setLang(remote);
          localStorage.setItem("lang", remote);
        }
      })
      .catch(() => {})
      .finally(() => {
        // Un solo evento por carga de página, ya con el idioma definitivo
        // (localStorage o cuenta) -- no uno por el "es" por default seguido
        // de otro si la cuenta corrige el valor.
        trackLanguage(resolved);
      });
  }, []);

  const changeLanguage = (newLang: Lang) => {
    if (newLang !== lang) trackLanguage(newLang);
    localStorage.setItem("lang", newLang);
    setLang(newLang);
    // Mismo campo (User.uiLanguage) que lee/escribe apps/game — así elegir
    // el idioma acá también lo aplica en el juego, y viceversa.
    api.patch("/identity/profile", { uiLanguage: newLang }).catch(() => {});
  };

  const translations = dictionary[lang] as TranslationDictionary;
  const t = Object.assign(
    (key: string, params?: TranslationParams) =>
      interpolate(resolveTranslation(translations, key) ?? key, params),
    translations,
  ) as TranslationFunction;

  return (
    <LanguageContext.Provider value={{ lang, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
