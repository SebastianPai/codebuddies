"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Award, CalendarClock, Calendar, Coins, Flame, History, Trophy, Users, Zap } from "lucide-react";
import { api } from "../../../utils/api";
import { useAuth } from "../../../hooks/useAuth";
import { useTranslation } from "../../../src/i18n/useTranslation";
import { Button, EmptyState, ErrorState, Skeleton } from "../../../src/shared/ui";
import { RarityBorder } from "@/shared/ui/rarity-border";
import { RarityText } from "@/shared/ui/rarity-text";
import { resolvePodiumEffect } from "@codebuddies/visual-effects";

type RankingEntry = {
  rank: number;
  userId: string;
  username: string;
  avatar?: string | null;
  level?: number;
  value: number;
};

type Board = {
  entries: RankingEntry[];
  currentUserRank: number | null;
};

type RankingsResponse = {
  // Mecenas: pagaron un boost comunitario activo (ver /pricing#boosts).
  sponsorIds?: string[];
  topWeeklyXp?: Board;
  topXp: Board;
  topCoins: Board;
  topStreaks: Board;
  topCertificates: Board;
  topCoinsSpent: Board;
};

type LoadStatus = "loading" | "error" | "ready";

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

interface CurrentSeasonResponse {
  season: SeasonInfo | null;
  entries: SeasonEntry[];
}

const boards = [
  ["site.topWeeklyXp", "topWeeklyXp", CalendarClock],
  ["site.topXp", "topXp", Zap],
  ["site.topCoins", "topCoins", Coins],
  ["site.topStreaks", "topStreaks", Flame],
  ["site.topCertificates", "topCertificates", Award],
  ["site.topCoinsSpent", "topCoinsSpent", Trophy],
] as const;

// Foto de perfil o, si no tiene, la inicial con el color del tema.
function RankAvatar({ entry }: { entry: RankingEntry }) {
  if (entry.avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={entry.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full border border-[rgb(var(--border))] object-cover" loading="lazy" />;
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--primary)/0.15)] text-sm font-black uppercase text-[rgb(var(--primary))]">
      {entry.username.slice(0, 1)}
    </span>
  );
}

export default function RankingsPage() {
  const { user } = useAuth();
  const [rankings, setRankings] = useState<RankingsResponse | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [season, setSeason] = useState<CurrentSeasonResponse | null>(null);
  const t = useTranslation();
  const sponsorIds = new Set(rankings?.sponsorIds ?? []);

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

  useEffect(() => {
    api
      .get<CurrentSeasonResponse>("/rankings/seasons/current")
      .then(setSeason)
      .catch(() => setSeason(null));
  }, []);

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

      {season?.season && (
        <section className="mb-10 rounded-lg border-2 border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.06)] p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Calendar className="text-[rgb(var(--primary))]" />
              <div>
                <h2 className="text-2xl font-black">{season.season.name}</h2>
                <p className="text-xs text-[rgb(var(--secondary-text))]">
                  {t("site.seasonActiveSince")}{" "}
                  {new Date(season.season.startAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Link
              href="/rankings/seasons"
              className="flex items-center gap-2 text-sm font-bold text-[rgb(var(--primary))] hover:opacity-80"
            >
              <History size={16} /> {t("site.pastSeasonsLink")}
            </Link>
          </div>

          {season.entries.length === 0 ? (
            <EmptyState
              title={t("site.noRankingEntriesTitle")}
              description={t("site.noRankingEntriesDescription")}
            />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {season.entries.slice(0, 10).map((entry) => {
                const podium = resolvePodiumEffect(entry.rank);
                const rowContent = (
                  <div className="flex items-center justify-between p-3">
                    {podium ? (
                      <RarityText effect={podium.id} as="span" className="truncate font-black">
                        #{entry.rank} {entry.user?.username ?? "—"}
                      </RarityText>
                    ) : (
                      <span className="truncate font-black">
                        #{entry.rank} {entry.user?.username ?? "—"}
                      </span>
                    )}
                    <span className="font-mono font-black text-[rgb(var(--primary))]">
                      {entry.xpEarned.toLocaleString()} XP
                    </span>
                  </div>
                );

                if (podium) {
                  return (
                    <RarityBorder key={entry.userId} effect={podium.id} glow className="rounded-lg">
                      {rowContent}
                    </RarityBorder>
                  );
                }

                return (
                  <div
                    key={entry.userId}
                    className={`rounded-lg border ${
                      entry.userId === user?.userId
                        ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.1)]"
                        : "border-[rgb(var(--border))]"
                    }`}
                  >
                    {rowContent}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

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
                  const podium = resolvePodiumEffect(entry.rank);
                  const sponsor = sponsorIds.has(entry.userId);
                  const rowContent = (
                    <Link href={`/u/${encodeURIComponent(entry.username)}`} className="flex items-center gap-3 p-3 sm:p-4">
                      <span className="w-7 shrink-0 text-center font-mono text-sm font-black text-[rgb(var(--secondary-text))]">#{entry.rank}</span>
                      <RankAvatar entry={entry} />
                      <div className="min-w-0 flex-1">
                        {podium ? (
                          <RarityText effect={podium.id} as="p" className="truncate font-black">
                            {entry.username}
                          </RarityText>
                        ) : (
                          <p className={`truncate font-black ${sponsor ? "text-[rgb(var(--accent))]" : ""}`}>{entry.username}</p>
                        )}
                        <p className="flex items-center gap-2 text-xs text-[rgb(var(--secondary-text))]">
                          {entry.level ? <span>{t("site.rankingLevel", { level: entry.level })}</span> : null}
                          {sponsor && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--accent)/0.18)] px-2 py-0.5 font-black uppercase tracking-wide text-[rgb(var(--accent))]">
                              <Users size={11} /> {t("pricing.boosts.sponsor")}
                            </span>
                          )}
                        </p>
                      </div>
                      <p className="shrink-0 font-mono font-black text-[rgb(var(--primary))]">
                        {entry.value.toLocaleString("en-US")}
                      </p>
                    </Link>
                  );

                  if (podium) {
                    return (
                      <RarityBorder key={entry.userId} effect={podium.id} glow className="rounded-lg">
                        {rowContent}
                      </RarityBorder>
                    );
                  }

                  return (
                    <div
                      key={entry.userId}
                      className={`rounded-lg border ${
                        isCurrent
                          ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.1)]"
                          : "border-[rgb(var(--border))]"
                      }`}
                    >
                      {rowContent}
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
