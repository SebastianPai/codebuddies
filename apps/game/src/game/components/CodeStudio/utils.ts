export function format(value: number) {
  return new Intl.NumberFormat("es-CO").format(Math.round(value || 0));
}

export function secondsLabel(seconds?: number) {
  const safe = Math.max(0, Math.round(seconds ?? 0));
  if (safe < 60) return `${safe}s`;
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}m ${rest}s`;
}

export function percent(value: number) {
  return `${Math.max(0, Math.min(100, value)).toFixed(0)}%`;
}

// Compartido por BacklogView/RoadmapView/ModuleLibrary: una feature esta
// bloqueada si le falta instalar alguna de las requeridas por su cadena de
// categoria (ver seed-codestudio.ts), sin importar cuanto cash tenga.
export function isModuleLocked(module: { requirements?: { requires?: string[] } }, installedModuleSlugs: Set<string>) {
  return (module.requirements?.requires ?? []).some((slug) => !installedModuleSlugs.has(slug));
}

export function moduleRequirementNames(module: { requirements?: { requires?: string[] } }, moduleNameBySlug: Record<string, string>) {
  return (module.requirements?.requires ?? []).map((slug) => moduleNameBySlug[slug] ?? slug).join(", ");
}
