"use client";

import { useState } from "react";
import { Company } from "../types";
import { useTranslation } from "../../../../i18n/useTranslation";
import DeleteCompanyModal from "../DeleteCompanyModal";

export default function SettingsView({
  company,
  onCompanyDeleted,
}: {
  company: Company;
  onCompanyDeleted: () => void;
}) {
  const t = useTranslation();
  const [showDelete, setShowDelete] = useState(false);

  return (
    <section className="cs-panel">
      <h3>{t("codestudioMisc.settingsView.title")}</h3>
      <p className="cs-muted">{t("codestudioMisc.settingsView.description")}</p>
      <div className="cs-settings">
        <label><input type="checkbox" defaultChecked /> {t("codestudioMisc.settingsView.eventNotifications")}</label>
        <label><input type="checkbox" defaultChecked /> {t("codestudioMisc.settingsView.developmentAnimations")}</label>
        <label><input type="checkbox" defaultChecked /> {t("codestudioMisc.settingsView.syncOnOpen")}</label>
      </div>

      <div className="cs-danger-zone">
        <h3>{t("codestudioMisc.deleteCompany.dangerZoneTitle")}</h3>
        <p className="cs-muted">{t("codestudioMisc.deleteCompany.dangerZoneHint")}</p>
        <button type="button" className="cs-danger-button" onClick={() => setShowDelete(true)}>
          {t("codestudioMisc.deleteCompany.openButton")}
        </button>
      </div>

      {showDelete && (
        <DeleteCompanyModal
          company={company}
          onClose={() => setShowDelete(false)}
          onDeleted={() => {
            setShowDelete(false);
            onCompanyDeleted();
          }}
        />
      )}

      <pre>{JSON.stringify({ companyId: company.id, status: company.status }, null, 2)}</pre>
    </section>
  );
}
