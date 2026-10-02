"use client";

import type { ReactNode } from "react";
import type { Catalog, CompanyView, FeatureEffects, Severity, StageGoal, ViewKey } from "./types";

type TFn = (key: string, params?: Record<string, string | number>) => string;

// ─── Formato ────────────────────────────────────────────────────────────

const compact = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

export function num(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  return Math.abs(safe) >= 100_000 ? compact.format(safe) : whole.format(safe);
}

export function money(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  const sign = safe < 0 ? "-" : "";
  const abs = Math.abs(safe);
  if (abs > 0 && abs < 10) return `${sign}$${abs.toFixed(2).replace(".", ",")}`;
  return `${sign}$${num(abs)}`;
}

export function pct(fraction: number, digits = 0) {
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function duration(seconds: number | null | undefined) {
  const safe = Math.max(0, Math.round(seconds ?? 0));
  if (safe < 60) return `${safe}s`;
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
}

export function goalValue(goal: Pick<StageGoal, "format">, value: number) {
  switch (goal.format) {
    case "money":
      return money(value);
    case "rating":
      return value.toFixed(1);
    case "percent":
      return `${value.toFixed(1)}%`;
    case "flag":
      return value >= 1 ? "1/1" : "0/1";
    default:
      return num(value);
  }
}

export function goalProgress(goal: StageGoal) {
  if (goal.met) return 100;
  if (goal.kind === "min") return Math.max(0, Math.min(99, (goal.target / Math.max(goal.current, 0.0001)) * 100));
  return Math.max(0, Math.min(99, (goal.current / Math.max(goal.target, 0.0001)) * 100));
}

// ─── Piezas chicas ──────────────────────────────────────────────────────

export function ProgressBar({ value, tone = "accent" }: { value: number; tone?: "accent" | "good" | "bad" | "warn" }) {
  return (
    <div className={`cs2-bar cs2-bar-${tone}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "good" | "bad" | "warn" }) {
  return (
    <div className={`cs2-stat ${tone ? `cs2-tone-${tone}` : ""}`}>
      <span>{label}</span>
      <b>{value}</b>
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function Sparkline({ values, label, tone = "accent" }: { values: number[]; label: string; tone?: "accent" | "good" | "bad" }) {
  if (values.length < 2) {
    return (
      <div className="cs2-spark cs2-spark-empty">
        <span>{label}</span>
      </div>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1e-9, max - min);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${34 - ((value - min) / range) * 30}`).join(" ");
  return (
    <div className={`cs2-spark cs2-spark-${tone}`}>
      <span>{label}</span>
      <svg viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={points} fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

export function SeverityBadge({ severity, t }: { severity: Severity; t: TFn }) {
  return <span className={`cs2-sev cs2-sev-${severity.toLowerCase()}`}>{t(`codestudio.severity.${severity}`)}</span>;
}

export function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="cs2-stars" aria-label={`${value}/${max}`}>
      {Array.from({ length: max }).map((_, index) => (
        <i key={index} className={index < value ? "on" : ""} />
      ))}
    </span>
  );
}

// ─── Efectos en lenguaje humano ─────────────────────────────────────────

const round = (value: number, digits = 0) => Number(value.toFixed(digits));

export function effectLines(effects: FeatureEffects, fit: number, t: TFn): Array<{ text: string; good: boolean }> {
  const lines: Array<{ text: string; good: boolean }> = [];
  const boost = (value: number, isBenefit: boolean) => (isBenefit ? value * fit : value);
  const push = (key: string, value: number, good: boolean, params: Record<string, string | number>) => {
    if (!value) return;
    lines.push({ text: t(`codestudio.effects.${key}`, params), good });
  };
  const e = effects;
  if (e.growth) push("growth", e.growth, true, { value: round(boost(e.growth, true), 1) });
  if (e.viral) push("viral", e.viral, true, { value: round(boost(e.viral, true) * 100, 1) });
  if (e.retention) push("retention", e.retention, true, { value: round(boost(e.retention, true) * 100) });
  if (e.arpu) push("arpu", e.arpu, true, { value: `$${boost(e.arpu, true).toFixed(3).replace(".", ",")}` });
  if (e.conversion) push("conversion", e.conversion, true, { value: round(boost(e.conversion, true) * 100) });
  if (e.satisfaction) push(e.satisfaction > 0 ? "satisfactionUp" : "satisfactionDown", e.satisfaction, e.satisfaction > 0, { value: round(Math.abs(boost(e.satisfaction, e.satisfaction > 0)), 1) });
  if (e.load) push("load", e.load, false, { value: round(e.load * 100) });
  if (e.capacity) push("capacity", e.capacity, true, { value: round(boost(e.capacity, true) * 100) });
  if (e.latency) push("latency", e.latency, e.latency < 0, { value: round(Math.abs(boost(e.latency, e.latency < 0))) });
  if (e.stability) push("stability", e.stability, true, { value: round(boost(e.stability, true), 1) });
  if (e.quality) push("quality", e.quality, true, { value: round(boost(e.quality, true) * 100) });
  if (e.security) push("security", e.security, true, { value: round(boost(e.security, true), 1) });
  if (e.cacDiscount) push("cacDiscount", e.cacDiscount, true, { value: round(boost(e.cacDiscount, true) * 100) });
  return lines;
}

// ─── "¿Qué hago ahora?" ────────────────────────────────────────────────

export type NextStep = { text: string; view: ViewKey; tone: "bad" | "warn" | "accent" | "good" };

// Una sola recomendación, la más urgente. Es lo que evita que el jugador
// se sienta perdido: siempre hay un próximo paso claro.
export function nextStep(company: CompanyView, catalog: Catalog, t: TFn): NextStep {
  const m = company.metrics;
  const installed = new Set(company.tree.filter((node) => node.state === "installed").map((node) => node.slug));
  if (company.pendingDecision) return { text: t("codestudio.next.decision", { title: company.pendingDecision.title }), view: "panel", tone: "warn" };
  if (company.daysUntilBankruptcy !== null)
    return { text: t("codestudio.next.debt", { days: company.daysUntilBankruptcy.toFixed(1) }), view: "finance", tone: "bad" };
  const waitingBug = company.bugs.find((bug) => !bug.assignedEmployeeId);
  if (waitingBug) return { text: t("codestudio.next.bug", { title: waitingBug.title }), view: "bugs", tone: "bad" };
  if (installed.has("core-feature") && company.hosting.length === 0) return { text: t("codestudio.next.server"), view: "infra", tone: "warn" };
  if (m.utilization > 0.85) return { text: t("codestudio.next.capacity", { value: Math.round(m.utilization * 100) }), view: "infra", tone: "warn" };
  if (company.stage.index >= 2 && m.arpu === 0) return { text: t("codestudio.next.monetize"), view: "tree", tone: "warn" };
  if (m.supportGap >= 1) return { text: t("codestudio.next.support", { count: Math.ceil(m.supportGap) }), view: "team", tone: "warn" };
  if (company.development.length === 0) {
    const available = company.tree.filter((node) => node.state === "available");
    const byPath = ["landing", "auth", "core-feature"].find((slug) => available.some((node) => node.slug === slug));
    const suggestion = byPath ?? available.sort((a, b) => b.fit - a.fit)[0]?.slug;
    const feature = catalog.features.find((entry) => entry.slug === suggestion);
    if (feature) return { text: t("codestudio.next.build", { name: feature.name }), view: "tree", tone: "accent" };
  }
  if (company.employees.length === 0 && company.cash > 1500) return { text: t("codestudio.next.hire"), view: "team", tone: "accent" };
  if (company.funding?.available) return { text: t("codestudio.next.funding", { name: company.funding.name }), view: "finance", tone: "good" };
  const goal = company.stage.goals.find((entry) => !entry.met);
  if (goal) return { text: t("codestudio.next.goal", { goal: goal.label, value: goalValue(goal, goal.target) }), view: "panel", tone: "accent" };
  return { text: t("codestudio.next.keepGrowing"), view: "marketing", tone: "good" };
}
