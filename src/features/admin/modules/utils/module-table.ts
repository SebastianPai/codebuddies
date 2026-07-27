import type { LearningModule, ModuleTableRow } from "../types/module";

export function toModuleTableRows(
  modules: LearningModule[],
  untitledLabel: string,
): ModuleTableRow[] {
  return modules.map((module) => {
    const translation =
      module.translations.find(({ languageCode }) => languageCode === "es") ??
      module.translations[0];

    return {
      id: module.id,
      title: translation?.title ?? untitledLabel,
      description: translation?.description ?? "-",
      coursesCount: module.coursesCount,
      createdAt: module.createdAt,
    };
  });
}
