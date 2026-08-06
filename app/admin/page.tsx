"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, BookOpen, Shield, Users, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api } from "../../utils/api";
import { useTranslation } from "../../src/i18n/useTranslation";
import { Pagination } from "../../src/shared/ui";

const userActionLabelKeys: Record<string, string> = {
  GRANT_ADMIN: "admin.actionGrantAdmin",
  REMOVE_ADMIN: "admin.actionRemoveAdmin",
  GRANT_PREMIUM: "admin.actionGrantPremium",
  REVOKE_PREMIUM: "admin.actionRevokePremium",
  ADD_XP: "admin.actionAddXp",
  REMOVE_XP: "admin.actionRemoveXp",
  ADD_COINS: "admin.actionAddCoins",
  REMOVE_COINS: "admin.actionRemoveCoins",
};

const certificateActionLabelKeys: Record<string, string> = {
  GRANT: "admin.actionGrant",
  SIMULATE_PAID: "admin.actionSimulatePaid",
  REVOKE: "admin.actionRevoke",
};

type ChartPoint = { label: string; value: number };
type DashboardData = {
  cards: {
    totalUsers: number;
    activeUsers: number;
    courses: number;
    lessons: number;
    certificatesIssued: number;
    premiumSubscribers: number;
  };
  charts: {
    newUsersOverTime: ChartPoint[];
    certificatesIssuedOverTime: ChartPoint[];
    xpEarnedOverTime: ChartPoint[];
  };
  recentActivity: Array<{
    id: string;
    label: string;
    createdAt: string;
    user: { username: string; email: string };
  }>;
};
type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: "STUDENT" | "ADMIN";
  experience: number;
  coins: number;
  premiumSubscriptions: Array<{ id: string }>;
  _count: { certificates: number; certificateAccesses: number };
};
type CertificateAccess = {
  id: string;
  accessType: string;
  createdAt: string;
  user: { username: string; email: string };
  course: { translations: Array<{ title: string }> };
};
type PaginatedResponse<T> = {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export default function AdminDashboard() {
  const t = useTranslation();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [accesses, setAccesses] = useState<CertificateAccess[]>([]);
  const [accessesPage, setAccessesPage] = useState(1);
  const [accessesTotalPages, setAccessesTotalPages] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [amount, setAmount] = useState(100);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId),
    [selectedUserId, users],
  );

  const loadAdminData = useCallback(async () => {
    const [dashboardData, userData, accessData] = await Promise.all([
      api.get<DashboardData>("/admin/dashboard"),
      api.get<PaginatedResponse<AdminUser>>(`/admin/users?page=${usersPage}&limit=20`),
      api.get<PaginatedResponse<CertificateAccess>>(`/admin/certificate-access?page=${accessesPage}&limit=20`),
    ]);
    setDashboard(dashboardData);
    setUsers(userData.items);
    setUsersTotalPages(userData.meta.totalPages);
    setAccesses(accessData.items);
    setAccessesTotalPages(accessData.meta.totalPages);
    setSelectedUserId((current) => current || userData.items[0]?.id || "");
  }, [usersPage, accessesPage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAdminData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAdminData]);

  const runUserAction = async (action: string, actionAmount?: number) => {
    if (!selectedUserId) return;
    await api.patch(`/admin/users/${selectedUserId}`, {
      action,
      amount: actionAmount,
      reason: "Admin dashboard adjustment",
    });
    await loadAdminData();
  };

  const runCertificateAction = async (action: string) => {
    if (!selectedUserId || !selectedCourseId) return;
    await api.post("/admin/certificate-access", {
      action,
      userId: selectedUserId,
      courseId: selectedCourseId,
    });
    await loadAdminData();
  };

  const cards: Array<[string, number, LucideIcon]> = dashboard
    ? [
        [t("admin.totalUsersLabel"), dashboard.cards.totalUsers, Users],
        [t("admin.activeUsersLabel"), dashboard.cards.activeUsers, Zap],
        [t("admin.courses"), dashboard.cards.courses, BookOpen],
        [t("admin.lessonsPage"), dashboard.cards.lessons, BookOpen],
        [t("admin.certificatesIssuedLabel"), dashboard.cards.certificatesIssued, Award],
        [t("admin.premiumSubscribersLabel"), dashboard.cards.premiumSubscribers, Shield],
      ]
    : [];

  return (
    <div className="space-y-10 p-6 text-white md:p-10">
      <header>
        <h1 className="text-3xl font-black text-yellow-400">{t("admin.adminDashboardTitle")}</h1>
        <p className="mt-1 text-zinc-400">
          {t("admin.adminDashboardDescription")}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {cards.map(([title, value, Icon]) => (
          <div key={title as string} className="rounded-lg border border-zinc-800 bg-[#111] p-5">
            <Icon className="mb-4 text-yellow-400" size={22} />
            <p className="text-xs uppercase text-zinc-500">{title as string}</p>
            <p className="mt-2 text-3xl font-black">{Number(value).toLocaleString()}</p>
          </div>
        ))}
      </section>

      {dashboard && (
        <section className="grid gap-6 lg:grid-cols-3">
          <Chart title={t("admin.newUsersChartTitle")} points={dashboard.charts.newUsersOverTime} />
          <Chart
            title={t("admin.certificatesIssuedChartTitle")}
            points={dashboard.charts.certificatesIssuedOverTime}
          />
          <Chart title={t("admin.xpEarnedChartTitle")} points={dashboard.charts.xpEarnedOverTime} />
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-zinc-800 bg-[#111] p-6">
          <h2 className="mb-5 text-xl font-black">{t("admin.userManagementTitle")}</h2>
          <div className="grid gap-4 md:grid-cols-[1fr_160px]">
            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              className="rounded bg-black p-3 text-white"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username} - {user.email}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={amount}
              min={1}
              onChange={(event) => setAmount(Number(event.target.value))}
              className="rounded bg-black p-3 text-white"
            />
          </div>
          {selectedUser && (
            <p className="mt-3 text-sm text-zinc-400">
              {t("admin.userStatsLine", {
                role: selectedUser.role,
                xp: selectedUser.experience,
                coins: selectedUser.coins,
                status: selectedUser.premiumSubscriptions.length ? t("gamification.activeMale") : t("admin.inactiveMale"),
              })}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            {[
              "GRANT_ADMIN",
              "REMOVE_ADMIN",
              "GRANT_PREMIUM",
              "REVOKE_PREMIUM",
              "ADD_XP",
              "REMOVE_XP",
              "ADD_COINS",
              "REMOVE_COINS",
            ].map((action) => (
              <button
                key={action}
                onClick={() =>
                  runUserAction(
                    action,
                    action.includes("XP") || action.includes("COINS") ? amount : undefined,
                  )
                }
                className="rounded bg-yellow-400 px-3 py-2 text-xs font-black text-black"
              >
                {t(userActionLabelKeys[action])}
              </button>
            ))}
          </div>
          {usersTotalPages > 1 && (
            <div className="mt-4">
              <Pagination currentPage={usersPage} totalPages={usersTotalPages} onPageChange={setUsersPage} />
            </div>
          )}
        </div>

        <div className="rounded-lg border border-zinc-800 bg-[#111] p-6">
          <h2 className="mb-5 text-xl font-black">{t("admin.certificateAccessTitle")}</h2>
          <input
            value={selectedCourseId}
            onChange={(event) => setSelectedCourseId(event.target.value)}
            placeholder={t("admin.courseIdPlaceholder")}
            className="mb-4 w-full rounded bg-black p-3 text-white"
          />
          <div className="flex flex-wrap gap-3">
            {["GRANT", "SIMULATE_PAID", "REVOKE"].map((action) => (
              <button
                key={action}
                onClick={() => runCertificateAction(action)}
                className="rounded bg-yellow-400 px-3 py-2 text-xs font-black text-black"
              >
                {t(certificateActionLabelKeys[action])}
              </button>
            ))}
          </div>
          <div className="mt-5 max-h-72 space-y-3 overflow-auto">
            {accesses.map((access) => (
              <div key={access.id} className="rounded border border-zinc-800 p-3 text-sm">
                <p className="font-bold">{access.user.username}</p>
                <p className="text-zinc-500">
                  {access.accessType} - {access.course.translations[0]?.title ?? t("admin.courseFallback")}
                </p>
              </div>
            ))}
          </div>
          {accessesTotalPages > 1 && (
            <div className="mt-4">
              <Pagination currentPage={accessesPage} totalPages={accessesTotalPages} onPageChange={setAccessesPage} />
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-[#111] p-6">
        <h2 className="mb-5 text-xl font-black">{t("admin.recentActivityTitle")}</h2>
        <div className="space-y-3">
          {(dashboard?.recentActivity ?? []).map((activity) => (
            <div key={activity.id} className="flex justify-between rounded bg-black p-4">
              <div>
                <p className="font-bold">{activity.label}</p>
                <p className="text-sm text-zinc-500">
                  {activity.user.username} - {activity.user.email}
                </p>
              </div>
              <time className="text-xs text-zinc-500">
                {new Date(activity.createdAt).toLocaleDateString()}
              </time>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Chart({ title, points }: { title: string; points: ChartPoint[] }) {
  const max = Math.max(...points.map((point) => point.value), 1);
  return (
    <div className="rounded-lg border border-zinc-800 bg-[#111] p-6">
      <h2 className="mb-5 text-lg font-black">{title}</h2>
      <div className="flex h-40 items-end gap-2">
        {points.map((point) => (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-t bg-yellow-400"
              style={{ height: `${Math.max((point.value / max) * 100, 4)}%` }}
            />
            <span className="text-[10px] text-zinc-500">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
