"use client";

import { Company } from "../types";
import { format } from "../utils";
import { getEmployeeAssignment } from "../mockData";
import { ProgressBar, ProgressRow } from "../widgets";

export default function EmployeesLiveView({ company }: { company: Company }) {
  return (
    <div className="cs-people-grid">
      {company.employees.map((employee, index) => {
        const assignment = getEmployeeAssignment(company, index);
        return (
          <article key={employee.name} className="cs-person-card">
            <div className="cs-person-head">
              <div className="cs-avatar">{employee.name.slice(0, 2).toUpperCase()}</div>
              <span className={assignment.status === "Disponible" ? "idle" : "busy"}>{assignment.status}</span>
            </div>
            <h3>{employee.name}</h3>
            <p>{employee.employeeType.name} · Nivel {employee.level}</p>
            <div className="cs-current-task">
              <small>Trabajo actual</small>
              <b>{assignment.task}</b>
              <ProgressBar value={assignment.progress} />
              <em>{assignment.remaining}</em>
            </div>
            <ProgressRow label="Motivacion" value={employee.motivation ?? 80} max={100} hint={`$${format(employee.salary ?? 0)} salario`} />
            <ProgressRow label="Estres" value={employee.stress ?? 5} max={100} hint="rendimiento" />
            <span>{employee.productivity?.toFixed?.(1) ?? "1.0"}x productividad</span>
          </article>
        );
      })}
    </div>
  );
}
