"use client";

import { useState } from "react";
import { Wrench } from "lucide-react";
import { Company } from "./types";
import { format } from "./utils";
import { useTranslation } from "../../../i18n/useTranslation";

type Bug = Company["bugReports"][number];

type Props = {
  bug: Bug;
  employees: Company["employees"];
  cash: number;
  onFix: (bugId: string, method: "cash" | "employee", employeeId?: string) => void;
};

const SEVERITY_KEY: Record<Bug["severity"], string> = {
  LOW: "codestudioOps.development.severityLow",
  MEDIUM: "codestudioOps.development.severityMedium",
  HIGH: "codestudioOps.development.severityHigh",
  CRITICAL: "codestudioOps.development.severityCritical",
};

// Mismo criterio que BUG_CAPABLE_EMPLOYEE_SLUGS en codestudio.service.ts:
// los 3 tipos de bug son problemas de servidor/infra/datos, asi que solo
// perfiles tecnicos pueden asignarse gratis. Un Frontend/UX/Marketing no
// puede resolver un problema de login/backend.
const BUG_CAPABLE_SLUGS = new Set(["backend", "fullstack", "devops", "qa", "data-scientist"]);

export default function BugCard({ bug, employees, cash, onFix }: Props) {
  const t = useTranslation();
  const capableEmployees = employees.filter((employee) => BUG_CAPABLE_SLUGS.has(employee.employeeType.slug));
  const [employeeId, setEmployeeId] = useState(capableEmployees[0]?.id ?? "");

  return (
    <article className="cs-bug">
      <span className={bug.severity.toLowerCase()}>{t(SEVERITY_KEY[bug.severity])}</span>
      <b>{bug.title}</b>
      <p>{bug.description}</p>
      <div className="cs-bug-actions">
        <button
          type="button"
          className="cs-bug-pay"
          disabled={cash < bug.fixCost}
          onClick={() => onFix(bug.id, "cash")}
        >
          {t("codestudioOps.development.bugFixPay", { amount: format(bug.fixCost) })}
        </button>
        {capableEmployees.length > 0 ? (
          <>
            <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
              {capableEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} · {employee.employeeType.name}
                </option>
              ))}
            </select>
            <button type="button" className="cs-bug-assign" onClick={() => onFix(bug.id, "employee", employeeId)}>
              <Wrench size={13} />
              {t("codestudioOps.development.bugFixAssign")}
            </button>
          </>
        ) : (
          <span className="cs-bug-no-capable">{t("codestudioOps.development.bugNoCapableEmployee")}</span>
        )}
      </div>
    </article>
  );
}
