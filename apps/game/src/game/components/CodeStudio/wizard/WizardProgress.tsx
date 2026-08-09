"use client";

import { useTranslation } from "../../../../i18n/useTranslation";

export default function WizardProgress({ step, total }: { step: number; total: number }) {
  const t = useTranslation();
  const percent = Math.round(((step + 1) / total) * 100);

  return (
    <div className="cs-wizard-progress">
      <div className="cs-wizard-progress-label">
        <span>{t("codestudioGeneral.wizard.progressLabel", { step: step + 1, total })}</span>
        <span>{percent}%</span>
      </div>
      <div className="cs-wizard-progress-track">
        <div className="cs-wizard-progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
