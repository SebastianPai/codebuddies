"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { dictionary } from "./dictionary";
import { api } from "../shared/api/client";
import { trackLanguage } from "./language-analytics";

export type Lang = "es" | "en-us" | "zh-Hans";

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
    const saved = localStorage.getItem("lang") as Lang;
    let resolved: Lang = "es";
    if (saved) {
      resolved = saved;
      setLang(saved);
    }

    // La cuenta manda sobre el cache local: si el usuario ya eligió un
    // idioma desde apps/game (o desde otro dispositivo), se aplica acá
    // apenas responde /identity/me. Falla en silencio si no hay sesión.
    api
      .get<{ uiLanguage?: Lang }>("/identity/me")
      .then((profile) => {
        if (profile.uiLanguage && profile.uiLanguage !== saved) {
          resolved = profile.uiLanguage;
          setLang(profile.uiLanguage);
          localStorage.setItem("lang", profile.uiLanguage);
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
