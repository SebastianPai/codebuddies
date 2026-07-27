import { useLanguage } from "./LanguageContext";

export const useTranslation = () => {
  const context = useLanguage();
  if (!context) throw new Error("LanguageProvider is required");
  return context.t;
};
