"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { api } from "../../../../../utils/api";
import MissionAdminForm from "../../components/MissionAdminForm";
import type { AdminMission, RewardBundle } from "../../components/admin-gamification-types";
import { useTranslation } from "../../../../../src/i18n/useTranslation";

export default function EditMissionPage() {
  const t = useTranslation();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [mission, setMission] = useState<AdminMission | null>(null);
  const [bundles, setBundles] = useState<RewardBundle[]>([]);

  useEffect(() => {
    void Promise.all([
      api.get<AdminMission>(`/admin/gamification/missions/${params.id}`),
      api.get<RewardBundle[]>("/admin/gamification/reward-bundles"),
    ]).then(([missionData, bundleData]) => {
      setMission(missionData);
      setBundles(bundleData);
    });
  }, [params.id]);

  if (!mission) return <div className="p-6 text-zinc-500">{t("common.loading")}</div>;

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-black">{t("gamification.editMission")}</h1>
      <MissionAdminForm
        initial={mission}
        bundles={bundles}
        onSubmit={async (payload) => {
          await api.patch(`/admin/gamification/missions/${mission.id}`, {
            ...payload,
            startsAt: payload.startsAt || null,
            endsAt: payload.endsAt || null,
          });
          toast.success(t("gamification.missionUpdated"));
          router.push("/admin/gamification/missions");
        }}
      />
    </div>
  );
}
