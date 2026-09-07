"use client";
import { useState } from "react";
import { AlertTriangle, Globe, Languages, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { autoTranslate } from "../lib/translate";
import { classNames } from "../utils/class-names";
import { FOCUS_RING } from "./styles";
import { Input } from "./input";
import { MarkdownEditor } from "./markdown-editor";
import { Select } from "./select";
import { Textarea } from "./textarea";

export interface Translation {
  languageCode: string;
  title: string;
  description: string;
  content?: unknown;
}

interface LanguageOption {
  code: string;
  name: string;
}

export interface ContentTranslationSource {
  languageCode: string;
  value: unknown;
}

// `renderContentField`: cuando se pasa (con showContent), reemplaza el
// <MarkdownEditor> plano por un editor propio (ej. el editor de bloques de
// lecciones) manteniendo el mismo flujo por idioma. `siblings` trae el
// contenido de los demás idiomas para poder ofrecer "traducir todo el
// contenido desde X".
type RenderContentField = (args: {
  value: unknown;
  onChange: (value: unknown) => void;
  languageCode: string;
  siblings: ContentTranslationSource[];
}) => React.ReactNode;

interface TranslationsFormProps {
  translations: Translation[];
  onChange: (translations: Translation[]) => void;
  availableLanguages?: LanguageOption[];
  showContent?: boolean;
  renderContentField?: RenderContentField;
}

// Los códigos tienen que ser exactamente los de Language.code en la base
// (ver prisma/seed.ts) -- "en-us" no existe ahí, solo "en".
const DEFAULT_LANGUAGES: LanguageOption[] = [
  { code: "es", name: "Español" },
  { code: "en", name: "English" },
  { code: "de", name: "Deutsch" },
];

const textLinkClasses = classNames("rounded", FOCUS_RING);

export function TranslationsForm({
  translations,
  onChange,
  availableLanguages = DEFAULT_LANGUAGES,
  showContent = false,
  renderContentField,
}: TranslationsFormProps) {
  const t = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [translatingIndex, setTranslatingIndex] = useState<number | null>(null);
  const [sourceByIndex, setSourceByIndex] = useState<Record<number, string>>({});
  const [activeIndex, setActiveIndex] = useState(0);

  // El índice activo tiene que seguir siendo válido cuando se agrega/borra un
  // idioma sin depender de un efecto.
  const active =
    translations.length === 0
      ? 0
      : Math.min(Math.max(activeIndex, 0), translations.length - 1);

  const languageName = (code: string) =>
    availableLanguages.find((language) => language.code === code)?.name ??
    code.toUpperCase();

  const canAddMore = translations.length < availableLanguages.length;

  const addTranslation = () => {
    const language = availableLanguages.find(
      ({ code }) => !translations.some((item) => item.languageCode === code),
    );
    if (!language) {
      setError(t("common.allLanguagesAdded"));
      return;
    }
    onChange([
      ...translations,
      { languageCode: language.code, title: "", description: "", content: "" },
    ]);
    setActiveIndex(translations.length);
    setError(null);
  };

  const removeTranslation = (index: number) => {
    onChange(translations.filter((_, itemIndex) => itemIndex !== index));
    setActiveIndex((current) => (current > 0 ? current - 1 : 0));
  };

  const updateTranslation = (
    index: number,
    field: keyof Translation,
    value: string,
  ) =>
    onChange(
      translations.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );

  const updateContent = (index: number, value: unknown) =>
    onChange(
      translations.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, content: value as Translation["content"] }
          : item,
      ),
    );

  // Traduce título + descripción (y el contenido markdown plano, cuando no
  // hay un editor propio) desde CUALQUIER otro idioma ya cargado.
  const translateFrom = async (index: number, sourceLangCode: string) => {
    const target = translations[index];
    const source = translations.find(
      ({ languageCode }) => languageCode === sourceLangCode,
    );
    if (!source || source.languageCode === target.languageCode) return;

    setTranslatingIndex(index);
    setError(null);
    const sourceContent =
      typeof source.content === "string" ? source.content : "";
    try {
      const [title, description, content] = await Promise.all([
        autoTranslate(source.title, target.languageCode),
        autoTranslate(source.description, target.languageCode),
        showContent && !renderContentField && sourceContent
          ? autoTranslate(sourceContent, target.languageCode)
          : Promise.resolve(""),
      ]);
      onChange(
        translations.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                title,
                description,
                content:
                  showContent && !renderContentField ? content : item.content,
              }
            : item,
        ),
      );
    } catch {
      setError(t("common.errorTranslating"));
    } finally {
      setTranslatingIndex(null);
    }
  };

  const translation = translations[active];
  const otherLangs = translation
    ? translations
        .filter((item) => item.languageCode !== translation.languageCode)
        .map((item) => item.languageCode)
    : [];
  const selectedSource =
    sourceByIndex[active] && otherLangs.includes(sourceByIndex[active])
      ? sourceByIndex[active]
      : otherLangs[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-[rgb(var(--border))] pb-3">
        <span className="mr-1 flex items-center gap-2 text-[rgb(var(--primary))]">
          <Globe size={16} />
          <h3 className="text-sm font-semibold">{t("common.translations")}</h3>
        </span>
        {/* Pestañas de idioma: solo se ve una a la vez */}
        {translations.map((item, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={classNames(
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
              FOCUS_RING,
              index === active
                ? "bg-[rgb(var(--primary))] text-[rgb(var(--button-text))]"
                : "border border-[rgb(var(--border))] text-[rgb(var(--secondary-text))] hover:text-[rgb(var(--text))]",
            )}
          >
            {languageName(item.languageCode)}
          </button>
        ))}
        {canAddMore && (
          <button
            type="button"
            onClick={addTranslation}
            className={classNames(
              "flex items-center gap-1 rounded-lg border border-dashed border-[rgb(var(--border))] px-3 py-1.5 text-sm font-medium text-[rgb(var(--secondary-text))] transition hover:border-[rgb(var(--primary))] hover:text-[rgb(var(--text))]",
              FOCUS_RING,
            )}
          >
            <Plus size={14} />
            {t("common.addLanguage")}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-[rgb(var(--cb-warning))] bg-[rgb(var(--cb-warning)/0.1)] p-3 text-sm text-[rgb(var(--warning-text))]">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {translation && (
        <div className="space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[rgb(var(--secondary-text))]">
                {t("common.language")}
              </span>
              <Select
                value={translation.languageCode}
                onChange={(event) =>
                  updateTranslation(active, "languageCode", event.target.value)
                }
                className="py-1 text-xs"
              >
                {availableLanguages.map((language) => (
                  <option
                    key={language.code}
                    value={language.code}
                    disabled={translations.some(
                      (item, itemIndex) =>
                        itemIndex !== active &&
                        item.languageCode === language.code,
                    )}
                  >
                    {language.name}
                  </option>
                ))}
              </Select>
            </div>
            {translations.length > 1 && (
              <button
                type="button"
                onClick={() => removeTranslation(active)}
                className={classNames(
                  "flex items-center gap-1 text-sm text-[rgb(var(--error-text))] transition hover:opacity-80",
                  textLinkClasses,
                )}
              >
                <Trash2 size={14} />
                {t("common.delete")}
              </button>
            )}
          </div>

          {otherLangs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-2">
              <Languages
                size={14}
                className="text-[rgb(var(--secondary-text))]"
              />
              <span className="text-xs text-[rgb(var(--secondary-text))]">
                {t("common.translateFromLabel")}
              </span>
              <Select
                value={selectedSource}
                onChange={(event) =>
                  setSourceByIndex((current) => ({
                    ...current,
                    [active]: event.target.value,
                  }))
                }
                className="py-1 text-xs"
              >
                {otherLangs.map((code) => (
                  <option key={code} value={code}>
                    {languageName(code)}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                disabled={translatingIndex === active}
                onClick={() => void translateFrom(active, selectedSource)}
                className={classNames(
                  "text-xs font-semibold text-[rgb(var(--primary))] transition hover:opacity-80 disabled:opacity-50",
                  textLinkClasses,
                )}
              >
                {translatingIndex === active
                  ? t("common.loading")
                  : t("common.translate")}
              </button>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-[rgb(var(--secondary-text))]">
              {t("common.title")}
            </label>
            <Input
              value={translation.title}
              onChange={(event) =>
                updateTranslation(active, "title", event.target.value)
              }
              placeholder={t("common.titlePlaceholder")}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[rgb(var(--secondary-text))]">
              {t("common.description")}
            </label>
            <Textarea
              value={translation.description}
              onChange={(event) =>
                updateTranslation(active, "description", event.target.value)
              }
              rows={2}
              placeholder={t("common.descriptionPlaceholder")}
            />
          </div>

          {showContent && (
            <div>
              <label className="mb-1 block text-xs text-[rgb(var(--secondary-text))]">
                {t("common.contentMarkdown")}
              </label>
              {renderContentField ? (
                renderContentField({
                  value: translation.content,
                  onChange: (value) => updateContent(active, value),
                  languageCode: translation.languageCode,
                  siblings: translations
                    .filter(
                      (item) =>
                        item.languageCode !== translation.languageCode,
                    )
                    .map((item) => ({
                      languageCode: item.languageCode,
                      value: item.content,
                    })),
                })
              ) : (
                <MarkdownEditor
                  value={
                    typeof translation.content === "string"
                      ? translation.content
                      : ""
                  }
                  onChange={(value) =>
                    updateTranslation(active, "content", value)
                  }
                  rows={8}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TranslationsForm;
