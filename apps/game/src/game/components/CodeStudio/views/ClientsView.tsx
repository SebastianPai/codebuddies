"use client";

import { Company } from "../types";
import { makeClients } from "../mockData";
import { ProgressRow } from "../widgets";
import { useTranslation } from "../../../../i18n/useTranslation";

const SEVERITY_KEY: Record<Company["bugReports"][number]["severity"], string> = {
  LOW: "codestudioOps.development.severityLow",
  MEDIUM: "codestudioOps.development.severityMedium",
  HIGH: "codestudioOps.development.severityHigh",
  CRITICAL: "codestudioOps.development.severityCritical",
};

export default function ClientsView({
  clients,
  bugReports,
}: {
  clients: ReturnType<typeof makeClients>;
  bugReports: Company["bugReports"];
}) {
  const t = useTranslation();
  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-8">
        <h3>{t("codestudioGeneral.clients.title")}</h3>
        <div className="cs-client-grid">
          {clients.map((client) => (
            <article key={client.name}>
              <span>{client.type}</span>
              <b>{client.name}</b>
              <p>&ldquo;{client.comment}&rdquo;</p>
              <ProgressRow
                label={t("codestudioGeneral.clients.satisfactionLabel")}
                value={client.satisfaction}
                max={100}
                hint={t("codestudioGeneral.clients.ratingHint", { rating: client.rating.toFixed(1) })}
              />
            </article>
          ))}
        </div>
      </section>
      <section className="cs-panel cs-span-4">
        <h3>{t("codestudioGeneral.clients.reportedIssuesTitle")}</h3>
        <p className="cs-muted">{t("codestudioGeneral.clients.reportedIssuesHint")}</p>
        {bugReports.length === 0 && <p className="cs-muted">{t("codestudioOps.development.noBugs")}</p>}
        {bugReports.map((bug) => (
          <article key={bug.id} className="cs-bug">
            <span className={bug.severity.toLowerCase()}>{t(SEVERITY_KEY[bug.severity])}</span>
            <b>{bug.title}</b>
            <p>{bug.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
