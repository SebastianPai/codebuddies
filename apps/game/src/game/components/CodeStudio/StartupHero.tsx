"use client";

import { Flag, TrendingUp, Users, Gem } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Catalog, CompanyView } from "./types";
import { goalProgress, money, num } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

// Portada del Panel: lo primero que se ve y lo que sale en un video. Pocos
// números, grandes y vivos (cuentan hasta su valor y saltan "+N" al crecer),
// sobre el color del tipo de app. El detalle sigue más abajo en el Panel.

const HEX_COLOR = /^#[0-9a-f]{3,8}$/i;
const FALLBACK_COLOR = "#7c5cff";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

// Anima de lo último mostrado al valor nuevo en ~0,9 s. Arranca en 0 (igual
// en servidor y cliente): al abrir el Panel los números "cuentan" hasta su
// valor.
function useCountUp(target: number) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = origin + (target - origin) * eased;
      from.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return shown;
}

// "+N" que flota cuando el valor sube respecto del anterior.
function useGainPop(value: number) {
  const previous = useRef(value);
  const [pop, setPop] = useState<{ id: number; amount: number } | null>(null);

  useEffect(() => {
    const gain = value - previous.current;
    previous.current = value;
    if (gain < 1) return;
    setPop({ id: Date.now(), amount: gain });
    const timer = setTimeout(() => setPop(null), 1600);
    return () => clearTimeout(timer);
  }, [value]);

  return pop;
}

function BigNumber({
  icon,
  label,
  value,
  format,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  format: (value: number) => string;
  tone?: "good" | "bad";
}) {
  const shown = useCountUp(value);
  const pop = useGainPop(value);

  return (
    <div className={`cs2-hero-num ${tone ? `cs2-tone-${tone}` : ""}`}>
      <span>
        {icon} {label}
      </span>
      <b>{format(shown)}</b>
      {pop && (
        <em key={pop.id} className="cs2-hero-pop">
          +{format(pop.amount)}
        </em>
      )}
    </div>
  );
}

export default function StartupHero({ company, catalog }: { company: CompanyView; catalog: Catalog }) {
  const t = useTranslation();
  const m = company.metrics;
  const color = company.appType.color && HEX_COLOR.test(company.appType.color) ? company.appType.color : FALLBACK_COLOR;
  const goals = company.stage.goals;
  const progress = goals.length ? Math.round(goals.reduce((sum, goal) => sum + goalProgress(goal), 0) / goals.length) : 100;

  return (
    <section className="cs2-hero" style={{ ["--hero" as string]: color }}>
      <div className="cs2-hero-top">
        <i className="cs2-hero-logo" aria-hidden="true">
          {company.name.trim().charAt(0).toUpperCase() || "S"}
        </i>
        <div>
          <h2>{company.name}</h2>
          <span className="cs2-hero-stage">
            <Flag size={13} /> {company.stage.name} · {company.stage.index + 1}/{catalog.stages.length}
          </span>
        </div>
      </div>

      <div className="cs2-hero-nums">
        <BigNumber icon={<Users size={14} />} label={t("codestudio.kpi.users")} value={company.activeUsers} format={(value) => num(Math.round(value))} />
        <BigNumber
          icon={<TrendingUp size={14} />}
          label={t("codestudio.kpi.profit")}
          value={m.dailyProfit}
          format={money}
          tone={m.dailyProfit >= 0 ? "good" : "bad"}
        />
        <BigNumber icon={<Gem size={14} />} label={t("codestudio.kpi.valuation")} value={company.valuation} format={money} />
      </div>

      <div className="cs2-hero-progress">
        <div className="cs2-hero-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${company.stage.next ? progress : 100}%` }} />
        </div>
        <small>
          {company.stage.next ? t("codestudio.panel.heroProgress", { value: progress, name: company.stage.next.name }) : t("codestudio.panel.heroMaxed")}
        </small>
      </div>
    </section>
  );
}
