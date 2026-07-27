export interface ModuleTranslation {
  languageCode: string;
  title: string;
  description: string;
}

export interface LearningModule {
  id: string;
  translations: ModuleTranslation[];
  createdAt: string;
  coursesCount: number;
}

export interface ModuleTableRow {
  id: string;
  title: string;
  description: string;
  coursesCount: number;
  createdAt: string;
}
