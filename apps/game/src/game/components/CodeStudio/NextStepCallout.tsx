"use client";

import { Company, GuideKey, ViewKey } from "./types";
import { buildTutorialSteps, formatStepLabel, getNextTutorialStep } from "./tutorialSteps";
import { useTranslation } from "../../../i18n/useTranslation";

type Props = {
  company: Company;
  onNavigate: (view: ViewKey, guideKey?: GuideKey) => void;
};

// Mismo "que sigue" que ya usa TutorialPanel en el dashboard, pero incrustado
// directo en la pantalla donde el jugador acaba de actuar (contratar,
// instalar infra, desarrollar) — asi no tiene que volver solo al dashboard
// para enterarse de cual es el proximo paso.
export default function NextStepCallout({ company, onNavigate }: Props) {
  const t = useTranslation();
  const steps = buildTutorialSteps(company, t);
  const next = getNextTutorialStep(steps);
  const nextIndex = steps.indexOf(next);
  return (
    <div className="cs-next-callout">
      <span>{next.done ? t("codestudioMisc.tutorial.nextCycle") : t("codestudioMisc.tutorial.now")}</span>
      <b>{formatStepLabel(next, nextIndex, t)}</b>
      <p>{next.hint}</p>
      <button onClick={() => onNavigate(next.view, next.guideKey)}>{t("codestudioMisc.tutorial.goToPanel")}</button>
    </div>
  );
}
