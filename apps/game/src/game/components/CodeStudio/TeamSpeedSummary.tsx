"use client";

import { useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { Company } from "./types";
import { useTranslation } from "../../../i18n/useTranslation";

// Mismo calculo que usa el motor de simulacion para la velocidad de
// desarrollo (codestudio-engine.service.ts: productivity = sum(productivity
// * speed), o 0.35 base sin empleados) — se mantiene espejado aca para
// mostrarselo al jugador en vivo sin tener que exponer un campo nuevo desde
// el backend.
export function teamSpeedMultiplier(employees: Company["employees"]) {
  if (employees.length === 0) return 0.35;
  return employees.reduce((sum, employee) => sum + (employee.productivity ?? 1) * (employee.speed ?? 1), 0);
}

export function employeeSpeedContribution(employee: Company["employees"][number]) {
  return (employee.productivity ?? 1) * (employee.speed ?? 1);
}

export default function TeamSpeedSummary({ company }: { company: Company }) {
  const t = useTranslation();
  const speed = teamSpeedMultiplier(company.employees);
  const previousSpeedRef = useRef(speed);
  const [bump, setBump] = useState<number | null>(null);

  useEffect(() => {
    const delta = speed - previousSpeedRef.current;
    if (delta > 0.01) {
      setBump(delta);
      const timer = window.setTimeout(() => setBump(null), 2800);
      previousSpeedRef.current = speed;
      return () => window.clearTimeout(timer);
    }
    previousSpeedRef.current = speed;
  }, [speed]);

  return (
    <div className="cs-team-speed">
      <Zap size={18} />
      <div className="cs-team-speed-body">
        <div className="cs-team-speed-row">
          <span>{t("codestudioOps.employees.teamSpeedLabel")}</span>
          <b>{t("codestudioOps.employees.teamSpeedValue", { value: speed.toFixed(2) })}</b>
          {bump !== null && <em className="cs-team-speed-bump">+{bump.toFixed(2)}</em>}
        </div>
        <p>{t("codestudioOps.employees.teamSpeedHint")}</p>
      </div>
    </div>
  );
}
