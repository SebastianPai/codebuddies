"use client";

import { Company, ViewKey } from "../types";

export default function TutorialPanel({ company, onNavigate }: { company: Company; onNavigate: (view: ViewKey) => void }) {
  const steps = [
    {
      label: "1. Blueprint inicial",
      done: company.modules.length >= 3,
      hint: "La app nace con sus modulos base instalados.",
      view: "apps" as ViewKey,
    },
    {
      label: "2. Primer sprint",
      done: company.development.length > 0,
      hint: "El equipo ya tiene trabajo real con progreso por ticks.",
      view: "development" as ViewKey,
    },
    {
      label: "3. Primeros usuarios",
      done: company.activeUsers > 0,
      hint: "Marketing, rating e infraestructura empujan el crecimiento.",
      view: "clients" as ViewKey,
    },
    {
      label: "4. Infra estable",
      done: company.stability >= 96 && company.latency <= 180,
      hint: "Evita saturacion antes de escalar.",
      view: "infrastructure" as ViewKey,
    },
    {
      label: "5. Roadmap publico",
      done: company.modules.length >= 6,
      hint: "Completa nuevas features hasta publicar una version fuerte.",
      view: "roadmap" as ViewKey,
    },
  ];
  const next = steps.find((step) => !step.done) ?? steps[steps.length - 1];

  return (
    <section className="cs-panel cs-span-3 cs-tutorial">
      <div className="cs-panel-header">
        <div>
          <h3>Asistente CEO</h3>
          <p>Ruta inicial para que la empresa arranque jugando, no como CRUD.</p>
        </div>
      </div>
      <div className="cs-tutorial-next">
        <span>{next.done ? "Siguiente ciclo" : "Ahora"}</span>
        <b>{next.label}</b>
        <p>{next.hint}</p>
        <button onClick={() => onNavigate(next.view)}>Ir al panel</button>
      </div>
      <div className="cs-tutorial-steps">
        {steps.map((step) => (
          <button key={step.label} className={step.done ? "done" : ""} onClick={() => onNavigate(step.view)}>
            <i />
            {step.label}
          </button>
        ))}
      </div>
    </section>
  );
}
