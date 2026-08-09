"use client";

import { Company } from "../types";
import { useTranslation } from "../../../../i18n/useTranslation";

export default function AppTreeView({ company }: { company: Company }) {
  const t = useTranslation();
  return (
    <div className="cs-panel">
      <h3>{t("codestudioGeneral.appTree.title")}</h3>
      <p className="cs-muted">{t("codestudioGeneral.appTree.description")}</p>
      <div className="cs-tree">
        {company.modules.map((entry, index) => (
          <div key={entry.module.id} className="cs-node-wrap">
            <div className="cs-node">
              <span>{index + 1}</span>
              <b>{entry.module.name}</b>
              <small>{entry.module.category}</small>
            </div>
            {index < company.modules.length - 1 && <i />}
          </div>
        ))}
      </div>
    </div>
  );
}
