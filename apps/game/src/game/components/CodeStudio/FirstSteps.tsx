"use client";

import { Check } from "lucide-react";
import type { CompanyView, ViewKey } from "./types";
import { useTranslation } from "../../../i18n/useTranslation";

// Lista de "Primeros pasos" del Panel para empresas recién fundadas: lo
// mínimo para que la app tenga usuarios. Se oculta sola al completarla.

type Step = { key: string; view: ViewKey; done: boolean };

function built(company: CompanyView, slug: string) {
  return company.tree.some((node) => node.slug === slug && node.state === "installed");
}

export function firstSteps(company: CompanyView): Step[] {
  return [
    { key: "landing", view: "tree", done: built(company, "landing") },
    { key: "auth", view: "tree", done: built(company, "auth") },
    { key: "core", view: "tree", done: built(company, "core-feature") },
    { key: "server", view: "infra", done: company.hosting.length > 0 },
    { key: "hire", view: "team", done: company.employees.length > 0 },
    { key: "campaign", view: "marketing", done: company.marketing.summary.some((entry) => entry.runs > 0) },
  ];
}

export default function FirstSteps({ company, onNavigate }: { company: CompanyView; onNavigate: (view: ViewKey) => void }) {
  const t = useTranslation();
  const steps = firstSteps(company);
  const done = steps.filter((step) => step.done).length;
  if (done === steps.length) return null;
  const nextIndex = steps.findIndex((step) => !step.done);

  return (
    <section className="cs2-card cs2-firststeps">
      <h4>
        {t("codestudio.firstSteps.title")} · {t("codestudio.firstSteps.progress", { done, total: steps.length })}
      </h4>
      <ol>
        {steps.map((step, index) => (
          <li key={step.key} className={step.done ? "done" : index === nextIndex ? "next" : ""}>
            <i>{step.done ? <Check size={12} /> : index + 1}</i>
            <span>{t(`codestudio.firstSteps.${step.key}`)}</span>
            {!step.done && (
              <button type="button" onClick={() => onNavigate(step.view)}>
                {t("codestudio.firstSteps.go")}
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
