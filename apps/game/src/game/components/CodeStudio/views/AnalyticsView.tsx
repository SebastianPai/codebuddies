"use client";

import { Company } from "../types";
import { MiniChart } from "../widgets";
import { useTranslation } from "../../../../i18n/useTranslation";

export default function AnalyticsView({ company }: { company: Company }) {
  const t = useTranslation();
  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-6">
        <MiniChart snapshots={company.snapshots} metric="activeUsers" label={t("codestudioGeneral.analytics.usersLabel")} />
      </section>
      <section className="cs-panel cs-span-6">
        <MiniChart snapshots={company.snapshots} metric="revenue" label={t("codestudioGeneral.analytics.revenueLabel")} />
      </section>
      <section className="cs-panel cs-span-6">
        <MiniChart snapshots={company.snapshots} metric="expenses" label={t("codestudioGeneral.analytics.expensesLabel")} />
      </section>
      <section className="cs-panel cs-span-6">
        <MiniChart snapshots={company.snapshots} metric="rating" label={t("codestudioGeneral.analytics.ratingLabel")} />
      </section>
      <section className="cs-panel cs-span-6">
        <MiniChart snapshots={company.snapshots} metric="retention" label={t("codestudioGeneral.analytics.retentionLabel")} />
      </section>
      <section className="cs-panel cs-span-6">
        <MiniChart snapshots={company.snapshots} metric="conversion" label={t("codestudioGeneral.analytics.conversionLabel")} />
      </section>
    </div>
  );
}
