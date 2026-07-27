export class CreateModuleTranslationDto {
  languageCode: string; // 'es', 'en', 'zh-Hans', etc.
  title: string;
  description?: string;
}

export class CreateModuleDto {
  translations: CreateModuleTranslationDto[];
  // Si más adelante quieres agregar campos no traducibles (ej: slug, imageUrl, etc.), se ponen aquí
}
