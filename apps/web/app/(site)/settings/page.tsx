"use client";

import { useEffect, useState } from "react";
import { Check, Lock } from "lucide-react";
import { getNameEffectCatalog } from "@codebuddies/visual-effects";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";
import { RarityText } from "@/shared/ui/rarity-text";

const NAME_EFFECT_LIST = getNameEffectCatalog();

export default function SettingsPage() {
  const t = useTranslation();
  const [enabled, setEnabled] = useState(true);
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [username, setUsername] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [nameEffectId, setNameEffectId] = useState("common");
  const [savingNameEffect, setSavingNameEffect] = useState(false);
  const [nameEffectError, setNameEffectError] = useState("");

  useEffect(() => {
    api
      .get<{ marketingEmailsEnabled: boolean }>("/email/preferences")
      .then((data) => setEnabled(data.marketingEmailsEnabled))
      .catch(() => setEnabled(true));

    api
      .get<{
        birthDate: string | null;
        country: string | null;
        username: string;
        isPremium: boolean;
        nameEffectId: string | null;
      }>("/identity/me")
      .then((data) => {
        if (data.birthDate) setBirthDate(data.birthDate.slice(0, 10));
        if (data.country) setCountry(data.country);
        setUsername(data.username);
        setIsPremium(data.isPremium);
        setNameEffectId(data.nameEffectId || "common");
      })
      .catch(() => {});
  }, []);

  const selectNameEffect = async (id: string, tier: "free" | "premium") => {
    setNameEffectError("");
    if (tier === "premium" && !isPremium) {
      setNameEffectError(t("site.nameEffectPremiumRequired"));
      return;
    }

    const previous = nameEffectId;
    setNameEffectId(id);
    setSavingNameEffect(true);
    try {
      await api.patch("/identity/profile", { nameEffectId: id });
    } catch {
      setNameEffectId(previous);
      setNameEffectError(t("site.nameEffectSaveError"));
    } finally {
      setSavingNameEffect(false);
    }
  };

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
        <h2 className="text-2xl font-black">{t("site.nameEffectTitle")}</h2>
        <p className="mt-1 text-sm text-[rgb(var(--secondary-text))]">{t("site.nameEffectHint")}</p>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {NAME_EFFECT_LIST.map((effect) => {
            const locked = effect.unlockRule === "premium" && !isPremium;
            const selected = nameEffectId === effect.id;
            return (
              <button
                key={effect.id}
                type="button"
                disabled={savingNameEffect}
                onClick={() => void selectNameEffect(effect.id, effect.unlockRule)}
                className={`flex items-center gap-1.5 rounded-lg border p-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed ${
                  selected
                    ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.08)]"
                    : "border-[rgb(var(--border))] hover:border-[rgb(var(--primary)/0.4)]"
                } ${locked ? "opacity-55" : ""}`}
              >
                {locked ? <Lock size={12} /> : selected ? <Check size={12} /> : null}
                <RarityText effect={effect.id} className="truncate">
                  {username || "..."}
                </RarityText>
              </button>
            );
          })}
        </div>
        {nameEffectError && <p className="mt-3 text-sm text-red-400">{nameEffectError}</p>}
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
