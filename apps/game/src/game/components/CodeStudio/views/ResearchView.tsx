"use client";

import { Catalog } from "../types";
import { format, secondsLabel } from "../utils";
import { makeTrends } from "../mockData";
import { ProgressRow } from "../widgets";

export default function ResearchView({ catalog, trends }: { catalog?: Catalog; trends: ReturnType<typeof makeTrends> }) {
  return (
    <div className="cs-grid">
      <section className="cs-panel cs-span-5">
        <h3>Tendencias del mercado</h3>
        {trends.map((trend) => <ProgressRow key={trend.label} label={trend.label} value={trend.score} max={100} hint={trend.type} />)}
      </section>
      <section className="cs-panel cs-span-7">
        <h3>Investigaciones disponibles</h3>
        <div className="cs-research-list">
          {(catalog?.research ?? []).map((item) => (
            <article key={item.id}>
              <b>{item.name}</b>
              <small>${format(item.cost)} · {secondsLabel(item.durationSeconds)}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
