"use client";

import { Company, ViewKey } from "./types";
import { format, percent } from "./utils";
import { makeNotifications } from "./mockData";

export function Kpis({ company }: { company: Company }) {
  const kpis = [
    ["Empresa", `$${format(company.valuation)}`, "Valor"],
    ["Usuarios", format(company.activeUsers), `${format(company.totalUsers)} total`],
    ["Ingresos", `$${format(company.revenue)}`, `Gastos $${format(company.expenses)}`],
    ["Rating", company.rating.toFixed(1), `${percent(company.satisfaction)} satisfaccion`],
    ["Empleados", String(company.employees.length), "equipo activo"],
    ["Infra", `${percent(company.stability)}`, `${company.latency.toFixed(0)}ms`],
  ];
  return (
    <div className="cs-kpis">
      {kpis.map(([label, value, hint]) => (
        <div key={label}>
          <span>{label}</span>
          <b>{value}</b>
          <small>{hint}</small>
        </div>
      ))}
    </div>
  );
}

export function ActivityTimeline({ notifications }: { notifications: ReturnType<typeof makeNotifications> }) {
  const now = Date.now();
  return (
    <div className="cs-timeline">
      <div className="cs-panel-header">
        <div>
          <h3>Actividad en vivo</h3>
          <p>Eventos recientes generados por ticks, usuarios e infraestructura.</p>
        </div>
      </div>
      {notifications.map((item, index) => (
        <article key={`${item.title}-${index}`} className={`cs-timeline-item ${item.tone}`}>
          <time>{new Date(now - index * 120000).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</time>
          <span />
          <div>
            <b>{item.title}</b>
            <p>{item.message}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ActionBriefing({
  company,
  notifications,
  onNavigate,
}: {
  company: Company;
  notifications: ReturnType<typeof makeNotifications>;
  onNavigate: (view: ViewKey) => void;
}) {
  const overloaded = company.latency > 180 || company.stability < 95;
  const hasActiveSprint = company.development.some((task) => ["QUEUED", "IN_PROGRESS"].includes(task.status));
  const nextView: ViewKey = overloaded ? "infrastructure" : hasActiveSprint ? "development" : "roadmap";
  const nextLabel = overloaded ? "Escalar infraestructura" : hasActiveSprint ? "Revisar sprint activo" : "Planear siguiente feature";
  const failed = company.bugs > 20 ? `${company.bugs.toFixed(0)} bugs estan afectando el rating.` : "No hay incidentes criticos.";
  const completed = company.modules.length > 0 ? `${company.modules.at(-1)?.module.name} esta en produccion.` : "Aun no hay releases.";

  return (
    <div className="cs-briefing">
      <h3>Briefing CEO</h3>
      <article>
        <span>Que esta pasando</span>
        <b>{notifications[0]?.title ?? "La empresa esta arrancando"}</b>
      </article>
      <article>
        <span>Que hago ahora</span>
        <button onClick={() => onNavigate(nextView)}>{nextLabel}</button>
      </article>
      <article>
        <span>Que termino</span>
        <p>{completed}</p>
      </article>
      <article>
        <span>Que fallo</span>
        <p>{failed}</p>
      </article>
    </div>
  );
}

export function MiniChart({ snapshots, metric, label }: { snapshots: Company["snapshots"]; metric: keyof Company["snapshots"][number]; label: string }) {
  const data = [...snapshots].reverse().slice(-18);
  const values = data.map((snapshot) => Number(snapshot[metric] ?? 0));
  const max = Math.max(1, ...values);
  return (
    <div className="cs-chart">
      <h3>{label}</h3>
      <div>
        {values.length === 0 ? (
          <span className="cs-muted">Sin historico todavia</span>
        ) : (
          values.map((value, index) => (
            <i key={`${metric}-${index}`} style={{ height: `${Math.max(8, (value / max) * 100)}%` }} />
          ))
        )}
      </div>
    </div>
  );
}

export function ProgressRow({ label, value, max, hint }: { label: string; value: number; max: number; hint?: string }) {
  const width = Math.min(100, (value / Math.max(1, max)) * 100);
  return (
    <div className="cs-progress-row">
      <div>
        <span>{label}</span>
        <small>{hint}</small>
      </div>
      <ProgressBar value={width} />
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="cs-progress">
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
