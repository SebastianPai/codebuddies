"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Award,
  Coins,
  CreditCard,
  Crown,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  User as UserIcon,
} from "lucide-react";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../../../src/i18n/useTranslation";

interface UserDetail {
  id: string;
  username: string;
  email: string;
  role: "STUDENT" | "ADMIN";
  avatarUrl: string | null;
  experience: number;
  coins: number;
  level: number;
  streak: number;
  bestStreak: number;
  energy: number;
  country: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  suspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
}

interface PremiumSubscription {
  id: string;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED";
  origin: "PAYMENT" | "ADMIN";
  provider: string;
  grantedByAdminId: string | null;
  reason: string | null;
  startedAt: string;
  expiresAt: string;
}

interface CertificateOrder {
  id: string;
  courseId: string;
  amount: string;
  currency: string;
  status: string;
  paymentProvider: string;
  createdAt: string;
  paidAt: string | null;
}

interface CoinPurchase {
  id: string;
  package: string;
  coins: number;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

interface LedgerEntry {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  adminId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface UserDetailResponse {
  user: UserDetail;
  premiumSubscriptions: PremiumSubscription[];
  certificates: Array<{ id: string; courseId: string; issuedAt: string; revoked: boolean }>;
  certificateOrders: CertificateOrder[];
  coinPurchases: CoinPurchase[];
  recentCoinTransactions: LedgerEntry[];
  recentXpTransactions: LedgerEntry[];
  recentAuditLog: AuditEntry[];
  referralProfile: { referralCode: string } | null;
}

type Tab = "overview" | "economy" | "premium" | "payments" | "audit";

export default function UserDetailPage() {
  const t = useTranslation();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    api
      .get<UserDetailResponse>(`/admin/users/${userId}`)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (action: string, amount?: number, reason?: string) => {
    setBusy(true);
    try {
      await api.patch(`/admin/users/${userId}`, { action, amount, reason });
      toast.success(t("admin.actionAppliedToast"));
      load();
    } catch {
      toast.error(t("admin.actionFailedError"));
    } finally {
      setBusy(false);
    }
  };

  const askAmountAndReason = (label: string): { amount: number; reason: string } | null => {
    const amountStr = window.prompt(t("admin.promptAmount", { action: label }));
    if (!amountStr) return null;
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t("admin.invalidAmountError"));
      return null;
    }
    const reason = window.prompt(t("admin.promptReason")) ?? "";
    return { amount, reason };
  };

  if (loading) {
    return <div className="p-10 text-sm text-zinc-500">{t("common.loading")}</div>;
  }

  if (error || !data) {
    return (
      <div className="p-10">
        <div className="rounded-lg border border-red-900 bg-red-950/30 p-6 text-center text-sm text-red-300">
          {t("admin.userDetailLoadError")}
        </div>
      </div>
    );
  }

  const { user } = data;
  const activePremium = data.premiumSubscriptions.find((p) => p.status === "ACTIVE");

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "overview", label: t("admin.tabOverview") },
    { id: "economy", label: t("admin.tabEconomy") },
    { id: "premium", label: "Premium" },
    { id: "payments", label: t("admin.paymentsNav") },
    { id: "audit", label: t("admin.auditLogNav") },
  ];

  return (
    <div className="p-10 space-y-6">
      <button
        onClick={() => router.push("/admin/users")}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300"
      >
        <ArrowLeft size={14} />
        {t("site.users")}
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-zinc-500">
            <UserIcon size={24} />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
              {user.username}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  user.role === "ADMIN"
                    ? "bg-yellow-400/10 text-yellow-400"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {user.role}
              </span>
              {activePremium && (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/10 px-2 py-0.5 text-xs text-yellow-400">
                  <Crown size={11} /> Premium
                </span>
              )}
              {user.suspended && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-900/40 px-2 py-0.5 text-xs text-red-400">
                  <ShieldAlert size={11} /> {t("admin.suspendedBadge")}
                </span>
              )}
            </h1>
            <p className="text-sm text-zinc-500">{user.email}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {user.suspended ? (
            <button
              disabled={busy}
              onClick={() => {
                if (!confirm(t("admin.confirmUnsuspendUser"))) return;
                runAction("UNSUSPEND_USER");
              }}
              className="flex items-center gap-1.5 rounded bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-green-400 hover:bg-zinc-700 disabled:opacity-50"
            >
              <ShieldCheck size={14} />
              {t("admin.unsuspendUserAction")}
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={() => {
                const reason = window.prompt(t("admin.promptSuspendReason"));
                if (reason === null) return;
                if (!reason.trim()) {
                  toast.error(t("admin.reasonRequiredError"));
                  return;
                }
                if (!confirm(t("admin.confirmSuspendUser"))) return;
                runAction("SUSPEND_USER", undefined, reason);
              }}
              className="flex items-center gap-1.5 rounded bg-red-950/50 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-950 disabled:opacity-50"
            >
              <ShieldAlert size={14} />
              {t("admin.suspendUserAction")}
            </button>
          )}
          {user.role === "ADMIN" ? (
            <button
              disabled={busy}
              onClick={() => {
                if (!confirm(t("admin.confirmRemoveAdmin"))) return;
                runAction("REMOVE_ADMIN");
              }}
              className="flex items-center gap-1.5 rounded bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
            >
              <ShieldOff size={14} />
              {t("admin.actionRemoveAdmin")}
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={() => {
                if (!confirm(t("admin.confirmGrantAdmin"))) return;
                runAction("GRANT_ADMIN");
              }}
              className="flex items-center gap-1.5 rounded bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
            >
              <Shield size={14} />
              {t("admin.actionGrantAdmin")}
            </button>
          )}
        </div>
      </div>

      {user.suspended && (
        <div className="rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
          <p className="font-semibold">
            {user.suspendedAt && t("admin.suspendedSinceLabel", { date: new Date(user.suspendedAt).toLocaleString() })}
          </p>
          {user.suspendedReason && <p className="mt-1 text-red-400">{user.suspendedReason}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label={t("admin.coinsColumnLabel")} value={user.coins} icon={<Coins size={16} />} />
        <StatCard label="XP" value={user.experience} icon={<Award size={16} />} />
        <StatCard label={t("admin.levelLabel")} value={user.level} icon={<UserIcon size={16} />} />
        <StatCard label={t("admin.streakLabel")} value={user.streak} icon={<Shield size={16} />} />
      </div>

      <div className="flex gap-1 border-b border-zinc-800">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`px-4 py-2 text-sm font-medium transition ${
              tab === tabItem.id
                ? "border-b-2 border-yellow-400 text-yellow-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <InfoCard title={t("admin.tabOverview")}>
            <InfoRow label={t("admin.registeredColumnLabel")} value={new Date(user.createdAt).toLocaleString()} />
            <InfoRow
              label={t("admin.lastLoginColumnLabel")}
              value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "—"}
            />
            <InfoRow label={t("admin.countryLabel")} value={user.country ?? "—"} />
            <InfoRow label={t("admin.bestStreakLabel")} value={String(user.bestStreak)} />
            <InfoRow label={t("admin.energyLabel")} value={String(user.energy)} />
            {data.referralProfile && (
              <InfoRow label={t("dashboard.referrals")} value={data.referralProfile.referralCode} />
            )}
          </InfoCard>
          <InfoCard title={t("admin.certificatesIssuedLabel")}>
            {data.certificates.length === 0 ? (
              <p className="text-sm text-zinc-600">{t("common.noResults")}</p>
            ) : (
              data.certificates.map((cert) => (
                <InfoRow
                  key={cert.id}
                  label={cert.courseId.slice(0, 8)}
                  value={
                    cert.revoked
                      ? t("admin.statusRevoked")
                      : new Date(cert.issuedAt).toLocaleDateString()
                  }
                />
              ))
            )}
          </InfoCard>
        </div>
      )}

      {tab === "economy" && (
        <div className="grid gap-4 md:grid-cols-2">
          <InfoCard
            title={t("admin.coinsColumnLabel")}
            action={
              <div className="flex gap-1.5">
                <button
                  disabled={busy}
                  onClick={() => {
                    const input = askAmountAndReason(t("admin.actionAddCoins"));
                    if (input) runAction("ADD_COINS", input.amount, input.reason);
                  }}
                  className="rounded bg-zinc-800 px-2 py-1 text-xs font-semibold text-green-400 hover:bg-zinc-700 disabled:opacity-50"
                >
                  + {t("admin.actionAddCoins")}
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    const input = askAmountAndReason(t("admin.actionRemoveCoins"));
                    if (input) runAction("REMOVE_COINS", input.amount, input.reason);
                  }}
                  className="rounded bg-zinc-800 px-2 py-1 text-xs font-semibold text-red-400 hover:bg-zinc-700 disabled:opacity-50"
                >
                  − {t("admin.actionRemoveCoins")}
                </button>
              </div>
            }
          >
            <LedgerList entries={data.recentCoinTransactions} />
          </InfoCard>
          <InfoCard
            title="XP"
            action={
              <div className="flex gap-1.5">
                <button
                  disabled={busy}
                  onClick={() => {
                    const input = askAmountAndReason(t("admin.actionAddXp"));
                    if (input) runAction("ADD_XP", input.amount, input.reason);
                  }}
                  className="rounded bg-zinc-800 px-2 py-1 text-xs font-semibold text-green-400 hover:bg-zinc-700 disabled:opacity-50"
                >
                  + {t("admin.actionAddXp")}
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    const input = askAmountAndReason(t("admin.actionRemoveXp"));
                    if (input) runAction("REMOVE_XP", input.amount, input.reason);
                  }}
                  className="rounded bg-zinc-800 px-2 py-1 text-xs font-semibold text-red-400 hover:bg-zinc-700 disabled:opacity-50"
                >
                  − {t("admin.actionRemoveXp")}
                </button>
              </div>
            }
          >
            <LedgerList entries={data.recentXpTransactions} />
          </InfoCard>
        </div>
      )}

      {tab === "premium" && (
        <InfoCard
          title={t("admin.premiumSubscriptionsNav")}
          action={
            activePremium ? (
              <button
                disabled={busy}
                onClick={() => {
                  if (!confirm(t("admin.confirmRevokePremium"))) return;
                  runAction("REVOKE_PREMIUM");
                }}
                className="rounded bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-zinc-700 disabled:opacity-50"
              >
                {t("admin.actionRevokePremium")}
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={() => {
                  const reason = window.prompt(t("admin.promptReason")) ?? "";
                  if (!confirm(t("admin.confirmGrantPremium"))) return;
                  runAction("GRANT_PREMIUM", undefined, reason);
                }}
                className="rounded bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-black hover:bg-yellow-300 disabled:opacity-50"
              >
                {t("admin.actionGrantPremium")}
              </button>
            )
          }
        >
          {data.premiumSubscriptions.length === 0 ? (
            <p className="text-sm text-zinc-600">{t("common.noResults")}</p>
          ) : (
            <div className="space-y-3">
              {data.premiumSubscriptions.map((sub) => (
                <div key={sub.id} className="rounded border border-zinc-800 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        sub.status === "ACTIVE"
                          ? "bg-green-900/40 text-green-400"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {sub.status}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {sub.origin === "ADMIN"
                        ? t("admin.premiumOriginAdmin")
                        : t("admin.premiumOriginPayment")}{" "}
                      · {sub.provider}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(sub.startedAt).toLocaleDateString()} →{" "}
                    {new Date(sub.expiresAt).toLocaleDateString()}
                  </p>
                  {sub.reason && <p className="mt-1 text-xs text-zinc-600">{sub.reason}</p>}
                </div>
              ))}
            </div>
          )}
        </InfoCard>
      )}

      {tab === "payments" && (
        <div className="grid gap-4 md:grid-cols-2">
          <InfoCard title={t("admin.paymentsNav")}>
            {data.certificateOrders.length === 0 ? (
              <p className="text-sm text-zinc-600">{t("common.noResults")}</p>
            ) : (
              data.certificateOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b border-zinc-900 py-2 text-sm last:border-0">
                  <span className="flex items-center gap-2 text-zinc-300">
                    <CreditCard size={13} className="text-zinc-600" />
                    {order.currency} {order.amount}
                  </span>
                  <StatusBadge status={order.status} />
                </div>
              ))
            )}
          </InfoCard>
          <InfoCard title={t("admin.coinPurchasesNav")}>
            {data.coinPurchases.length === 0 ? (
              <p className="text-sm text-zinc-600">{t("common.noResults")}</p>
            ) : (
              data.coinPurchases.map((purchase) => (
                <div key={purchase.id} className="flex items-center justify-between border-b border-zinc-900 py-2 text-sm last:border-0">
                  <span className="flex items-center gap-2 text-zinc-300">
                    <Coins size={13} className="text-zinc-600" />
                    {purchase.coins.toLocaleString()} coins — {purchase.currency} {purchase.amount}
                  </span>
                  <StatusBadge status={purchase.status} />
                </div>
              ))
            )}
          </InfoCard>
        </div>
      )}

      {tab === "audit" && (
        <InfoCard title={t("admin.auditLogNav")}>
          {data.recentAuditLog.length === 0 ? (
            <p className="text-sm text-zinc-600">{t("common.noResults")}</p>
          ) : (
            <div className="space-y-2">
              {data.recentAuditLog.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between border-b border-zinc-900 py-2 text-sm last:border-0">
                  <span className="rounded bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-yellow-300">
                    {entry.action}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </InfoCard>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-[#111] p-4">
      <div className="mb-2 text-zinc-500">{icon}</div>
      <p className="text-xs uppercase text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value.toLocaleString()}</p>
    </div>
  );
}

function InfoCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-[#111] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-900 py-2 text-sm last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200">{value}</span>
    </div>
  );
}

function LedgerList({ entries }: { entries: LedgerEntry[] }) {
  const t = useTranslation();
  if (entries.length === 0) {
    return <p className="text-sm text-zinc-600">{t("common.noResults")}</p>;
  }
  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-center justify-between border-b border-zinc-900 py-2 text-sm last:border-0">
          <span className="text-zinc-400">{entry.reason}</span>
          <span className={entry.amount >= 0 ? "text-green-400" : "text-red-400"}>
            {entry.amount >= 0 ? "+" : ""}
            {entry.amount.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PAID: "bg-green-900/40 text-green-400",
    COMPLETED: "bg-green-900/40 text-green-400",
    PENDING: "bg-yellow-900/40 text-yellow-400",
    FAILED: "bg-red-900/40 text-red-400",
    CANCELLED: "bg-zinc-800 text-zinc-400",
    REFUNDED: "bg-zinc-800 text-zinc-400",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status] ?? "bg-zinc-800 text-zinc-400"}`}>
      {status}
    </span>
  );
}
