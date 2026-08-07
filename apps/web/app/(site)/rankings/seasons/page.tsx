"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Trophy } from "lucide-react";
import { api } from "../../../../utils/api";
import { useTranslation } from "../../../../src/i18n/useTranslation";
import { EmptyState, ErrorState, Skeleton } from "../../../../src/shared/ui";

interface SeasonInfo {
  id: string;
  name: string;
  startAt: string;
  endAt: string | null;
  status: "ACTIVE" | "FINALIZED";
}

export default function PastSeasonsPage() {
  const t = useTranslation();
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get<SeasonInfo[]>("/rankings/seasons")
      .then((data) => setSeasons(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="py-12">
      <div className="mb-8 flex items-center gap-3">
        <Trophy className="text-[rgb(var(--primary))]" size={28} />
        <h1 className="text-4xl font-black">{t("site.pastSeasonsLink")}</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={t("common.unexpectedError")} />
      ) : seasons.length === 0 ? (
        <EmptyState
          title={t("site.noRankingEntriesTitle")}
          description={t("site.noRankingEntriesDescription")}
        />
      ) : (
        <div className="space-y-3">
          {seasons.map((season) => (
            <Link
              key={season.id}
              href={`/rankings/seasons/${season.id}`}
              className="flex items-center justify-between rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 transition hover:border-[rgb(var(--primary))]"
            >
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-[rgb(var(--secondary-text))]" />
                <div>
                  <p className="font-black">{season.name}</p>
                  <p className="text-xs text-[rgb(var(--secondary-text))]">
                    {new Date(season.startAt).toLocaleDateString()}
                    {season.endAt ? ` – ${new Date(season.endAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  season.status === "ACTIVE"
                    ? "bg-green-500/20 text-green-500"
                    : "bg-[rgb(var(--border))] text-[rgb(var(--secondary-text))]"
                }`}
              >
                {season.status === "ACTIVE" ? t("site.seasonStatusActive") : t("site.seasonStatusFinalized")}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
