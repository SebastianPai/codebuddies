"use client";

import { useState } from "react";
import type { CompanyView } from "./types";
import DeleteCompanyModal from "./DeleteCompanyModal";
import { useTranslation } from "../../../i18n/useTranslation";

export default function SettingsView({ company, onDeleted }: { company: CompanyView; onDeleted: () => void }) {
  const t = useTranslation();
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div className="cs2-stack">
      <section className="cs2-card">
        <h3>{t("codestudio.settings.howTitle")}</h3>
        <ul className="cs2-howto">
          <li>{t("codestudio.settings.how1")}</li>
          <li>{t("codestudio.settings.how2")}</li>
          <li>{t("codestudio.settings.how3")}</li>
          <li>{t("codestudio.settings.how4")}</li>
          <li>{t("codestudio.settings.how5")}</li>
        </ul>
      </section>

      {company.legacyFeatures.length > 0 && (
        <section className="cs2-card">
          <h4>{t("codestudio.settings.legacyTitle")}</h4>
          <p className="cs2-muted">{company.legacyFeatures.map((feature) => feature.name).join(", ")}</p>
        </section>
      )}

      <section className="cs2-card cs2-danger">
        <h3>{t("codestudio.settings.dangerTitle")}</h3>
        <p className="cs2-muted">{t("codestudio.settings.dangerHint")}</p>
        <button type="button" className="cs2-btn cs2-btn-danger" onClick={() => setShowDelete(true)}>
          {t("codestudio.settings.delete")}
        </button>
      </section>

      {showDelete && (
        <DeleteCompanyModal
          company={company}
          onClose={() => setShowDelete(false)}
          onDeleted={() => {
            setShowDelete(false);
            onDeleted();
          }}
        />
      )}
    </div>
  );
}
