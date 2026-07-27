import { api } from "@/shared/api";

interface TranslationResponse {
  translated?: string;
}

export async function autoTranslate(text: string, targetLang: string): Promise<string> {
  if (!text) return "";

  try {
    const response = await api.post<TranslationResponse>("/translate", {
      text,
      targetLang,
    });
    return response.translated ?? "";
  } catch {
    return text;
  }
}
