"use client";

// Mismo mecanismo que apps/web/src/i18n (diccionario armado en build-time a
// partir de JSON por namespace), pero con una API más simple a propósito:
// acá `t` es SOLO función (`t("namespace.key")`), sin el híbrido
// función+objeto de la web — todo este código es nuevo, no hace falta esa
// compatibilidad extra.
//
// El idioma se guarda en la CUENTA del usuario (User.uiLanguage en la API,
// mismo campo que usa apps/web) para que "elegís en Configuración" valga
// para las dos apps — localStorage acá es solo un cache para pintar rápido
// antes de que responda /identity/me, no la fuente de verdad.

import { createContext, useContext, useEffect, useState } from "react";
import { dictionary } from "./dictionary";
import { getCurrentUser } from "../game/network/auth";
import { apiPatch } from "../game/network/http";

export type Lang = "es" | "en-us" | "de";

// El locale chino (zh-Hans) fue reemplazado por alemán (de). Cualquier valor
// viejo persistido (localStorage o User.uiLanguage) se migra en caliente a
// "de" para no romper la preferencia de usuarios existentes.
function migrateLegacyLang(value: string | null | undefined): Lang | null {
  if (!value) return null;
  if (value === "zh-Hans" || value === "zh" || value.startsWith("zh")) return "de";
  return value as Lang;
}

type TranslationParams = Record<string, string | number>;
type TranslationDictionary = Record<string, unknown>;

const LANG_STORAGE_KEY = "lang";

function resolveTranslation(dict: TranslationDictionary, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, dict);
  return typeof value === "string" ? value : undefined;
}

function interpolate(value: string, params?: TranslationParams): string {
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

type LanguageContextValue = {
  lang: Lang;
  changeLanguage: (lang: Lang) => void;
  t: (key: string, params?: TranslationParams) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("es");

  useEffect(() => {
    const cached = migrateLegacyLang(localStorage.getItem(LANG_STORAGE_KEY));
    if (cached) {
      setLang(cached);
      localStorage.setItem(LANG_STORAGE_KEY, cached);
    }

    // La cuenta manda: si el usuario ya eligió un idioma desde cualquiera de
    // las dos apps, pisa el cache local apenas responde /identity/me.
    void getCurrentUser().then((user) => {
      const remote = migrateLegacyLang((user as { uiLanguage?: string } | null)?.uiLanguage);
      if (remote && remote !== cached) {
        setLang(remote);
        localStorage.setItem(LANG_STORAGE_KEY, remote);
      }
    });
  }, []);

  const changeLanguage = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem(LANG_STORAGE_KEY, newLang);
    // Best-effort: si falla (offline, sesión vencida) el idioma igual queda
    // aplicado en esta pestaña vía localStorage, solo no se sincroniza con
    // la otra app hasta el próximo cambio exitoso.
    apiPatch("/identity/profile", { uiLanguage: newLang }).catch(() => {});
  };

  const translations = (dictionary[lang] ?? dictionary.es) as TranslationDictionary;
  const t = (key: string, params?: TranslationParams) =>
    interpolate(resolveTranslation(translations, key) ?? key, params);

  return <LanguageContext.Provider value={{ lang, changeLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage debe usarse dentro de <LanguageProvider>");
  return context;
}

// Para código que corre fuera del árbol de React (p. ej. network/socket.ts,
// un singleton a nivel de módulo que no puede usar useLanguage()) — mismo
// diccionario y misma clave de localStorage que usa LanguageProvider, sin
// depender del contexto.
export function translate(key: string, params?: TranslationParams): string {
  const cached = typeof window !== "undefined" ? localStorage.getItem(LANG_STORAGE_KEY) : null;
  const lang = migrateLegacyLang(cached) ?? "es";
  const translations = (dictionary[lang] ?? dictionary.es) as TranslationDictionary;
  return interpolate(resolveTranslation(translations, key) ?? key, params);
}
