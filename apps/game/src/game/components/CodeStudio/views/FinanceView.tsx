"use client";

import { Company } from "../types";
import { format } from "../utils";
import { Kpis, ProgressRow } from "../widgets";
import { useTranslation } from "../../../../i18n/useTranslation";

export default function FinanceView({ company }: { company: Company }) {
  const t = useTranslation();
  const profit = company.revenue - company.expenses;
  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-6">
        <h3>{t("codestudioOps.finance.title")}</h3>
        <Kpis company={company} />
      </section>
      <section className="cs-panel cs-span-6">
        <h3>{t("codestudioOps.finance.burnRateTitle")}</h3>
        <ProgressRow label={t("codestudioOps.finance.incomeLabel")} value={company.revenue} max={Math.max(1, company.revenue + company.expenses)} hint={`$${format(company.revenue)}`} />
        <ProgressRow label={t("codestudioOps.finance.expensesLabel")} value={company.expenses} max={Math.max(1, company.revenue + company.expenses)} hint={`$${format(company.expenses)}`} />
        <div className={`cs-profit ${profit >= 0 ? "positive" : "negative"}`}>
          {profit >= 0 ? t("codestudioOps.finance.profitable") : t("codestudioOps.finance.burningCash")} · ${format(Math.abs(profit))}
        </div>
      </section>
    </div>
  );
}
