"use client";

import { useState } from "react";
import { ArrowRightLeft, ArrowUpCircle, Lock, Server } from "lucide-react";
import type { Catalog, CompanyView } from "./types";
import { ProgressBar, Stat, money, num } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

type Props = {
  company: CompanyView;
  catalog: Catalog;
  busy: boolean;
  onInstall: (typeId: string, provider?: string) => void;
};

export default function InfraView({ company, catalog, busy, onInstall }: Props) {
  const t = useTranslation();
  // Proveedor elegido en cada tipo de servidor (por defecto, el que ya tiene o el estándar).
  const [picked, setPicked] = useState<Record<string, string>>({});
  const providers = company.providers ?? [];
  const m = company.metrics;
  const usage = Math.round(m.utilization * 100);
  const tone = m.utilization > 1 ? "bad" : m.utilization > 0.8 ? "warn" : "good";

  return (
    <div className="cs2-stack">
      <section className="cs2-card">
        <h3>{t("codestudio.infra.title")}</h3>
        <p className="cs2-muted">{t("codestudio.infra.subtitle")}</p>
        <div className="cs2-gauge">
          <div>
            <span>{t("codestudio.infra.load", { load: num(m.load), capacity: num(m.capacity) })}</span>
            <b className={`cs2-tone-${tone}`}>{usage}%</b>
          </div>
          <ProgressBar value={Math.min(100, usage)} tone={tone} />
          <small>{m.utilization > 1 ? t("codestudio.infra.overloaded") : m.utilization > 0.8 ? t("codestudio.infra.almostFull") : t("codestudio.infra.healthy")}</small>
        </div>
      </section>

      <section className="cs2-stats">
        <Stat label={t("codestudio.infra.latency")} value={`${Math.round(company.latency)} ms`} tone={company.latency > 250 ? "bad" : company.latency < 150 ? "good" : "warn"} hint={t("codestudio.infra.latencyHint")} />
        <Stat label={t("codestudio.infra.stability")} value={`${company.stability.toFixed(1)}%`} tone={company.stability < 90 ? "bad" : company.stability > 97 ? "good" : undefined} hint={t("codestudio.infra.stabilityHint")} />
        <Stat label={t("codestudio.infra.monthly")} value={money(m.dailyInfra * 30)} hint={t("codestudio.infra.perDay", { amount: money(m.dailyInfra) })} />
        <Stat label={t("codestudio.infra.techDebt")} value={Math.round(company.techDebt)} tone={company.techDebt > 35 ? "bad" : undefined} hint={t("codestudio.infra.techDebtHint")} />
      </section>

      <section className="cs2-card">
        <h3>{t("codestudio.infra.servers")}</h3>
        <div className="cs2-cards">
          {catalog.hosting.map((type) => {
            const owned = company.hosting.find((item) => item.typeId === type.id);
            const locked = type.minStage > company.stage.index;
            const currentProvider = owned?.provider ?? "standard";
            const choice = picked[type.id] ?? currentProvider;
            const provider = providers.find((entry) => entry.key === choice);
            const migrating = Boolean(owned && choice !== currentProvider);
            const nextLevel = migrating ? owned!.level : (owned?.level ?? 0) + 1;
            const cost = Math.round(type.install * nextLevel * (provider?.install ?? 1));
            const maxed = owned ? owned.level >= owned.maxLevel && !migrating : false;
            return (
              <article key={type.id} className={`cs2-mini ${locked ? "locked" : ""}`}>
                <div className="cs2-mini-head">
                  <b>
                    <Server size={13} /> {type.name}
                  </b>
                  {owned && <span className="cs2-chip">{t("codestudio.infra.level", { level: owned.level, max: owned.maxLevel })}</span>}
                </div>
                <p>{type.description}</p>
                {!locked && providers.length > 0 && (
                  <div className="cs2-providers" role="radiogroup" aria-label={t("codestudio.infra.provider")}>
                    {providers.map((entry) => (
                      <button
                        key={entry.key}
                        type="button"
                        role="radio"
                        aria-checked={choice === entry.key}
                        className={`cs2-provider cs2-provider-${entry.key} ${choice === entry.key ? "on" : ""}`}
                        onClick={() => setPicked((current) => ({ ...current, [type.id]: entry.key }))}
                      >
                        <b>
                          {entry.name}
                          {owned && currentProvider === entry.key && <span className="cs2-chip">{t("codestudio.infra.current")}</span>}
                        </b>
                        <small>
                          {money(type.monthly * entry.monthly)}/{t("codestudio.infra.month")} · {num(type.capacity * entry.capacity)} {t("codestudio.infra.usersShort")}
                        </small>
                        <small>
                          {Math.round(type.latency + entry.latency)} ms · {Math.min(99.99, type.stability + entry.stability).toFixed(1)}%
                        </small>
                      </button>
                    ))}
                  </div>
                )}
                {provider && !locked && <p className="cs2-muted cs2-provider-pitch">{provider.pitch}</p>}
                <small>
                  {t("codestudio.infra.perLevel", { capacity: num(type.capacity * (provider?.capacity ?? 1)), monthly: money(type.monthly * (provider?.monthly ?? 1)) })}
                </small>
                {locked ? (
                  <small className="cs2-lock">
                    <Lock size={11} /> {t("codestudio.tree.lockedStage", { stage: catalog.stages[type.minStage]?.name ?? type.minStage })}
                  </small>
                ) : maxed ? (
                  <small className="cs2-muted">{t("codestudio.infra.maxed")}</small>
                ) : (
                  <button type="button" className="cs2-btn" disabled={busy || company.cash < cost} onClick={() => onInstall(type.id, choice)}>
                    {migrating ? <ArrowRightLeft size={14} /> : <ArrowUpCircle size={14} />}{" "}
                    {migrating
                      ? t("codestudio.infra.migrate", { name: provider?.name ?? choice, amount: money(cost) })
                      : owned
                        ? t("codestudio.infra.upgrade", { amount: money(cost) })
                        : t("codestudio.infra.install", { amount: money(cost) })}
                  </button>
                )}
              </article>
            );
          })}
        </div>
        {company.hosting.some((item) => item.legacy) && <p className="cs2-muted">{t("codestudio.infra.legacy")}</p>}
      </section>
    </div>
  );
}
