"use client";

import { useEffect, useState } from "react";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";

export default function SettingsPage() {
  const t = useTranslation();
  const [enabled, setEnabled] = useState(true);
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    api
      .get<{ marketingEmailsEnabled: boolean }>("/email/preferences")
      .then((data) => setEnabled(data.marketingEmailsEnabled))
      .catch(() => setEnabled(true));

    api
      .get<{ birthDate: string | null; country: string | null }>("/identity/me")
      .then((data) => {
        if (data.birthDate) setBirthDate(data.birthDate.slice(0, 10));
        if (data.country) setCountry(data.country);
      })
      .catch(() => {});
  }, []);

  const save = async (receiveMarketingEmails: boolean) => {
    setEnabled(receiveMarketingEmails);
    await api.patch("/email/preferences", { receiveMarketingEmails });
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.patch("/identity/profile", {
        birthDate: birthDate || undefined,
        country: country || undefined,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl py-12">
      <h1 className="text-5xl font-black">{t("site.settings")}</h1>
      <section className="mt-8 rounded-lg border border-[rgb(var(--border))] p-6">
        <h2 className="text-2xl font-black">{t("site.personalInfo")}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold">{t("site.birthDate")}</span>
            <input
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              className="rounded border border-[rgb(var(--border))] bg-transparent p-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold">{t("site.country")}</span>
            <input
              type="text"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="rounded border border-[rgb(var(--border))] bg-transparent p-2"
            />
          </label>
        </div>
        <button
          onClick={() => void saveProfile()}
          disabled={savingProfile}
          className="mt-4 rounded bg-yellow-400 px-4 py-2 font-bold text-black disabled:opacity-50"
        >
          {t("site.saveProfile")}
        </button>
      </section>
      <section className="mt-8 rounded-lg border border-[rgb(var(--border))] p-6">
        <h2 className="text-2xl font-black">{t("site.emailPreferences")}</h2>
        <label className="mt-5 flex items-center justify-between gap-4">
          <span>
            <span className="block font-bold">{t("site.receiveMarketing")}</span>
            <span className="text-sm text-[rgb(var(--secondary-text))]">
              {t("site.emailDescription")}
            </span>
          </span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => void save(event.target.checked)}
            className="h-5 w-5"
          />
        </label>
      </section>
    </div>
  );
}
