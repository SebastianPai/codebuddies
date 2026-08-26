"use client";

import { useEffect, useState } from "react";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";

type Log = {
  id: string;
  email: string;
  status: string;
  error: string | null;
  createdAt: string;
  campaign: { name: string } | null;
  user: { username: string };
};

export default function EmailHistoryAdminPage() {
  const t = useTranslation();
  const [logs, setLogs] = useState<Log[]>([]);
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const loadLogs = () => {
    api.get<Log[]>("/email/admin/history").then(setLogs).catch(() => setLogs([]));
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const sendTest = async () => {
    if (!testEmail) return;
    setSending(true);
    setTestResult(null);
    try {
      const result = await api.post<{ success: boolean; error?: string }>(
        "/email/admin/test-send",
        { to: testEmail },
      );
      setTestResult(result.success ? "Enviado correctamente." : `Falló: ${result.error}`);
    } catch (err) {
      setTestResult(`Falló: ${err instanceof Error ? err.message : "Error desconocido"}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-10 text-white">
      <h1 className="text-3xl font-black text-yellow-400">{t("site.emailHistory")}</h1>

      <div className="mt-6 flex items-center gap-3">
        <input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
          className="rounded border border-zinc-700 bg-[#111] px-3 py-2 text-sm text-white"
        />
        <button
          onClick={sendTest}
          disabled={sending || !testEmail}
          className="rounded bg-yellow-400 px-4 py-2 text-sm font-black text-black disabled:opacity-50"
        >
          {sending ? "Enviando..." : "Enviar correo de prueba"}
        </button>
        {testResult && <span className="text-sm text-zinc-300">{testResult}</span>}
      </div>

      <div className="mt-6 space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="rounded border border-zinc-800 bg-[#111] p-4">
            <p className="font-black">{log.campaign?.name ?? t("site.manual")} - {log.status}</p>
            <p className="text-sm text-zinc-400">{log.user.username} / {log.email}</p>
            {log.error && <p className="text-sm text-red-400">{log.error}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
