"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { api } from "../../../../../utils/api";
import MissionAdminForm from "../../components/MissionAdminForm";
import type { RewardBundle } from "../../components/admin-gamification-types";
import { useTranslation } from "../../../../../src/i18n/useTranslation";

export default function NewMissionPage() {
  const t = useTranslation();
  const router = useRouter();
  const [bundles, setBundles] = useState<RewardBundle[]>([]);

  useEffect(() => {
    api.get<RewardBundle[]>("/admin/gamification/reward-bundles").then(setBundles).catch(() => setBundles([]));
  }, []);

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-black">{t("gamification.createMission")}</h1>
      <MissionAdminForm
        bundles={bundles}
        onSubmit={async (payload) => {
          await api.post("/admin/gamification/missions", {
            ...payload,
            startsAt: payload.startsAt || null,
            endsAt: payload.endsAt || null,
          });
          toast.success(t("gamification.missionCreated"));
          router.push("/admin/gamification/missions");
        }}
      />
    </div>
  );
}
