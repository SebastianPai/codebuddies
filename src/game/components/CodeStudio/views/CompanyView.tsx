"use client";

import { Company } from "../types";
import { makeVersions } from "../mockData";
import { Kpis } from "../widgets";

export default function CompanyView({ company }: { company: Company }) {
  const versions = makeVersions(company);
  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-7">
        <h3>Perfil de empresa</h3>
        <div className="cs-company-card">
          <div className="cs-logo" style={{ background: company.appType.color || "#22d3ee" }}>
            {company.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2>{company.name}</h2>
            <p>{company.appType.name} · {company.status}</p>
            <p>Reputacion {company.reputation?.toFixed?.(1) ?? "5.0"} · Innovacion {(company as any).innovation?.toFixed?.(1) ?? "1.0"}</p>
          </div>
        </div>
        <Kpis company={company} />
      </section>
      <section className="cs-panel cs-span-5">
        <h3>Version actual</h3>
        {versions.map((version) => (
          <article key={version.version} className="cs-version">
            <b>{version.version}</b>
            <small>{version.date}</small>
            <ul>
              {version.notes.map((note) => <li key={note}>{note}</li>)}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}
