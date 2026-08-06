"use client";

import { useTranslation } from "../../../src/i18n/useTranslation";

export default function AdminCommunityPage() {
  const t = useTranslation();
  return (
    <div className="p-10 text-white">
      <h1 className="text-3xl font-black text-yellow-400">{t("admin.communityStubTitle")}</h1>
      <p className="mt-3 text-zinc-400">
        {t("admin.communityStubDescription")}
      </p>
    </div>
  );
}
