import type { ModuleTranslation } from "../types/module";

export const MODULES_ROUTE = "/admin/modules";
export const MODULE_REDIRECT_DELAY_MS = 1200;

export const INITIAL_MODULE_TRANSLATIONS: ModuleTranslation[] = [
  { languageCode: "es", title: "", description: "" },
];
