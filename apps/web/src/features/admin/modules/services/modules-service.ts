import { modulesApi } from "../api/modules-api";
import type { LearningModule, ModuleTranslation } from "../types/module";

function normalizeModule(module: LearningModule): LearningModule {
  return {
    ...module,
    coursesCount: module.coursesCount ?? 0,
    translations: module.translations.map((translation) => ({
      ...translation,
      description: translation.description ?? "",
    })),
  };
}

export const modulesService = {
  async getModules(): Promise<LearningModule[]> {
    const modules = await modulesApi.getAll();
    return modules.map(normalizeModule);
  },
  async getModule(moduleId: string): Promise<LearningModule> {
    return normalizeModule(await modulesApi.getById(moduleId));
  },
  createModule(translations: ModuleTranslation[]): Promise<unknown> {
    return modulesApi.create(translations);
  },
  updateModule(
    moduleId: string,
    translations: ModuleTranslation[],
  ): Promise<unknown> {
    return modulesApi.update(moduleId, translations);
  },
  deleteModule(moduleId: string): Promise<unknown> {
    return modulesApi.delete(moduleId);
  },
};
