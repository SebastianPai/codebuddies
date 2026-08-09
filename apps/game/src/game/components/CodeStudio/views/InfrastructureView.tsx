"use client";

import { Company } from "../types";
import { format } from "../utils";
import { makeInfrastructureIndicators } from "../mockData";
import { ProgressBar, ProgressRow } from "../widgets";

export default function InfrastructureView({ company }: { company: Company }) {
  const users = Math.max(1, company.activeUsers);
  const indicators = makeInfrastructureIndicators(company);
  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-12">
        <div className="cs-panel-header">
          <div>
            <h3>Centro de infraestructura</h3>
            <p>Indicadores vivos derivados de usuarios, latencia, estabilidad y capacidad.</p>
          </div>
          <strong>{company.latency.toFixed(0)}ms</strong>
        </div>
        <div className="cs-infra-indicators">
          {indicators.map((indicator) => (
            <article key={indicator.label}>
              <span>{indicator.icon}</span>
              <b>{indicator.label}</b>
              <ProgressBar value={indicator.value} />
              <small>{indicator.hint}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="cs-panel cs-span-12">
        <h3>Nodos instalados</h3>
        <div className="cs-infra-map">
          {company.infrastructure.map((item) => {
            const usage = Math.min(100, (users / Math.max(1, item.capacity ?? 1000)) * 100);
            return (
              <article key={item.infrastructureType.name} className="cs-infra-node">
                <div />
                <h3>{item.infrastructureType.name}</h3>
                <p>Nivel {item.level}</p>
                <ProgressRow label="Uso" value={usage} max={100} hint={`${format(item.capacity ?? 1000)} cap.`} />
                <ProgressRow label="Estado" value={item.stability ?? company.stability} max={100} hint={`${item.latency ?? company.latency}ms`} />
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
