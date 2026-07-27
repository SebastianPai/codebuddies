"use client";

import { Company } from "../types";
import { MiniChart } from "../widgets";

export default function AnalyticsView({ company }: { company: Company }) {
  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-6">
        <MiniChart snapshots={company.snapshots} metric="activeUsers" label="Usuarios" />
      </section>
      <section className="cs-panel cs-span-6">
        <MiniChart snapshots={company.snapshots} metric="revenue" label="Ingresos" />
      </section>
      <section className="cs-panel cs-span-6">
        <MiniChart snapshots={company.snapshots} metric="expenses" label="Gastos" />
      </section>
      <section className="cs-panel cs-span-6">
        <MiniChart snapshots={company.snapshots} metric="rating" label="Valoracion" />
      </section>
    </div>
  );
}
