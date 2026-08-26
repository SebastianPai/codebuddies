"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";

function parseVariablesText(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const [key, ...rest] = line.split("=");
    const trimmedKey = key?.trim();
    if (trimmedKey && rest.length) result[trimmedKey] = rest.join("=").trim();
  }
  return result;
}

type Template = {
  id: string;
  type: string;
  language: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
};

const templateTypes = [
  "WELCOME",
  "PREMIUM_ACTIVATED",
  "CERTIFICATE_ISSUED",
  "BIRTHDAY",
  "CHRISTMAS",
  "NEW_YEAR",
  "HALLOWEEN",
  "PROMOTION",
  "NEW_COURSE_AVAILABLE",
];

export default function EmailTemplatesAdminPage() {
  const t = useTranslation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState({
    type: "WELCOME",
    language: "es",
    name: "",
    subject: "",
    body: "",
    variables: "username",
  });

  const [testEmail, setTestEmail] = useState("");
  const [testVariables, setTestVariables] = useState("coins=200\npremiumDays=7\npromoCode=HALLOWEEN2026");
  const [sendingTest, setSendingTest] = useState(false);

  const load = () => api.get<Template[]>("/email/admin/templates").then(setTemplates);
  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    await api.post("/email/admin/templates", {
      ...form,
      variables: form.variables.split(",").map((value) => value.trim()).filter(Boolean),
      active: true,
    });
    await load();
  };

  const sendTest = async () => {
    if (!testEmail) return;
    setSendingTest(true);
    try {
      const result = await api.post<{ success: boolean; error?: string }>("/email/admin/test-send", {
        to: testEmail,
        type: form.type,
        language: form.language,
        variables: parseVariablesText(testVariables),
      });
      if (result.success) {
        toast.success(t("admin.testEmailSentToast"));
      } else {
        toast.error(result.error ?? t("admin.testEmailError"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.testEmailError"));
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-8 p-10 text-white">
      <h1 className="text-3xl font-black text-yellow-400">{t("admin.emailTemplatesTitle")}</h1>
      <div className="grid gap-3 rounded-lg border border-zinc-800 bg-[#111] p-5">
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded bg-black p-3">
          {templateTypes.map((type) => <option key={type}>{type}</option>)}
        </select>
        {(["language", "name", "subject", "variables"] as const).map((field) => (
          <input key={field} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} placeholder={field} className="rounded bg-black p-3" />
        ))}
        <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder={t("admin.templateBodyPlaceholder")} className="min-h-40 rounded bg-black p-3" />
        <button onClick={save} className="rounded bg-yellow-400 px-4 py-3 font-bold text-black">{t("admin.saveTemplateButton")}</button>
      </div>

      <div className="grid gap-3 rounded-lg border border-zinc-800 bg-[#111] p-5">
        <h2 className="font-black text-yellow-400">{t("admin.sendTestEmailTitle", { type: form.type })}</h2>
        <p className="text-sm text-zinc-400">{t("admin.sendTestEmailDescription")}</p>
        <input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder={t("admin.testEmailAddressPlaceholder")}
          className="rounded bg-black p-3"
        />
        <textarea
          value={testVariables}
          onChange={(e) => setTestVariables(e.target.value)}
          placeholder="clave=valor"
          className="min-h-24 rounded bg-black p-3 font-mono text-sm"
        />
        <p className="text-xs text-zinc-500">{t("admin.testEmailVariablesHelper")}</p>
        <button
          onClick={() => void sendTest()}
          disabled={sendingTest || !testEmail}
          className="rounded border border-yellow-400 px-4 py-3 font-bold text-yellow-400 disabled:opacity-50"
        >
          {sendingTest ? t("admin.sendingEllipsis") : t("admin.sendTestEmailButton")}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <div key={template.id} className="rounded border border-zinc-800 bg-[#111] p-4">
            <p className="text-yellow-400">{template.type} / {template.language}</p>
            <h2 className="font-black">{template.name}</h2>
            <p className="text-sm text-zinc-400">{template.subject}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
