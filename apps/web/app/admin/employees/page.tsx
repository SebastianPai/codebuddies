"use client";

import NpcAdmin from "@/features/admin/companions/NpcAdmin";
import EmployeeWardrobe from "@/features/admin/companions/EmployeeWardrobe";
import { useTranslation } from "../../../src/i18n/useTranslation";

// Empleados de CodeStudio: ropa por piezas (como un jugador) y, aparte,
// skins completas opcionales.
export default function AdminEmployeesPage() {
  const t = useTranslation();
  return (
    <NpcAdmin kind="EMPLOYEE" title={t("admin.employeesTitle")} subtitle={t("admin.employeesSubtitle")}>
      <EmployeeWardrobe />
      <h2 className="text-xl font-bold text-white">{t("admin.employeesSkinsTitle")}</h2>
      <p className="max-w-2xl text-sm text-zinc-400">{t("admin.npcEmployeeHint")}</p>
    </NpcAdmin>
  );
}
