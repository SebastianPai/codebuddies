"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  Gift,
  RefreshCcw,
  Search,
  ShieldAlert,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../utils/api";
import AdminSimpleChart, {
  type SimpleChartPoint,
} from "../../../components/referrals/AdminSimpleChart";
import ReferralStatusBadge from "../../../components/referrals/ReferralStatusBadge";
import ReferralEmptyState from "../../../components/referrals/ReferralEmptyState";
import { AdminReferralsSkeleton } from "../../../components/referrals/ReferralSkeleton";
import RewardBuilder from "../gamification/components/RewardBuilder";
import type { AdminReward } from "../gamification/components/admin-gamification-types";
import type {
  ReferralGrant,
  ReferralLeaderboardEntry,
  ReferralRecord,
} from "../../../components/referrals/referral-types";
import { useTranslation } from "../../../src/i18n/useTranslation";

type ItemOption = {
  id: string;
  category?: string | null;
  translations?: Array<{ name: string }>;
};

type Reward = {
  id: string;
  name: string;
  scope: "MILESTONE" | "RANKING";
  rewardType: string;
  threshold?: number | null;
  rankFrom?: number | null;
  rankTo?: number | null;
  amount?: number | null;
  active: boolean;
  item?: ItemOption | null;
};

type Season = {
  id: string;
  name: string;
  periodKey: string;
  status: string;
};

type FraudLog = {
  id: string;
  reasonCode: string;
  createdAt: string;
  referral?: {
    referrer?: { username: string } | null;
    referred?: { username: string } | null;
  } | null;
};

type DashboardPayload = {
  cards: {
    pending: number;
    validated: number;
    fraud: number;
    rewardsGranted: number;
  };
  season?: Season | null;
};

type SettingsPayload = {
  enabled: boolean;
  rankingEnabled: boolean;
  maxReferralsPerDay: number;
  requiredLevel: number;
  minAccountAgeDays: number;
};

type RankingPayload = {
  season?: Season | null;
  entries: ReferralLeaderboardEntry[];
};

type Filters = {
  q: string;
  status: string;
  seasonId: string;
  from: string;
  to: string;
  user: string;
  code: string;
  level: string;
  email: string;
};

const filtersInitial: Filters = {
  q: "",
  status: "",
  seasonId: "",
  from: "",
  to: "",
  user: "",
  code: "",
  level: "",
  email: "",
};

const rewardInitial = {
  name: "",
  description: "",
  scope: "MILESTONE",
  rewardType: "COINS",
  threshold: 1,
  rankFrom: 1,
  rankTo: 1,
  amount: 100,
  itemId: "",
  seasonId: "",
  active: true,
  sortOrder: 0,
};

const seasonInitial = {
  name: "",
  periodKey: "",
  startsAt: "",
  endsAt: "",
};

function formatMonth(date: Date) {
  return date.toLocaleDateString("es-CO", {
    month: "short",
    year: "2-digit",
  });
}

function formatDay(date: Date) {
  return date.toLocaleDateString("es-CO", {
    month: "short",
    day: "numeric",
  });
}

function buildDayChart(records: ReferralRecord[]): SimpleChartPoint[] {
  const days = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date;
  });

  return days.map((date) => {
    const key = date.toDateString();
    const value = records.filter(
      (record) => new Date(record.createdAt).toDateString() === key,
    ).length;
    return { label: formatDay(date), value };
  });
}

function buildMonthChart(records: ReferralRecord[]): SimpleChartPoint[] {
  const months = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    return date;
  });

  return months.map((date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const value = records.filter((record) => {
      const createdAt = new Date(record.createdAt);
      return createdAt.getFullYear() === year && createdAt.getMonth() === month;
    }).length;

    return { label: formatMonth(date), value };
  });
}

export default function AdminReferralsPage() {
  const t = useTranslation();
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [records, setRecords] = useState<ReferralRecord[]>([]);
  const [fraudLogs, setFraudLogs] = useState<FraudLog[]>([]);
  const [history, setHistory] = useState<ReferralGrant[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [ranking, setRanking] = useState<RankingPayload | null>(null);
  const [filters, setFilters] = useState<Filters>(filtersInitial);
  const [rewardForm, setRewardForm] = useState(rewardInitial);
  const [referralRewardSelection, setReferralRewardSelection] = useState<AdminReward[]>([]);
  const [seasonForm, setSeasonForm] = useState(seasonInitial);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        dashboardData,
        settingsData,
        rewardsData,
        recordsData,
        fraudData,
        historyData,
        itemsData,
        seasonsData,
        rankingData,
      ] = await Promise.all([
        api.get<DashboardPayload>("/admin/referrals/dashboard"),
        api.get<SettingsPayload>("/admin/referrals/settings"),
        api.get<Reward[]>("/admin/referrals/rewards"),
        api.get<ReferralRecord[]>("/admin/referrals/records"),
        api.get<FraudLog[]>("/admin/referrals/fraud"),
        api.get<ReferralGrant[]>("/admin/referrals/history"),
        api.get<ItemOption[]>("/items"),
        api.get<Season[]>("/admin/referrals/seasons"),
        api.get<RankingPayload>("/admin/referrals/ranking"),
      ]);

      setDashboard(dashboardData);
      setSettings(settingsData);
      setRewards(rewardsData);
      setRecords(recordsData);
      setFraudLogs(fraudData);
      setHistory(historyData);
      setItems(itemsData);
      setSeasons(seasonsData);
      setRanking(rankingData);
    } catch (err) {
      const message =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: string }).message)
          : t("admin.loadReferralsModuleError");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const createdAt = new Date(record.createdAt);
      const haystack = [
        record.referrer?.username,
        record.referrer?.email,
        record.referred?.username,
        record.referred?.email,
        record.referralCodeUsed,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (filters.q && !haystack.includes(filters.q.toLowerCase())) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.seasonId && (record as { seasonId?: string }).seasonId !== filters.seasonId) {
        return false;
      }
      if (filters.user) {
        const userNeedle = filters.user.toLowerCase();
        const matchesUser =
          record.referrer?.username.toLowerCase().includes(userNeedle) ||
          record.referred?.username.toLowerCase().includes(userNeedle);
        if (!matchesUser) return false;
      }
      if (
        filters.code &&
        !record.referralCodeUsed?.toLowerCase().includes(filters.code.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.level &&
        String(record.referred?.level ?? "").trim() !== filters.level.trim()
      ) {
        return false;
      }
      if (filters.email) {
        const emailNeedle = filters.email.toLowerCase();
        const matchesEmail =
          record.referrer?.email?.toLowerCase().includes(emailNeedle) ||
          record.referred?.email?.toLowerCase().includes(emailNeedle);
        if (!matchesEmail) return false;
      }
      if (filters.from && createdAt < new Date(`${filters.from}T00:00:00`)) {
        return false;
      }
      if (filters.to && createdAt > new Date(`${filters.to}T23:59:59`)) {
        return false;
      }

      return true;
    });
  }, [filters, records]);

  const totalPages = Math.max(Math.ceil(filteredRecords.length / pageSize), 1);
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters, pageSize]);

  const conversion = useMemo(() => {
    if (!records.length) return 0;
    const validated = records.filter((item) => item.status === "VALIDATED").length;
    return Math.round((validated / records.length) * 100);
  }, [records]);

  const activeUsers = useMemo(() => {
    const ids = new Set<string>();
    records.forEach((record) => {
      if (record.referrer?.id) ids.add(record.referrer.id);
      if (record.referred?.id) ids.add(record.referred.id);
    });
    return ids.size;
  }, [records]);

  const dayChart = useMemo(() => buildDayChart(filteredRecords), [filteredRecords]);
  const monthChart = useMemo(
    () => buildMonthChart(filteredRecords),
    [filteredRecords],
  );
  const conversionChart = useMemo<SimpleChartPoint[]>(
    () => [
      {
        label: t("admin.chartPendLabel"),
        value: filteredRecords.filter((item) => item.status === "PENDING").length,
      },
      {
        label: t("admin.chartValLabel"),
        value: filteredRecords.filter((item) => item.status === "VALIDATED").length,
      },
      {
        label: t("admin.chartFraudLabel"),
        value: filteredRecords.filter((item) => item.status === "FRAUD").length,
      },
      {
        label: t("admin.chartRevLabel"),
        value: filteredRecords.filter((item) => item.status === "REVOKED").length,
      },
    ],
    [filteredRecords],
  );

  const exportData = async () => {
    try {
      const payload = await api.get<Record<string, unknown>>(
        "/admin/referrals/export",
      );
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `referrals-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t("admin.exportGeneratedToast"));
    } catch {
      toast.error(t("admin.exportError"));
    }
  };

  const evaluateReferral = async (id: string) => {
    try {
      await api.post(`/admin/referrals/records/${id}/evaluate`);
      toast.success(t("admin.referralEvaluatedToast"));
      await loadAll();
    } catch {
      toast.error(t("admin.evaluateReferralError"));
    }
  };

  const markFraud = async (id: string) => {
    if (!confirm(t("admin.confirmMarkFraud"))) return;
    try {
      await api.post(`/admin/referrals/records/${id}/flag-fraud`, {
        reasonCode: "MANUAL_REVIEW",
        notes: "Marcado desde el panel de administración",
      });
      toast.success(t("admin.referralMarkedFraudToast"));
      await loadAll();
    } catch {
      toast.error(t("admin.markFraudError"));
    }
  };

  const finalizeSeason = async () => {
    const seasonId = ranking?.season?.id;
    if (!seasonId) return;
    if (!confirm(t("admin.confirmFinalizeSeason"))) return;

    try {
      await api.post("/admin/referrals/ranking/finalize", { seasonId });
      toast.success(t("admin.seasonFinalizedToast"));
      await loadAll();
    } catch {
      toast.error(t("admin.finalizeSeasonError"));
    }
  };

  const toggleReward = async (reward: Reward) => {
    try {
      await api.patch(`/admin/referrals/rewards/${reward.id}/toggle`, {
        active: !reward.active,
      });
      toast.success(t("admin.rewardStatusUpdatedToast"));
      await loadAll();
    } catch {
      toast.error(t("admin.updateRewardError"));
    }
  };

  const createReward = async () => {
    const selectedReward = referralRewardSelection[0];
    if (!selectedReward) {
      toast.error(t("admin.selectRewardError"));
      return;
    }
    const referralRewardType =
      selectedReward.type === "AVATAR_ITEM" || selectedReward.type === "FURNITURE"
        ? "ITEM"
        : selectedReward.type === "ROLE"
          ? "CUSTOM"
          : selectedReward.type;

    setSaving(true);
    try {
      await api.post("/admin/referrals/rewards", {
        ...rewardForm,
        name: rewardForm.name || selectedReward.label,
        rewardType: referralRewardType,
        threshold:
          rewardForm.scope === "MILESTONE" ? Number(rewardForm.threshold) : null,
        rankFrom:
          rewardForm.scope === "RANKING" ? Number(rewardForm.rankFrom) : null,
        rankTo:
          rewardForm.scope === "RANKING" ? Number(rewardForm.rankTo) : null,
        amount:
          referralRewardType === "COINS" || referralRewardType === "XP"
            ? Number(selectedReward.amount)
            : null,
        itemId: selectedReward.itemId || null,
        seasonId: rewardForm.seasonId || null,
      });
      toast.success(t("admin.rewardCreatedToast"));
      setRewardForm(rewardInitial);
      setReferralRewardSelection([]);
      await loadAll();
    } catch {
      toast.error(t("admin.createRewardError"));
    } finally {
      setSaving(false);
    }
  };

  const createSeason = async () => {
    setSaving(true);
    try {
      await api.post("/admin/referrals/seasons", seasonForm);
      toast.success(t("admin.seasonCreatedToast"));
      setSeasonForm(seasonInitial);
      await loadAll();
    } catch {
      toast.error(t("admin.createSeasonError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AdminReferralsSkeleton />;
  }

  if (error || !dashboard || !settings || !ranking) {
    return (
      <div className="p-6 text-white md:p-10">
        <ReferralEmptyState
          title={t("admin.referralsDashboardLoadErrorTitle")}
          description={error ?? t("admin.unexpectedErrorSentence")}
          action={
            <button
              type="button"
              onClick={() => void loadAll()}
              className="rounded-2xl bg-yellow-400 px-4 py-3 font-bold text-black"
            >
              {t("gamification.retry")}
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 text-white md:p-10">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-4xl font-black text-yellow-400">
            {t("admin.referralsDashboardTitle")}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            {t("admin.referralsDashboardDescription")}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void loadAll()}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-bold hover:border-yellow-400"
          >
            <RefreshCcw size={16} />
            {t("common.refresh")}
          </button>
          <button
            type="button"
            onClick={() => void exportData()}
            className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-bold text-black"
          >
            <ArrowDownToLine size={16} />
            {t("admin.exportButton")}
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          icon={<Users size={20} />}
          label={t("admin.referredUsersLabel")}
          value={records.length}
        />
        <SummaryCard
          icon={<AlertTriangle size={20} />}
          label={t("gamification.pendingCount")}
          value={dashboard.cards.pending}
        />
        <SummaryCard
          icon={<CheckCircle2 size={20} />}
          label={t("admin.validatedLabel")}
          value={dashboard.cards.validated}
        />
        <SummaryCard
          icon={<ShieldAlert size={20} />}
          label={t("admin.fraudsLabel")}
          value={dashboard.cards.fraud}
        />
        <SummaryCard
          icon={<Gift size={20} />}
          label={t("admin.rewardsLabel")}
          value={dashboard.cards.rewardsGranted}
        />
        <SummaryCard
          icon={<Trophy size={20} />}
          label={t("admin.conversionLabel")}
          value={`${conversion}%`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <AdminSimpleChart
          title={t("admin.referralsByDayTitle")}
          subtitle={t("admin.last7DaysSubtitle")}
          points={dayChart}
        />
        <AdminSimpleChart
          title={t("admin.referralsByMonthTitle")}
          subtitle={t("admin.last6MonthsSubtitle")}
          points={monthChart}
        />
        <AdminSimpleChart
          title={t("admin.programConversionTitle")}
          subtitle={t("admin.activeUsersInFlowSubtitle", { count: activeUsers })}
          points={conversionChart}
        />
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-[#111111] p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-2xl font-black">{t("admin.filtersSearchTitle")}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {t("admin.filtersSearchDescription")}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-400">
            <Search size={16} />
            {t("admin.resultsCountSuffix", { count: filteredRecords.length })}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field
            label={t("admin.searchFieldLabel")}
            value={filters.q}
            onChange={(value) => setFilters((current) => ({ ...current, q: value }))}
            placeholder={t("admin.usernameEmailCodePlaceholder")}
          />
          <SelectField
            label={t("admin.statusFieldLabel")}
            value={filters.status}
            onChange={(value) =>
              setFilters((current) => ({ ...current, status: value }))
            }
            options={["", "PENDING", "VALIDATED", "FRAUD", "REVOKED"]}
          />
          <SelectField
            label={t("admin.seasonFieldLabel")}
            value={filters.seasonId}
            onChange={(value) =>
              setFilters((current) => ({ ...current, seasonId: value }))
            }
            options={[
              { value: "", label: t("common.all") },
              ...seasons.map((season) => ({
                value: season.id,
                label: `${season.name} (${season.periodKey})`,
              })),
            ]}
          />
          <Field
            label={t("admin.userFieldLabel")}
            value={filters.user}
            onChange={(value) =>
              setFilters((current) => ({ ...current, user: value }))
            }
            placeholder={t("admin.usernamePlaceholder")}
          />
          <Field
            label={t("admin.codeFieldLabel")}
            value={filters.code}
            onChange={(value) =>
              setFilters((current) => ({ ...current, code: value }))
            }
            placeholder={t("admin.codePlaceholder")}
          />
          <Field
            label={t("admin.levelFieldLabel")}
            value={filters.level}
            onChange={(value) =>
              setFilters((current) => ({ ...current, level: value }))
            }
            placeholder={t("admin.levelPlaceholderExample")}
          />
          <Field
            label={t("admin.emailFieldLabel")}
            value={filters.email}
            onChange={(value) =>
              setFilters((current) => ({ ...current, email: value }))
            }
            placeholder={t("admin.emailPlaceholderExample")}
          />
          <Field
            label={t("admin.fromFieldLabel")}
            type="date"
            value={filters.from}
            onChange={(value) =>
              setFilters((current) => ({ ...current, from: value }))
            }
          />
          <Field
            label={t("admin.toFieldLabel")}
            type="date"
            value={filters.to}
            onChange={(value) =>
              setFilters((current) => ({ ...current, to: value }))
            }
          />
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setFilters(filtersInitial)}
              className="w-full rounded-2xl border border-zinc-700 px-4 py-3 font-bold"
            >
              {t("common.clearFilters")}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-3xl border border-zinc-800 bg-[#111111] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black">{t("admin.referralsTableTitle")}</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {t("admin.referralsTableDescription")}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-400">
              <span>{t("admin.rowsLabel")}</span>
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white"
                aria-label={t("common.rowsPerPage")}
              >
                {[8, 12, 20, 30].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5">
            {paginatedRecords.length ? (
              <>
                <div className="hidden overflow-hidden rounded-3xl border border-zinc-800 xl:block">
                  <table className="w-full table-fixed text-left text-sm">
                    <thead className="bg-black/40 text-zinc-400">
                      <tr>
                        <th className="px-4 py-4 font-bold">{t("admin.userFieldLabel")}</th>
                        <th className="px-4 py-4 font-bold">{t("admin.emailFieldLabel")}</th>
                        <th className="px-4 py-4 font-bold">{t("admin.statusFieldLabel")}</th>
                        <th className="px-4 py-4 font-bold">{t("admin.codeFieldLabel")}</th>
                        <th className="px-4 py-4 font-bold">{t("admin.levelFieldLabel")}</th>
                        <th className="px-4 py-4 font-bold">{t("admin.datesColumn")}</th>
                        <th className="px-4 py-4 font-bold">{t("admin.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRecords.map((record) => (
                        <tr
                          key={record.id}
                          className="border-t border-zinc-800 hover:bg-white/[0.02]"
                        >
                          <td className="px-4 py-4">
                            <div className="font-bold">
                              {record.referrer?.username} → {record.referred?.username}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {t("admin.referrerReferredLabel")}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-zinc-300">
                            <div>{record.referrer?.email ?? "-"}</div>
                            <div className="text-xs text-zinc-500">
                              {record.referred?.email ?? "-"}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <ReferralStatusBadge status={record.status} />
                          </td>
                          <td className="px-4 py-4 font-mono text-zinc-300">
                            {record.referralCodeUsed}
                          </td>
                          <td className="px-4 py-4 text-zinc-300">
                            {record.referred?.level ?? 0}
                          </td>
                          <td className="px-4 py-4 text-zinc-300">
                            <div>{new Date(record.createdAt).toLocaleDateString("es-CO")}</div>
                            <div className="text-xs text-zinc-500">
                              {record.validatedAt
                                ? t("admin.validatedOnPrefix", { date: new Date(record.validatedAt).toLocaleDateString("es-CO") })
                                : t("gamification.pending")}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                title={t("admin.evaluateReferralTitle")}
                                onClick={() => void evaluateReferral(record.id)}
                                className="rounded-xl border border-emerald-700 px-3 py-2 text-xs font-bold text-emerald-300"
                              >
                                {t("admin.evaluateAction")}
                              </button>
                              <button
                                type="button"
                                title={t("admin.markFraudTitle")}
                                onClick={() => void markFraud(record.id)}
                                className="rounded-xl border border-red-700 px-3 py-2 text-xs font-bold text-red-300"
                              >
                                {t("admin.fraudAction")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 xl:hidden">
                  {paginatedRecords.map((record) => (
                    <article
                      key={record.id}
                      className="rounded-3xl border border-zinc-800 bg-black p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">
                            {record.referrer?.username} → {record.referred?.username}
                          </p>
                          <p className="text-sm text-zinc-500">
                            {record.referred?.email ?? record.referrer?.email ?? "-"}
                          </p>
                        </div>
                        <ReferralStatusBadge status={record.status} compact />
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
                        <div>
                          <p className="text-zinc-500">{t("admin.codeFieldLabel")}</p>
                          <p className="font-mono">{record.referralCodeUsed}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500">{t("admin.levelFieldLabel")}</p>
                          <p>{record.referred?.level ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500">{t("admin.registrationLabel")}</p>
                          <p>{new Date(record.createdAt).toLocaleDateString("es-CO")}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500">{t("referrals.validation")}</p>
                          <p>
                            {record.validatedAt
                              ? new Date(record.validatedAt).toLocaleDateString("es-CO")
                              : t("gamification.pending")}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void evaluateReferral(record.id)}
                          className="rounded-xl border border-emerald-700 px-3 py-2 text-xs font-bold text-emerald-300"
                        >
                          {t("admin.evaluateAction")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void markFraud(record.id)}
                          className="rounded-xl border border-red-700 px-3 py-2 text-xs font-bold text-red-300"
                        >
                          {t("admin.fraudAction")}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-zinc-500">
                    {t("common.pageOf", { page, total: totalPages })}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => setPage((current) => Math.max(current - 1, 1))}
                      className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold disabled:opacity-40"
                    >
                      {t("common.previous")}
                    </button>
                    <button
                      type="button"
                      disabled={page === totalPages}
                      onClick={() =>
                        setPage((current) => Math.min(current + 1, totalPages))
                      }
                      className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold disabled:opacity-40"
                    >
                      {t("common.next")}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <ReferralEmptyState
                title={t("admin.noReferralsForFiltersTitle")}
                description={t("admin.tryOtherFiltersDescription")}
              />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-zinc-800 bg-[#111111] p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">{t("admin.rankingTitle")}</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {ranking.season?.name ?? t("referrals.noActiveSeasonHelper")}
                </p>
              </div>
              {ranking.season ? (
                <button
                  type="button"
                  onClick={() => void finalizeSeason()}
                  className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold"
                >
                  {t("admin.finalizeButton")}
                </button>
              ) : null}
            </div>
            <div className="mt-5 space-y-3">
              {ranking.entries.slice(0, 8).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-zinc-800 bg-black p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">
                        #{entry.currentRank} {entry.user.username}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {t("admin.validPendingCounts", { valid: entry.validatedReferrals, pending: entry.pendingReferrals })}
                      </p>
                    </div>
                    <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-300">
                      {t("referrals.levelBadge", { level: entry.user.level ?? 0 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-[#111111] p-6">
            <h2 className="text-2xl font-black">{t("admin.activeConfigTitle")}</h2>
            <dl className="mt-5 grid gap-3 text-sm text-zinc-300">
              <div className="flex justify-between gap-3 rounded-2xl border border-zinc-800 bg-black px-4 py-3">
                <dt>{t("admin.programWord")}</dt>
                <dd>{settings.enabled ? t("admin.enabledWord") : t("admin.disabledWord")}</dd>
              </div>
              <div className="flex justify-between gap-3 rounded-2xl border border-zinc-800 bg-black px-4 py-3">
                <dt>{t("admin.rankingTitle")}</dt>
                <dd>{settings.rankingEnabled ? t("gamification.activeMale") : t("admin.inactiveMale")}</dd>
              </div>
              <div className="flex justify-between gap-3 rounded-2xl border border-zinc-800 bg-black px-4 py-3">
                <dt>{t("admin.requiredLevelLabel")}</dt>
                <dd>{settings.requiredLevel}</dd>
              </div>
              <div className="flex justify-between gap-3 rounded-2xl border border-zinc-800 bg-black px-4 py-3">
                <dt>{t("admin.minDaysLabel")}</dt>
                <dd>{settings.minAccountAgeDays}</dd>
              </div>
              <div className="flex justify-between gap-3 rounded-2xl border border-zinc-800 bg-black px-4 py-3">
                <dt>{t("admin.maxDailyLabel")}</dt>
                <dd>{settings.maxReferralsPerDay}</dd>
              </div>
            </dl>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-zinc-800 bg-[#111111] p-6">
          <h2 className="text-2xl font-black">{t("admin.programRewardsTitle")}</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {t("admin.programRewardsDescription")}
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field
              label={t("items.name")}
              value={rewardForm.name}
              onChange={(value) =>
                setRewardForm((current) => ({ ...current, name: value }))
              }
            />
            <Field
              label={t("items.description")}
              value={rewardForm.description}
              onChange={(value) =>
                setRewardForm((current) => ({ ...current, description: value }))
              }
            />
            <SelectField
              label={t("admin.scopeLabel")}
              value={rewardForm.scope}
              onChange={(value) =>
                setRewardForm((current) => ({ ...current, scope: value }))
              }
              options={["MILESTONE", "RANKING"]}
            />
            {rewardForm.scope === "MILESTONE" ? (
              <Field
                label={t("admin.thresholdLabel")}
                value={String(rewardForm.threshold)}
                onChange={(value) =>
                  setRewardForm((current) => ({
                    ...current,
                    threshold: Number(value),
                  }))
                }
              />
            ) : (
              <>
                <Field
                  label={t("admin.rankFromLabel")}
                  value={String(rewardForm.rankFrom)}
                  onChange={(value) =>
                    setRewardForm((current) => ({
                      ...current,
                      rankFrom: Number(value),
                    }))
                  }
                />
                <Field
                  label={t("admin.rankToLabel")}
                  value={String(rewardForm.rankTo)}
                  onChange={(value) =>
                    setRewardForm((current) => ({
                      ...current,
                      rankTo: Number(value),
                    }))
                  }
                />
              </>
            )}
            {rewardForm.scope === "RANKING" ? (
              <SelectField
                label={t("admin.seasonFieldLabel")}
                value={rewardForm.seasonId}
                onChange={(value) =>
                  setRewardForm((current) => ({ ...current, seasonId: value }))
                }
                options={[
                  { value: "", label: t("admin.selectSeasonOption") },
                  ...seasons.map((season) => ({
                    value: season.id,
                    label: `${season.name} (${season.periodKey})`,
                  })),
                ]}
              />
            ) : null}
            <div className="md:col-span-2">
              <p className="mb-2 text-sm text-zinc-400">
                {t("admin.visualRewardLabel")}
              </p>
              <RewardBuilder
                value={referralRewardSelection}
                onChange={(value) => setReferralRewardSelection(value.slice(-1))}
              />
              <p className="mt-2 text-xs text-zinc-500">
                {t("admin.milestoneRewardHelper")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void createReward()}
            disabled={saving}
            className="mt-5 rounded-2xl bg-yellow-400 px-4 py-3 font-bold text-black disabled:opacity-60"
          >
            {t("admin.createRewardButton")}
          </button>

          <div className="mt-6 space-y-3">
            {rewards.slice(0, 8).map((reward) => (
              <div
                key={reward.id}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-black p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-bold">{reward.name}</p>
                  <p className="text-sm text-zinc-500">
                    {reward.scope} · {reward.rewardType} ·{" "}
                    {reward.threshold
                      ? t("admin.thresholdValueLabel", { value: reward.threshold })
                      : t("admin.rankRangeLabel", { from: reward.rankFrom ?? 0, to: reward.rankTo ?? 0 })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ReferralStatusBadge
                    status={reward.active ? "GRANTED" : "REVOKED"}
                    compact
                  />
                  <button
                    type="button"
                    onClick={() => void toggleReward(reward)}
                    className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold"
                  >
                    {reward.active ? t("admin.deactivateButton") : t("admin.activateButton")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <section className="rounded-3xl border border-zinc-800 bg-[#111111] p-6">
            <h2 className="text-2xl font-black">{t("admin.createSeasonTitle")}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field
                label={t("items.name")}
                value={seasonForm.name}
                onChange={(value) =>
                  setSeasonForm((current) => ({ ...current, name: value }))
                }
              />
              <Field
                label={t("admin.periodKeyLabel")}
                value={seasonForm.periodKey}
                onChange={(value) =>
                  setSeasonForm((current) => ({ ...current, periodKey: value }))
                }
              />
              <Field
                label={t("admin.startIsoLabel")}
                value={seasonForm.startsAt}
                onChange={(value) =>
                  setSeasonForm((current) => ({ ...current, startsAt: value }))
                }
              />
              <Field
                label={t("admin.endIsoLabel")}
                value={seasonForm.endsAt}
                onChange={(value) =>
                  setSeasonForm((current) => ({ ...current, endsAt: value }))
                }
              />
            </div>
            <button
              type="button"
              onClick={() => void createSeason()}
              disabled={saving}
              className="mt-5 rounded-2xl bg-yellow-400 px-4 py-3 font-bold text-black disabled:opacity-60"
            >
              {t("admin.createSeasonTitle")}
            </button>
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-[#111111] p-6">
            <h2 className="text-2xl font-black">{t("admin.historyFraudTitle")}</h2>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                {history.slice(0, 8).map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-zinc-800 bg-black p-4"
                  >
                    <p className="font-bold">
                      {entry.reward?.name ?? entry.rewardType}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {entry.user?.username ?? t("referrals.user")} ·{" "}
                      {new Date(entry.grantedAt).toLocaleString("es-CO")}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {fraudLogs.slice(0, 8).map((log) => (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-zinc-800 bg-black p-4"
                  >
                    <p className="font-bold">{log.reasonCode}</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {log.referral?.referrer?.username ?? "-"} /{" "}
                      {log.referral?.referred?.username ?? "-"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </section>
      </section>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-[#111111] p-5">
      <div className="flex items-center justify-between text-zinc-500">
        <span className="text-xs font-black uppercase tracking-[0.2em]">
          {label}
        </span>
        <span className="text-yellow-400">{icon}</span>
      </div>
      <p className="mt-4 text-4xl font-black">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string> | Array<{ value: string; label: string }>;
}) {
  const t = useTranslation();
  const normalized = options.map((option) =>
    typeof option === "string" ? { value: option, label: option || t("common.allMasculine") } : option,
  );

  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
      >
        {normalized.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
