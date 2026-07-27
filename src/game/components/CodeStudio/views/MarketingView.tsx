"use client";

import { Catalog, Company } from "../types";
import { format } from "../utils";
import { ProgressRow } from "../widgets";

export default function MarketingView({ catalog, company }: { catalog?: Catalog; company: Company }) {
  return (
    <div className="cs-grid">
      {(catalog?.campaigns ?? []).map((campaign) => (
        <article key={campaign.id} className="cs-panel cs-span-3 cs-campaign">
          <span>{campaign.channel}</span>
          <h3>{campaign.name}</h3>
          <p>Costo base ${format(campaign.baseCost)}</p>
          <ProgressRow label="Conversion estimada" value={Math.min(100, 8 + company.rating * 12)} max={100} hint="+usuarios" />
        </article>
      ))}
    </div>
  );
}
