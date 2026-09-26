"use client";

import { useState } from "react";
import { UserMinus, UserPlus, Wrench } from "lucide-react";
import Modal from "../shared/Modal";
import type { Catalog, CompanyView } from "./types";
import { Stat, money, pct } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

type Props = {
  company: CompanyView;
  catalog: Catalog;
  busy: boolean;
  onHire: (roleId: string) => void;
  onFire: (employeeId: string) => void;
};

export default function TeamView({ company, catalog, busy, onHire, onFire }: Props) {
  const t = useTranslation();
  const [firing, setFiring] = useState<CompanyView["employees"][number] | null>(null);
  const m = company.metrics;
  const counts = company.employees.reduce<Record<string, number>>((acc, employee) => {
    acc[employee.roleSlug] = (acc[employee.roleSlug] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="cs2-stack">
      <section className="cs2-stats">
        <Stat label={t("codestudio.team.people")} value={company.employees.length} hint={t("codestudio.team.founderIncluded")} />
        <Stat label={t("codestudio.team.devPower")} value={m.devPower.toFixed(1)} hint={t("codestudio.team.parallel", { value: m.maxParallel })} />
        <Stat label={t("codestudio.team.salaries")} value={money(m.dailySalaries)} hint={t("codestudio.team.perDay")} tone={m.dailySalaries > m.dailyRevenue ? "warn" : undefined} />
        <Stat label={t("codestudio.team.quality")} value={pct(m.quality)} hint={t("codestudio.team.qualityHint")} />
        <Stat
          label={t("codestudio.team.support")}
          value={m.supportGap >= 1 ? t("codestudio.team.supportMissing", { count: Math.ceil(m.supportGap) }) : t("codestudio.team.supportOk")}
          tone={m.supportGap >= 1 ? "bad" : "good"}
          hint={t("codestudio.team.supportHint")}
        />
      </section>

      <section className="cs2-card">
        <h3>{t("codestudio.team.hireTitle")}</h3>
        <p className="cs2-muted">{t("codestudio.team.hireHint")}</p>
        <div className="cs2-cards">
          {catalog.roles.map((role) => (
            <article key={role.id} className="cs2-mini">
              <div className="cs2-mini-head">
                <b>{role.name}</b>
                {counts[role.slug] ? <span className="cs2-chip">×{counts[role.slug]}</span> : null}
              </div>
              <p>{role.description}</p>
              <small>
                {t("codestudio.team.salary", { amount: money(role.salary) })}
                {role.canFixBugs && (
                  <>
                    {" · "}
                    <Wrench size={11} /> {t("codestudio.team.fixesBugs")}
                  </>
                )}
              </small>
              <button type="button" className="cs2-btn" disabled={busy || company.cash < role.hireCost} onClick={() => onHire(role.id)}>
                <UserPlus size={14} /> {t("codestudio.team.hire", { amount: money(role.hireCost) })}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="cs2-card">
        <h3>{t("codestudio.team.current")}</h3>
        {company.employees.length === 0 ? (
          <p className="cs2-muted">{t("codestudio.team.none")}</p>
        ) : (
          <ul className="cs2-list">
            {company.employees.map((employee) => (
              <li key={employee.id}>
                <span className="cs2-avatar">{employee.name.slice(0, 2).toUpperCase()}</span>
                <div>
                  <b>{employee.name}</b>
                  <small>
                    {employee.roleName} · {t("codestudio.team.salary", { amount: money(employee.salary) })}
                    {employee.busy ? ` · ${t("codestudio.team.busy")}` : ""}
                  </small>
                </div>
                <button type="button" className="cs2-icon-btn" disabled={busy} onClick={() => setFiring(employee)} aria-label={t("codestudio.team.fire")} title={t("codestudio.team.fire")}>
                  <UserMinus size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {firing && (
        <Modal title={t("codestudio.team.fireTitle", { name: firing.name })} onClose={() => setFiring(null)}>
          <div className="cs2-detail">
            <p>{t("codestudio.team.fireText", { severance: money(firing.severance), salary: money(firing.salary) })}</p>
            <div className="cs2-inline">
              <button type="button" className="cs2-btn" onClick={() => setFiring(null)}>
                {t("codestudio.common.cancel")}
              </button>
              <button
                type="button"
                className="cs2-btn cs2-btn-danger"
                disabled={busy}
                onClick={() => {
                  onFire(firing.id);
                  setFiring(null);
                }}
              >
                {t("codestudio.team.fireConfirm")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
