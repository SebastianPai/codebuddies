"use client";

import { useEffect, useState } from "react";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";

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
