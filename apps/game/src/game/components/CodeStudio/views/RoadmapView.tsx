"use client";

import { ReactNode } from "react";
import { Catalog, Company } from "../types";
import { ProgressBar } from "../widgets";

export default function RoadmapView({
  company,
  availableModules,
  onDevelop,
}: {
  company: Company;
  availableModules: Catalog["modules"];
  onDevelop: (moduleId: string) => void;
}) {
  const pending = availableModules.slice(0, 7);
  const development = company.development.filter((task) => ["QUEUED", "IN_PROGRESS"].includes(task.status) && task.progress < 70);
  const qa = company.development.filter((task) => ["QUEUED", "IN_PROGRESS"].includes(task.status) && task.progress >= 70);
  const release = company.development.filter((task) => task.status === "COMPLETED").slice(0, 6);
  const production = company.modules.slice(-7).reverse();
  return (
    <div className="cs-roadmap">
      <RoadmapColumn title="Pendiente" tone="pending">
        {pending.map((module) => (
          <button key={module.id} className="cs-roadmap-card" onClick={() => void onDevelop(module.id)}>
            <b>{module.name}</b>
            <small>{module.category} · ${module.cost}</small>
          </button>
        ))}
      </RoadmapColumn>
      <RoadmapColumn title="Desarrollo" tone="active">
        {development.map((task) => (
          <article key={task.id} className="cs-roadmap-card">
            <b>{task.module.name}</b>
            <ProgressBar value={task.progress} />
          </article>
        ))}
      </RoadmapColumn>
      <RoadmapColumn title="QA" tone="qa">
        {qa.map((task) => (
          <article key={task.id} className="cs-roadmap-card">
            <b>{task.module.name}</b>
            <small>Validando bugs, rendimiento y UX</small>
            <ProgressBar value={task.progress} />
          </article>
        ))}
      </RoadmapColumn>
      <RoadmapColumn title="Release" tone="release">
        {release.map((task) => (
          <article key={task.id} className="cs-roadmap-card done">
            <b>{task.module.name}</b>
            <small>Listo para publicar</small>
          </article>
        ))}
      </RoadmapColumn>
      <RoadmapColumn title="Produccion" tone="done">
        {production.map((entry) => (
          <article key={entry.module.id} className="cs-roadmap-card done">
            <b>{entry.module.name}</b>
            <small>{entry.module.category}</small>
          </article>
        ))}
      </RoadmapColumn>
    </div>
  );
}

function RoadmapColumn({ title, tone, children }: { title: string; tone: string; children: ReactNode }) {
  return (
    <section className={`cs-roadmap-column ${tone}`}>
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}
