"use client";

import { useEffect, useState } from "react";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";

type Template = { id: string; name: string; type: string; language: string };
type Campaign = { id: string; name: string; status: string; audience: string; template: Template };

const audiences = ["ALL_USERS", "PREMIUM_USERS", "FREE_USERS", "ACTIVE_USERS", "INACTIVE_USERS", "CERTIFICATE_HOLDERS"];
const roles = ["", "STUDENT", "ADMIN"];
const languages = ["", "es", "en"];

export default function EmailCampaignsAdminPage() {
  const t = useTranslation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState({
    templateId: "",
    name: "",
    audience: "ALL_USERS",
    scheduledAt: "",
    role: "",
    language: "",
    country: "",
  });

  const load = async () => {
    const [templateData, campaignData] = await Promise.all([
      api.get<Template[]>("/email/admin/templates"),
      api.get<Campaign[]>("/email/admin/campaigns"),
    ]);
    setTemplates(templateData);
    setCampaigns(campaignData);
    setForm((current) => ({ ...current, templateId: current.templateId || templateData[0]?.id || "" }));
  };
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const create = async () => {
    await api.post("/email/admin/campaigns", {
      ...form,
      scheduledAt: form.scheduledAt || undefined,
      role: form.role || undefined,
      language: form.language || undefined,
      country: form.country || undefined,
    });
    await load();
  };

  return (
    <div className="space-y-8 p-10 text-white">
      <h1 className="text-3xl font-black text-yellow-400">{t("admin.emailCampaignsTitle")}</h1>
      <div className="grid gap-3 rounded border border-zinc-800 bg-[#111] p-5">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("admin.campaignNamePlaceholder")} className="rounded bg-black p-3" />
        <select value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })} className="rounded bg-black p-3">
          {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
        </select>
        <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="rounded bg-black p-3">
          {audiences.map((audience) => <option key={audience}>{audience}</option>)}
        </select>
        <div className="grid gap-3 sm:grid-cols-3">
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="rounded bg-black p-3">
            {roles.map((role) => <option key={role} value={role}>{role || t("admin.filterAnyRole")}</option>)}
          </select>
          <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="rounded bg-black p-3">
            {languages.map((language) => <option key={language} value={language}>{language || t("admin.filterAnyLanguage")}</option>)}
          </select>
          <input
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            placeholder={t("admin.filterCountryPlaceholder")}
            className="rounded bg-black p-3"
          />
        </div>
        <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="rounded bg-black p-3" />
        <button onClick={create} className="rounded bg-yellow-400 px-4 py-3 font-bold text-black">{t("admin.saveDraftScheduleButton")}</button>
      </div>
      {campaigns.map((campaign) => (
        <div key={campaign.id} className="flex items-center justify-between rounded border border-zinc-800 bg-[#111] p-4">
          <div>
            <p className="font-black">{campaign.name}</p>
            <p className="text-sm text-zinc-400">{campaign.audience} - {campaign.status}</p>
          </div>
          <button onClick={async () => { await api.post(`/email/admin/campaigns/${campaign.id}/send`); await load(); }} className="rounded bg-yellow-400 px-3 py-2 font-bold text-black">{t("admin.sendNowButton")}</button>
        </div>
      ))}
    </div>
  );
}
