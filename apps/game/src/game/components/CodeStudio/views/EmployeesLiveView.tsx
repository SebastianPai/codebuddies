"use client";

import { Company, Catalog, GuideKey, ViewKey } from "../types";
import { format } from "../utils";
import { getEmployeeAssignment } from "../mockData";
import { ProgressBar, ProgressRow } from "../widgets";
import { useNewestItemHighlight } from "../useNewestItemHighlight";
import NextStepCallout from "../NextStepCallout";
import TeamSpeedSummary, { employeeSpeedContribution } from "../TeamSpeedSummary";
import { useTranslation } from "../../../../i18n/useTranslation";

type Props = {
  company: Company;
  catalog?: Catalog;
  onHire?: (employeeTypeId: string) => void;
  onNavigate?: (view: ViewKey, guideKey?: GuideKey) => void;
};

export default function EmployeesLiveView({ company, catalog, onHire, onNavigate }: Props) {
  const t = useTranslation();
  const { highlightIndex, registerRef } = useNewestItemHighlight(company.employees.length);
  return (
    <div className="cs-employees-view">
      {onHire && catalog?.employees && catalog.employees.length > 0 && (
        <section className="cs-hire-section">
          <h3>{t("codestudioOps.employees.hireTitle")}</h3>
          <p className="cs-hire-hint">{t("codestudioOps.employees.hireHint")}</p>
          <div className="cs-hire-grid">
            {catalog.employees.map((type) => (
              <article key={type.id} className="cs-hire-card">
                <b>{type.name}</b>
                <span>{type.category}</span>
                <strong>{t("codestudioOps.employees.hireCost", { amount: format(type.salary) })}</strong>
                <button onClick={() => onHire(type.id)} disabled={company.cash < type.salary}>
                  {t("codestudioOps.employees.hireButton")}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {company.employees.length === 0 && (
        <p className="cs-empty-hint">{t("codestudioOps.employees.noneYet")}</p>
      )}

      {company.employees.length > 0 && <TeamSpeedSummary company={company} />}

      {onNavigate && company.employees.length > 0 && <NextStepCallout company={company} onNavigate={onNavigate} />}

      <div className="cs-people-grid">
      {company.employees.map((employee, index) => {
        const assignment = getEmployeeAssignment(company, index);
        return (
          <article
            key={employee.id}
            ref={registerRef(index)}
            className={`cs-person-card ${highlightIndex === index ? "cs-highlight-new" : ""}`}
          >
            <div className="cs-person-head">
              <div className="cs-avatar">{employee.name.slice(0, 2).toUpperCase()}</div>
              <span className={assignment.status === "Disponible" ? "idle" : "busy"}>{assignment.status}</span>
            </div>
            <h3>{employee.name}</h3>
            <p>{employee.employeeType.name} · {t("codestudioOps.employees.level", { level: employee.level })}</p>
            <div className="cs-current-task">
              <small>{t("codestudioOps.employees.currentTaskLabel")}</small>
              <b>{assignment.task}</b>
              <ProgressBar value={assignment.progress} />
              <em>{assignment.remaining}</em>
            </div>
            <ProgressRow
              label={t("codestudioOps.employees.motivationLabel")}
              value={employee.motivation ?? 80}
              max={100}
              hint={t("codestudioOps.employees.salaryHint", { amount: `$${format(employee.salary ?? 0)}` })}
            />
            <ProgressRow label={t("codestudioOps.employees.stressLabel")} value={employee.stress ?? 5} max={100} hint={t("codestudioOps.employees.performanceHint")} />
            <span>{t("codestudioOps.employees.speedContribution", { value: employeeSpeedContribution(employee).toFixed(2) })}</span>
          </article>
        );
      })}
      </div>
    </div>
  );
}
