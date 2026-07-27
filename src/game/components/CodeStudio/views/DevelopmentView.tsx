"use client";

import { Company } from "../types";
import { secondsLabel } from "../utils";
import { makeBugs } from "../mockData";
import { ProgressBar } from "../widgets";

export default function DevelopmentView({ company }: { company: Company }) {
  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-8">
        <h3>Sprint activo</h3>
        <div className="cs-dev-list">
          {company.development.length === 0 && <p className="cs-muted">No hay tareas activas. Abre Roadmap o Backlog para iniciar una feature.</p>}
          {company.development.map((task, index) => {
            const remaining = Math.max(0, (task.requiredSeconds ?? 0) - (task.spentSeconds ?? 0));
            const employee = company.employees[index % Math.max(1, company.employees.length)];
            return (
              <article key={task.id} className="cs-dev-card">
                <div>
                  <b>{task.module.name}</b>
                  <span>{task.status}</span>
                </div>
                <ProgressBar value={task.progress} />
                <footer>
                  <small>Tiempo restante: {secondsLabel(remaining)}</small>
                  <small>Trabaja: {employee?.name ?? "Equipo core"}</small>
                  <small>Beneficio: +{Number(task.module.effects?.growth ?? 0.02).toFixed(2)} growth</small>
                </footer>
              </article>
            );
          })}
        </div>
      </section>
      <section className="cs-panel cs-span-4">
        <h3>Bugs activos</h3>
        {makeBugs(company).map((bug) => (
          <article key={bug.title} className="cs-bug">
            <span className={bug.severity}>{bug.severity}</span>
            <b>{bug.title}</b>
            <p>{bug.impact}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
