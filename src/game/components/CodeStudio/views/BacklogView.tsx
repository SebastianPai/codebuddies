"use client";

import { BacklogPriority, Catalog } from "../types";

export default function BacklogView({
  modules,
  priority,
  setPriority,
  onDevelop,
}: {
  modules: Catalog["modules"];
  priority: Record<string, BacklogPriority>;
  setPriority: (value: Record<string, BacklogPriority>) => void;
  onDevelop: (moduleId: string) => void;
}) {
  const sorted = [...modules].slice(0, 24).sort((a, b) => {
    const weight = { Urgente: 0, Alta: 1, Media: 2, Baja: 3 };
    return (weight[priority[a.id] ?? "Media"] ?? 1) - (weight[priority[b.id] ?? "Media"] ?? 1);
  });
  return (
    <section className="cs-panel">
      <h3>Backlog priorizado</h3>
      <div className="cs-backlog">
        {sorted.map((module) => (
          <article key={module.id}>
            <div>
              <b>{module.name}</b>
              <small>{module.category} · dificultad {module.difficulty}</small>
            </div>
            <select
              value={priority[module.id] ?? "Media"}
              onChange={(event) => setPriority({ ...priority, [module.id]: event.target.value as BacklogPriority })}
            >
              <option>Urgente</option>
              <option>Alta</option>
              <option>Media</option>
              <option>Baja</option>
            </select>
            <button onClick={() => void onDevelop(module.id)}>Desarrollar</button>
          </article>
        ))}
      </div>
    </section>
  );
}
