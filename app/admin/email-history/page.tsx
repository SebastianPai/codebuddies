"use client";

import { useEffect, useState } from "react";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";

type Log = {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  campaign: { name: string } | null;
  user: { username: string };
};

export default function EmailHistoryAdminPage() {
  const t = useTranslation();
  const [logs, setLogs] = useState<Log[]>([]);
  useEffect(() => {
    api.get<Log[]>("/email/admin/history").then(setLogs).catch(() => setLogs([]));
  }, []);
  return (
    <div className="p-10 text-white">
      <h1 className="text-3xl font-black text-yellow-400">{t("site.emailHistory")}</h1>
      <div className="mt-6 space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="rounded border border-zinc-800 bg-[#111] p-4">
            <p className="font-black">{log.campaign?.name ?? t("site.manual")} - {log.status}</p>
            <p className="text-sm text-zinc-400">{log.user.username} / {log.email}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
