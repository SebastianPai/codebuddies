"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { api } from "../../../../../utils/api";
import AchievementAdminForm from "../../components/AchievementAdminForm";
import type { AdminAchievement, RewardBundle } from "../../components/admin-gamification-types";
import { useTranslation } from "../../../../../src/i18n/useTranslation";

export default function EditAchievementPage() {
  const t = useTranslation();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [achievement, setAchievement] = useState<AdminAchievement | null>(null);
  const [bundles, setBundles] = useState<RewardBundle[]>([]);

  useEffect(() => {
    void Promise.all([
      api.get<AdminAchievement>(`/admin/gamification/achievements/${params.id}`),
      api.get<RewardBundle[]>("/admin/gamification/reward-bundles"),
    ]).then(([achievementData, bundleData]) => {
      setAchievement(achievementData);
      setBundles(bundleData);
    });
  }, [params.id]);

  if (!achievement) return <div className="p-6 text-zinc-500">{t("common.loading")}</div>;

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-black">{t("gamification.editAchievement")}</h1>
      <AchievementAdminForm
        initial={achievement}
        bundles={bundles}
        onSubmit={async (payload) => {
          await api.patch(`/admin/gamification/achievements/${achievement.id}`, payload);
          toast.success(t("gamification.achievementUpdated"));
          router.push("/admin/gamification/achievements");
        }}
      />
    </div>
  );
}
