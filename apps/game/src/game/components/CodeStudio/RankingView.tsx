"use client";

import { useEffect, useState } from "react";
import { getCodeStudioRanking, type RankingRow } from "../../network/codestudio";
import type { Catalog } from "./types";
import { money, num } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";
import ChallengeCard from "./ChallengeCard";

// Ranking global: solo empresas vivas, por valuación.
export default function RankingView({
  companyId,
  catalog,
  onOpenCompany,
}: {
  companyId: string;
  catalog: Catalog;
  onOpenCompany?: (companyId: string) => void;
}) {
  const t = useTranslation();
  const [rows, setRows] = useState<RankingRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCodeStudioRanking()
      .then((data) => !cancelled && setRows(data))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : String(err)));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="cs2-stack">
    <ChallengeCard onOpen={(id) => onOpenCompany?.(id)} />
    <section className="cs2-card">
      <h3>{t("codestudio.ranking.title")}</h3>
      <p className="cs2-muted">{t("codestudio.ranking.subtitle")}</p>
      {error && <p className="cs2-warn-text">{error}</p>}
      {!rows && !error && <p className="cs2-muted">{t("codestudio.common.loading")}</p>}
      <ol className="cs2-ranking">
        {rows?.map((row, index) => (
          <li key={row.id} className={row.id === companyId ? "you" : ""}>
            <b>#{index + 1}</b>
            <div>
              <span>{row.name}</span>
              <small>
                {row.user?.username ?? "—"} · {row.appType?.name ?? ""} · {catalog.stages[row.stage]?.name ?? ""}
              </small>
            </div>
            <div className="cs2-ranking-value">
              <b>{money(row.valuation)}</b>
              <small>{t("codestudio.ranking.users", { count: num(row.activeUsers) })}</small>
            </div>
          </li>
        ))}
      </ol>
    </section>
    </div>
  );
}
