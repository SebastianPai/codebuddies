"use client";

import { Globe } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { useApiLang } from "@/shared/hooks/use-api-lang";

const NAME_KEYS: Record<string, string> = {
  es: "site.courseLangNameEs",
  en: "site.courseLangNameEn",
  de: "site.courseLangNameDe",
};

/**
 * Si el curso no está completo en el idioma del alumno, devuelve los idiomas
 * en que sí está ("español", "español e inglés"). Si está en su idioma, o la
 * API no mandó la lista, devuelve null y no se muestra nada.
 */
export function useCourseLanguages(languages?: string[] | null): string | null {
  const t = useTranslation();
  const lang = useApiLang();
  if (!languages || languages.length === 0 || languages.includes(lang)) return null;
  const names = languages.filter((code) => NAME_KEYS[code]).map((code) => t(NAME_KEYS[code]));
  if (names.length === 0) return null;
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} ${t("site.courseLangAnd")} ${names[names.length - 1]}`;
}

/** Etiqueta discreta para la tarjeta del catálogo. */
export function CourseLanguagePill({ languages }: { languages?: string[] | null }) {
  const t = useTranslation();
  const langs = useCourseLanguages(languages);
  if (!langs) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--border))] px-2.5 py-0.5 text-xs font-semibold text-[rgb(var(--secondary-text))]">
      <Globe size={12} aria-hidden />
      {t("site.courseLangOnly", { langs })}
    </span>
  );
}

/** Aviso en la página del curso: informa sin alarmar. */
export function CourseLanguageNotice({ languages }: { languages?: string[] | null }) {
  const t = useTranslation();
  const langs = useCourseLanguages(languages);
  if (!langs) return null;
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.6)] px-4 py-3 text-sm text-[rgb(var(--secondary-text))]"
    >
      <Globe size={18} className="mt-0.5 shrink-0 text-[rgb(var(--primary))]" aria-hidden />
      <p>{t("site.courseLangNotice", { langs })}</p>
    </div>
  );
}
