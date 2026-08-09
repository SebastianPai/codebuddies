"use client";

import { Company } from "../types";
import { format } from "../utils";
import { makeNpcCompanies } from "../mockData";

export default function RankingView({ company, npcs }: { company: Company; npcs: ReturnType<typeof makeNpcCompanies> }) {
  const rows: Array<{ name: string; valuation: number; users: number; you?: boolean }> = [
    { name: company.name, valuation: company.valuation, users: company.activeUsers, you: true },
    ...npcs,
  ]
    .sort((a, b) => b.valuation - a.valuation)
    .slice(0, 10);
  return (
    <section className="cs-panel">
      <h3>Competidores NPC</h3>
      <div className="cs-ranking">
        {rows.map((row, index) => (
          <article key={row.name} className={row.you ? "you" : ""}>
            <b>#{index + 1}</b>
            <span>{row.name}</span>
            <small>${format(row.valuation)} · {format(row.users)} usuarios</small>
          </article>
        ))}
      </div>
    </section>
  );
}
