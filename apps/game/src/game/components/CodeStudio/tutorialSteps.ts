import { Company, GuideKey, ViewKey } from "./types";

type TFn = (key: string, params?: Record<string, string | number>) => string;

export type TutorialStep = {
  label: string;
  done: boolean;
  hint: string;
  view: ViewKey;
  guideKey?: GuideKey;
  // Solo en los pasos con un umbral numerico (ej. "3 features instaladas")
  // — deja mostrar un contador tipo "2/3" en vez de que el jugador tenga
  // que adivinar cuanto le falta.
  progress?: { current: number; target: number };
};

// Compartido por TutorialPanel (panel del dashboard) y DevelopmentView (CTA
// de "que sigue" cuando no queda ninguna tarea activa) para que ambos
// muestren siempre el mismo proximo paso.
export function buildTutorialSteps(company: Company, t: TFn): TutorialStep[] {
  return [
    {
      label: t("codestudioMisc.tutorial.step0Label"),
      done: company.modules.length >= 1 || company.development.length > 0,
      hint: t("codestudioMisc.tutorial.step0Hint"),
      view: "backlog",
      guideKey: "feature",
    },
    {
      label: t("codestudioMisc.tutorial.stepHireLabel"),
      done: company.employees.length >= 1,
      hint: t("codestudioMisc.tutorial.stepHireHint"),
      view: "employees",
      guideKey: "hire",
    },
    {
      label: t("codestudioMisc.tutorial.stepInfraLabel"),
      done: company.infrastructure.length >= 1,
      hint: t("codestudioMisc.tutorial.stepInfraHint"),
      view: "infrastructure",
      guideKey: "infra",
    },
    {
      label: t("codestudioMisc.tutorial.step1Label"),
      done: company.modules.length >= 3,
      hint: t("codestudioMisc.tutorial.step1Hint"),
      view: "apps",
      progress: { current: Math.min(3, company.modules.length), target: 3 },
    },
    {
      label: t("codestudioMisc.tutorial.step3Label"),
      done: company.activeUsers > 0,
      hint: t("codestudioMisc.tutorial.step3Hint"),
      view: "clients",
    },
    {
      label: t("codestudioMisc.tutorial.step4Label"),
      done: company.stability >= 96 && company.latency <= 180,
      hint: t("codestudioMisc.tutorial.step4Hint"),
      view: "infrastructure",
    },
    {
      label: t("codestudioMisc.tutorial.step5Label"),
      done: company.modules.length >= 6,
      hint: t("codestudioMisc.tutorial.step5Hint"),
      view: "roadmap",
      progress: { current: Math.min(6, company.modules.length), target: 6 },
    },
  ];
}

export function getNextTutorialStep(steps: TutorialStep[]): TutorialStep {
  return steps.find((step) => !step.done) ?? steps[steps.length - 1];
}

// Numera cada paso por su POSICION real en el array (1..N), en vez de tener
// el numero incrustado a mano en cada string de traduccion — asi nunca mas
// se puede saltar de "3." a "5." sin que exista un "4." real en el medio.
// Si el paso tiene progress (ej. "3 features"), agrega el contador "2/3".
export function formatStepLabel(step: TutorialStep, index: number, t: TFn): string {
  const numbered = `${index + 1}. ${step.label}`;
  if (!step.progress) return numbered;
  return t("codestudioMisc.tutorial.progressSuffix", {
    label: numbered,
    current: step.progress.current,
    target: step.progress.target,
  });
}
