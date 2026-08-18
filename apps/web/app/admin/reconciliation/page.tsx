"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AlertCircle, CheckCircle2, GitCompare } from "lucide-react";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../../src/i18n/useTranslation";

type IssueType =
  | "CERTIFICATE_PAID_NOT_ISSUED"
  | "WEBHOOK_STUCK_RECEIVED"
  | "WEBHOOK_FAILED"
  | "COIN_PURCHASE_COMPLETED_NO_LEDGER";

interface ReconciliationIssue {
  type: IssueType;
  severity: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  data: Record<string, unknown>;
}

interface ReconciliationReport {
  issues: ReconciliationIssue[];
  summary: Record<IssueType, number>;
}

const SEVERITY_STYLES: Record<string, string> = {
  HIGH: "bg-red-900/40 text-red-400 border-red-900",
  MEDIUM: "bg-yellow-900/40 text-yellow-400 border-yellow-900",
  LOW: "bg-zinc-800 text-zinc-400 border-zinc-800",
};

export default function AdminReconciliationPage() {
  const t = useTranslation();
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    api
      .get<ReconciliationReport>("/admin/reconciliation")
      .then(setReport)
      .catch(() => {
        setError(true);
        toast.error(t("admin.reconciliationLoadError"));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const severityLabel = (severity: string) =>
    severity === "HIGH"
      ? t("admin.severityHigh")
      : severity === "MEDIUM"
        ? t("admin.severityMedium")
        : t("admin.severityLow");

  return (
    <div className="p-10 space-y-6">
      <div className="flex items-center gap-3">
        <GitCompare className="text-yellow-400" />
        <div>
          <h1 className="text-3xl font-bold text-yellow-400">{t("admin.reconciliationNav")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("admin.reconciliationPageDescription")}</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-900 bg-red-950/30 p-6 text-center text-sm text-red-300">
          {t("admin.reconciliationLoadError")}
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-sm text-zinc-500">{t("common.loading")}</div>
      ) : !report ? null : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Object.entries(report.summary).map(([type, count]) => (
              <div key={type} className="rounded-lg border border-zinc-800 bg-[#111] p-4">
                <p className="text-xs text-zinc-500">{type}</p>
                <p className={`mt-1 text-2xl font-bold ${count > 0 ? "text-red-400" : "text-green-400"}`}>
                  {count}
                </p>
              </div>
            ))}
          </div>

          {report.issues.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-zinc-800 p-10 text-center">
              <CheckCircle2 className="text-green-400" size={28} />
              <p className="text-sm text-zinc-400">{t("admin.noIssuesFound")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {report.issues.map((issue, index) => (
                <div
                  key={`${issue.type}-${index}`}
                  className={`rounded-lg border p-4 ${SEVERITY_STYLES[issue.severity]}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} />
                      <span className="text-sm font-semibold">{issue.description}</span>
                    </div>
                    <span className="rounded-full bg-black/30 px-2 py-0.5 text-xs font-semibold">
                      {severityLabel(issue.severity)}
                    </span>
                  </div>
                  <pre className="mt-3 overflow-x-auto rounded bg-black/40 p-2 text-xs text-zinc-400">
                    {JSON.stringify(issue.data, null, 2)}
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
