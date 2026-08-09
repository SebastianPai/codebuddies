import { useLanguage } from "./LanguageContext";

// Uso: const t = useTranslation(); ... t("settings.title")
export function useTranslation() {
  return useLanguage().t;
}
