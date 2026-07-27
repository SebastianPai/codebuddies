"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { api } from "../../../../../utils/api";
import AchievementAdminForm from "../../components/AchievementAdminForm";
import type { RewardBundle } from "../../components/admin-gamification-types";
import { useTranslation } from "../../../../../src/i18n/useTranslation";

export default function NewAchievementPage() {
  const t = useTranslation();
  const router = useRouter();
  const [bundles, setBundles] = useState<RewardBundle[]>([]);

  useEffect(() => {
    api.get<RewardBundle[]>("/admin/gamification/reward-bundles").then(setBundles).catch(() => setBundles([]));
  }, []);

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-black">{t("gamification.createAchievement")}</h1>
      <AchievementAdminForm
        bundles={bundles}
        onSubmit={async (payload) => {
          await api.post("/admin/gamification/achievements", payload);
          toast.success(t("gamification.achievementCreated"));
          router.push("/admin/gamification/achievements");
        }}
      />
    </div>
  );
}
