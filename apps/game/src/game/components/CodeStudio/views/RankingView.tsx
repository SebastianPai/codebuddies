"use client";

import { Company } from "../types";
import { format } from "../utils";
import { useTranslation } from "../../../../i18n/useTranslation";

export type RankingRow = {
  id: string;
  name: string;
  valuation: number;
  activeUsers: number;
  appType?: { name?: string } | null;
  user?: { username?: string } | null;
};

// Ranking real: GET /codestudio/ranking (codestudio.controller.ts) ya
// ordena por valuation/activeUsers a TODAS las empresas del juego — antes
// esta vista mezclaba la empresa real del jugador con 6 "rivales" inventados
// en mockData.ts (makeNpcCompanies), indistinguibles de datos reales.
export default function RankingView({ company, ranking }: { company: Company; ranking: RankingRow[] }) {
  const t = useTranslation();
  const rows = ranking.length > 0 ? ranking : [{ id: company.id, name: company.name, valuation: company.valuation, activeUsers: company.activeUsers }];

  return (
    <section className="cs-panel">
      <h3>{t("codestudioMisc.ranking.title")}</h3>
      <div className="cs-ranking">
        {rows.slice(0, 10).map((row, index) => (
          <article key={row.id} className={row.id === company.id ? "you" : ""}>
            <b>#{index + 1}</b>
            <span>{row.name}</span>
            <small>${format(row.valuation)} · {t("codestudioMisc.ranking.usersLabel", { count: format(row.activeUsers) })}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
