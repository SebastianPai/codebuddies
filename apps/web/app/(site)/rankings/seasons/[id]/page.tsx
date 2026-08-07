"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Trophy } from "lucide-react";
import { api } from "../../../../../utils/api";
import { useAuth } from "../../../../../hooks/useAuth";
import { useTranslation } from "../../../../../src/i18n/useTranslation";
import { EmptyState, ErrorState, Skeleton } from "../../../../../src/shared/ui";

interface SeasonEntry {
  userId: string;
  xpEarned: number;
  coinsEarned: number;
  rank: number;
  user: { id: string; username: string } | null;
}

interface SeasonInfo {
  id: string;
  name: string;
  startAt: string;
  endAt: string | null;
  status: "ACTIVE" | "FINALIZED";
}

interface SeasonDetailResponse {
  season: SeasonInfo;
  entries: SeasonEntry[];
}

export default function SeasonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const t = useTranslation();
  const [data, setData] = useState<SeasonDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .get<SeasonDetailResponse>(`/rankings/seasons/${id}`)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-3 py-12">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-12">
        <ErrorState message={t("common.unexpectedError")} />
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="mb-8 flex items-center gap-3">
        <Trophy className="text-[rgb(var(--primary))]" size={28} />
        <div>
          <h1 className="text-4xl font-black">{data.season.name}</h1>
          <p className="text-sm text-[rgb(var(--secondary-text))]">
            {new Date(data.season.startAt).toLocaleDateString()}
            {data.season.endAt ? ` – ${new Date(data.season.endAt).toLocaleDateString()}` : ""}
          </p>
        </div>
      </div>

      {data.entries.length === 0 ? (
        <EmptyState
          title={t("site.noRankingEntriesTitle")}
          description={t("site.noRankingEntriesDescription")}
        />
      ) : (
        <div className="space-y-2">
          {data.entries.map((entry) => (
            <div
              key={entry.userId}
              className={`flex items-center justify-between rounded-lg border p-4 ${
                entry.userId === user?.userId
                  ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.1)]"
                  : "border-[rgb(var(--border))]"
              }`}
            >
              <span className="font-black">
                #{entry.rank} {entry.user?.username ?? "—"}
              </span>
              <span className="font-mono font-black text-[rgb(var(--primary))]">
                {entry.xpEarned.toLocaleString()} XP · {entry.coinsEarned.toLocaleString()}{" "}
                {t("site.coinsLabel")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
