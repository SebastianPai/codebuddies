"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { AlertTriangle, ShieldAlert, TrendingUp } from "lucide-react";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../../src/i18n/useTranslation";

type FraudAlertType = "XP_SPIKE_24H" | "COIN_SPIKE_24H";

interface FraudAlert {
  type: FraudAlertType;
  severity: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  data: {
    userId: string;
    username?: string;
    email?: string;
    xpGained24h?: number;
    coinsGained24h?: number;
    currentLevel?: number;
    currentExperience?: number;
    currentBalance?: number;
  };
}

interface FraudReport {
  alerts: FraudAlert[];
  summary: Record<FraudAlertType, number>;
}

const SEVERITY_STYLES: Record<string, string> = {
  HIGH: "bg-red-900/40 text-red-400 border-red-900",
  MEDIUM: "bg-yellow-900/40 text-yellow-400 border-yellow-900",
  LOW: "bg-zinc-800 text-zinc-400 border-zinc-800",
};

const TYPE_ICON: Record<FraudAlertType, React.ReactNode> = {
  XP_SPIKE_24H: <TrendingUp size={16} />,
  COIN_SPIKE_24H: <TrendingUp size={16} />,
};

export default function AdminFraudAlertsPage() {
  const t = useTranslation();
  const [report, setReport] = useState<FraudReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    api
      .get<FraudReport>("/admin/fraud-alerts")
      .then(setReport)
      .catch(() => {
        setError(true);
        toast.error(t("admin.fraudAlertsLoadError"));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typeLabel = (type: FraudAlertType) =>
    type === "XP_SPIKE_24H" ? t("admin.fraudAlertXpSpike") : t("admin.fraudAlertCoinSpike");

  return (
    <div className="p-10 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="text-yellow-400" />
        <div>
          <h1 className="text-3xl font-bold text-yellow-400">{t("admin.fraudAlertsNav")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            {t("admin.fraudAlertsPageDescription")}
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-900 bg-red-950/30 p-6 text-center text-sm text-red-300">
          {t("admin.fraudAlertsLoadError")}
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-sm text-zinc-500">{t("common.loading")}</div>
      ) : !report ? null : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:w-1/2">
            {Object.entries(report.summary).map(([type, count]) => (
              <div key={type} className="rounded-lg border border-zinc-800 bg-[#111] p-4">
                <p className="text-xs text-zinc-500">{typeLabel(type as FraudAlertType)}</p>
                <p className={`mt-1 text-2xl font-bold ${count > 0 ? "text-yellow-400" : "text-green-400"}`}>
                  {count}
                </p>
              </div>
            ))}
          </div>

          {report.alerts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
              {t("admin.noFraudAlertsFound")}
            </div>
          ) : (
            <div className="space-y-3">
              {report.alerts.map((alert, index) => (
                <div
                  key={`${alert.type}-${alert.data.userId}-${index}`}
                  className={`rounded-lg border p-4 ${SEVERITY_STYLES[alert.severity]}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {TYPE_ICON[alert.type]}
                      <span className="text-sm font-semibold">{alert.description}</span>
                    </div>
                    <Link
                      href={`/admin/users/${alert.data.userId}`}
                      className="flex items-center gap-1 rounded bg-black/30 px-3 py-1 text-xs font-semibold hover:bg-black/50"
                    >
                      <AlertTriangle size={12} />
                      {t("admin.viewUserAction")}
                    </Link>
                  </div>
                  <pre className="mt-3 overflow-x-auto rounded bg-black/40 p-2 text-xs text-zinc-400">
                    {JSON.stringify(alert.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
