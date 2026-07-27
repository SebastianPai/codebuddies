import type { ModuleTranslation } from "../types/module";
export function getTranslationsValidationError(translations: ModuleTranslation[]): string | null { if (translations.length === 0) return "admin.validationTranslationRequired"; if (translations.some((translation) => !translation.title.trim())) return "admin.validationTitlesRequired"; return null; }
