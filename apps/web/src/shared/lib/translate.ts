import { api } from "@/shared/api";

interface TranslationResponse {
  translated?: string | string[];
}

export async function autoTranslate(
  text: string,
  targetLang: string,
): Promise<string> {
  if (!text) return "";

  try {
    const response = await api.post<TranslationResponse>("/translate", {
      text,
      targetLang,
    });
    return typeof response.translated === "string" ? response.translated : text;
  } catch {
    return text;
  }
}

/**
 * Traduce muchos textos en UNA sola request (DeepL los procesa por lote).
 * Devuelve un array del mismo largo y orden; si algo falla, devuelve los
 * originales para no dejar campos vacíos.
 */
export async function autoTranslateMany(
  texts: string[],
  targetLang: string,
): Promise<string[]> {
  const source = texts.map((value) => value ?? "");
  if (source.every((value) => !value.trim())) return source;

  try {
    const response = await api.post<TranslationResponse>("/translate", {
      text: source,
      targetLang,
    });
    const translated = response.translated;
    return Array.isArray(translated) && translated.length === source.length
      ? translated
      : source;
  } catch {
    return source;
  }
}
