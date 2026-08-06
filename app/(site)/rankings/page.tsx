"use client";

import { useCallback, useEffect, useState } from "react";
import { Award, Coins, Flame, Trophy, Zap } from "lucide-react";
import { api } from "../../../utils/api";
import { useAuth } from "../../../hooks/useAuth";
import { useTranslation } from "../../../src/i18n/useTranslation";
import { Button, EmptyState, ErrorState, Skeleton } from "../../../src/shared/ui";

type RankingEntry = {
  rank: number;
  userId: string;
  username: string;
  value: number;
};

type Board = {
  entries: RankingEntry[];
  currentUserRank: number | null;
};

type RankingsResponse = {
  topXp: Board;
  topCoins: Board;
  topStreaks: Board;
  topCertificates: Board;
  topCoinsSpent: Board;
};

type LoadStatus = "loading" | "error" | "ready";

const boards = [
  ["site.topXp", "topXp", Zap],
  ["site.topCoins", "topCoins", Coins],
  ["site.topStreaks", "topStreaks", Flame],
  ["site.topCertificates", "topCertificates", Award],
  ["site.topCoinsSpent", "topCoinsSpent", Trophy],
] as const;

export default function RankingsPage() {
  const { user } = useAuth();
  const [rankings, setRankings] = useState<RankingsResponse | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const t = useTranslation();

  const fetchRankings = useCallback(() => {
    const query = user?.userId ? `?userId=${user.userId}` : "";
    api
      .get<RankingsResponse>(`/rankings${query}`)
      .then((data) => {
        setRankings(data);
        setStatus("ready");
      })
      .catch(() => {
        setRankings(null);
        setStatus("error");
      });
  }, [user]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const retry = () => {
    setStatus("loading");
    fetchRankings();
  };

  if (status === "loading") {
    return (
      <div className="grid gap-6 py-12 lg:grid-cols-2">
        {boards.map(([, key]) => (
          <Skeleton key={key} className="h-80" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="space-y-4 py-12">
        <ErrorState message={t("common.unexpectedError")} />
        <Button variant="primary" onClick={retry}>
          {t("common.refresh")}
        </Button>
      </div>
    );
  }

  return (
    <div className="py-12">
      <section className="mb-10">
        <p className="font-mono text-sm uppercase text-[rgb(var(--primary))]">
          {t("site.leaderboards")}
        </p>
        <h1 className="mt-3 text-5xl font-black">{t("site.rankingsTitle")}</h1>
        <p className="mt-4 max-w-2xl text-[rgb(var(--secondary-text))]">
          {t("site.rankingsDescription")}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {boards.map(([titleKey, key, Icon]) => {
          const board = rankings?.[key];
          return (
            <section
              key={key}
              className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5"
            >
              <div className="mb-5 flex items-center gap-3">
                <Icon className="text-[rgb(var(--primary))]" />
                <h2 className="text-2xl font-black">{t(titleKey)}</h2>
              </div>
              <div className="space-y-3">
                {!board?.entries.length && (
                  <EmptyState title={t("site.noRankingEntriesTitle")} description={t("site.noRankingEntriesDescription")} />
                )}
                {(board?.entries ?? []).map((entry) => {
                  const isCurrent = entry.userId === user?.userId;
                  return (
                    <div
                      key={entry.userId}
                      className={`flex items-center justify-between rounded-lg border p-4 ${
                        isCurrent
                          ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.1)]"
                          : "border-[rgb(var(--border))]"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-black">
                          #{entry.rank} {entry.username}
                        </p>
                      </div>
                      <p className="font-mono font-black text-[rgb(var(--primary))]">
                        {entry.value.toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
              {board?.currentUserRank && (
                <div className="mt-4 rounded-lg bg-[rgb(var(--button))] p-4 text-[rgb(var(--button-text))]">
                  {t("site.yourPosition", { rank: board.currentUserRank })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
