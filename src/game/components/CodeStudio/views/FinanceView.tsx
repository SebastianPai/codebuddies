"use client";

import { Company } from "../types";
import { format } from "../utils";
import { Kpis, ProgressRow } from "../widgets";

export default function FinanceView({ company }: { company: Company }) {
  const profit = company.revenue - company.expenses;
  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-6">
        <h3>Finanzas</h3>
        <Kpis company={company} />
      </section>
      <section className="cs-panel cs-span-6">
        <h3>Burn rate</h3>
        <ProgressRow label="Ingresos" value={company.revenue} max={Math.max(1, company.revenue + company.expenses)} hint={`$${format(company.revenue)}`} />
        <ProgressRow label="Gastos" value={company.expenses} max={Math.max(1, company.revenue + company.expenses)} hint={`$${format(company.expenses)}`} />
        <div className={`cs-profit ${profit >= 0 ? "positive" : "negative"}`}>{profit >= 0 ? "Rentable" : "Quemando caja"} · ${format(Math.abs(profit))}</div>
      </section>
    </div>
  );
}
