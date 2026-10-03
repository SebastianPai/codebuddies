"use client";

import NpcAdmin from "@/features/admin/companions/NpcAdmin";
import { useTranslation } from "../../../src/i18n/useTranslation";

export default function AdminButlerPage() {
  const t = useTranslation();
  return <NpcAdmin kind="BUTLER" title={t("admin.butlerTitle")} subtitle={t("admin.butlerSubtitle")} />;
}
