"use client"; import { useTranslation } from "../../../src/i18n/useTranslation";
export default function AdminSettingsPage() { const t = useTranslation();
  return (
    <div className="p-10 text-white">
      <h1 className="text-3xl font-black text-yellow-400">{t("site.settings")}</h1>
      <p className="mt-3 text-zinc-400">
        {t("site.platformSettings")}
      </p>
    </div>
  );
}
