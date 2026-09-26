import type { BugScenario } from '../bugs';
import { MILESTONE_BY_KEY, STAGES } from '../progression';
import { DE } from './de';
import { EN } from './en';
import type { Lang } from './localized';
import type { ContentTranslation } from './types';

export * from './localized';
export { MSG } from './messages';

// null = español (la fuente, content/*.ts).
export function contentFor(lang: Lang): ContentTranslation | null {
  if (lang === 'en') return EN;
  if (lang === 'de') return DE;
  return null;
}

export function localizeScenario(scenario: BugScenario, lang: Lang): BugScenario {
  const t = contentFor(lang)?.bugs[scenario.key];
  if (!t) return scenario;
  return {
    ...scenario,
    title: t.title,
    symptom: t.symptom,
    evidence: t.evidence ?? scenario.evidence,
    lesson: t.lesson,
    preventHint: t.preventHint ?? scenario.preventHint,
    options: scenario.options.map((option) => ({ ...option, ...(t.options[option.key] ?? {}) })),
  };
}

export function stageText(index: number, lang: Lang) {
  const stage = STAGES[index];
  const t = contentFor(lang)?.stages[index];
  return {
    name: t?.name ?? stage?.name ?? String(index),
    tagline: t?.tagline ?? stage?.tagline ?? '',
    goals: stage?.goals.map((goal, position) => t?.goals[position] ?? goal.label) ?? [],
  };
}

export function milestoneText(key: string, lang: Lang) {
  const milestone = MILESTONE_BY_KEY.get(key);
  const t = contentFor(lang)?.milestones[key];
  return { name: t?.name ?? milestone?.name ?? key, description: t?.description ?? milestone?.description ?? '' };
}
