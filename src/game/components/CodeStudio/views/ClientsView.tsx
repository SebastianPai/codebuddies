"use client";

import { makeBugs, makeClients } from "../mockData";
import { ProgressRow } from "../widgets";

export default function ClientsView({ clients, bugs }: { clients: ReturnType<typeof makeClients>; bugs: ReturnType<typeof makeBugs> }) {
  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-8">
        <h3>Clientes procedurales</h3>
        <div className="cs-client-grid">
          {clients.map((client) => (
            <article key={client.name}>
              <span>{client.type}</span>
              <b>{client.name}</b>
              <p>&ldquo;{client.comment}&rdquo;</p>
              <ProgressRow label="Satisfaccion" value={client.satisfaction} max={100} hint={`${client.rating.toFixed(1)} estrellas`} />
            </article>
          ))}
        </div>
      </section>
      <section className="cs-panel cs-span-4">
        <h3>Problemas reportados</h3>
        {bugs.map((bug) => (
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
