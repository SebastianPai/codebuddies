"use client";

import { Company, GuideKey, ViewKey } from "../types";
import { buildTutorialSteps, formatStepLabel, getNextTutorialStep } from "../tutorialSteps";
import { useTranslation } from "../../../../i18n/useTranslation";

type Props = {
  company: Company;
  onNavigate: (view: ViewKey, guideKey?: GuideKey) => void;
};

export default function TutorialPanel({ company, onNavigate }: Props) {
  const t = useTranslation();
  const steps = buildTutorialSteps(company, t);
  const next = getNextTutorialStep(steps);
  const nextIndex = steps.indexOf(next);
  // Cuando la empresa recien se fundo (nada todavia) el panel se destaca
  // mas ancho, con tono de bienvenida en vez de "checklist" chico de
  // costado — es lo primero que ve el jugador post-fundacion.
  const justFounded = company.modules.length === 0 && company.employees.length === 0 && company.infrastructure.length === 0;

  return (
    <section className={`cs-panel cs-tutorial ${justFounded ? "cs-tutorial-founding cs-span-12" : "cs-span-3"}`}>
      <div className="cs-panel-header">
        <div>
          <h3>{t("codestudioMisc.tutorial.title")}</h3>
          <p>{t("codestudioMisc.tutorial.subtitle")}</p>
        </div>
      </div>
      <div className="cs-tutorial-next">
        <span>{next.done ? t("codestudioMisc.tutorial.nextCycle") : t("codestudioMisc.tutorial.now")}</span>
        <b>{formatStepLabel(next, nextIndex, t)}</b>
        <p>{next.hint}</p>
        <button onClick={() => onNavigate(next.view, next.guideKey)}>{t("codestudioMisc.tutorial.goToPanel")}</button>
      </div>
      <div className="cs-tutorial-steps">
        {steps.map((step, index) => (
          <button
            key={step.label}
            className={step.done ? "done" : ""}
            onClick={() => onNavigate(step.view, step.guideKey)}
          >
            <i />
            {formatStepLabel(step, index, t)}
          </button>
        ))}
      </div>
    </section>
  );
}
