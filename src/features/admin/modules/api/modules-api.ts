import { api } from "@/shared/api/client";

import type { LearningModule, ModuleTranslation } from "../types/module";

export const modulesApi = {
  getAll: () => api.get<LearningModule[]>("/modules/admin"),
  getById: (moduleId: string) =>
    api.get<LearningModule>(`/modules/admin/${moduleId}`),
  create: (translations: ModuleTranslation[]) =>
    api.post("/modules", { translations }),
  update: (moduleId: string, translations: ModuleTranslation[]) =>
    api.patch(`/modules/${moduleId}`, { translations }),
  delete: (moduleId: string) => api.delete(`/modules/${moduleId}`),
};
