// Forma de una traducción del contenido fijo de CodeStudio. El español es
// la fuente (content/*.ts); en.ts y de.ts reemplazan los textos por clave.
// codestudio-i18n.spec.ts verifica que no falte ninguna clave.
export type BugTranslation = {
  title: string;
  symptom: string;
  // Solo si la evidencia original tiene texto en español.
  evidence?: string[];
  lesson: string;
  preventHint?: string;
  options: Record<string, { label: string; feedback: string }>;
};

export type ContentTranslation = {
  branches: Record<string, { name: string; description: string }>;
  features: Record<string, { name: string; description: string; lesson: string }>;
  stages: Record<number, { name: string; tagline: string; goals: string[] }>;
  milestones: Record<string, { name: string; description: string; howTo: string }>;
  roles: Record<string, { name: string; description: string }>;
  hosting: Record<string, { name: string; description: string }>;
  appTypes: Record<string, { name: string; category: string; description: string }>;
  channels: Record<string, string>;
  bugs: Record<string, BugTranslation>;
};
