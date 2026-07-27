"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { dictionary } from "./dictionary";

type Lang = "es" | "en-us" | "zh-Hans";

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
    if (saved) setLang(saved);
  }, []);

  const changeLanguage = (newLang: Lang) => {
    localStorage.setItem("lang", newLang);
    setLang(newLang);
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
