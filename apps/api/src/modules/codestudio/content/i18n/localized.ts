// Idiomas del contenido de CodeStudio. El juego usa "es" | "en-us" | "de";
// la API los normaliza a es/en/de (ver langFromHeader).
export type Lang = 'es' | 'en' | 'de';

export type Localized = { es: string; en: string; de: string };

export const L = (es: string, en: string, de: string): Localized => ({ es, en, de });

export function pick(text: Localized | string, lang: Lang) {
  if (typeof text === 'string') return text;
  return text[lang] ?? text.es;
}

// El cliente manda su idioma en el header X-Lang (el mismo valor que guarda
// en localStorage "lang"). Cualquier cosa desconocida cae en español.
export function langFromHeader(value?: string | string[] | null): Lang {
  const raw = (Array.isArray(value) ? value[0] : value ?? '').toLowerCase();
  if (raw.startsWith('en')) return 'en';
  if (raw.startsWith('de')) return 'de';
  return 'es';
}
