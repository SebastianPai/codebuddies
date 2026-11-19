"use client";

import { ArrowRight, CheckCircle2, Clock, Lock, Sparkles, TrendingDown, Wallet, Zap, type LucideIcon } from "lucide-react";
import type { Catalog, CatalogFeature, CompanyView } from "./types";
import { duration, money } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

// Vista simple del Árbol: primero lo que se puede construir YA, después lo
// construido y por último lo que viene (con el motivo). Las 41 funciones por
// rama siguen en "Árbol completo". Tocar una tarjeta abre el mismo detalle
// de siempre (lección, efectos, costo y botón de construir).

const PATH = ["landing", "auth", "core-feature"];
const LATER_MAX = 5;

type Look = { icon: LucideIcon; color: string };

type Props = {
  company: CompanyView;
  catalog: Catalog;
  look: (branch: string) => Look;
  estimate: (feature: CatalogFeature) => number;
  lockReason: (feature: CatalogFeature) => string;
  onOpen: (feature: CatalogFeature) => void;
  onShowAll: () => void;
};

export default function TreeSimple({ company, catalog, look, estimate, lockReason, onOpen, onShowAll }: Props) {
  const t = useTranslation();
  const nodeBySlug = new Map(company.tree.map((node) => [node.slug, node]));
  const branchName = new Map(catalog.branches.map((branch) => [branch.key, branch.name]));
  const stateOf = (feature: CatalogFeature) => nodeBySlug.get(feature.slug)?.state ?? "locked";
  const fitOf = (feature: CatalogFeature) => nodeBySlug.get(feature.slug)?.fit ?? 1;

  // Disponibles: primero el camino del MVP, después lo que mejor le queda a
  // este tipo de app y lo más barato.
  const available = catalog.features
    .filter((feature) => stateOf(feature) === "available")
    .sort((a, b) => {
      const pa = PATH.indexOf(a.slug), pb = PATH.indexOf(b.slug);
      if (pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
      return fitOf(b) - fitOf(a) || a.cost - b.cost;
    });
  const built = catalog.features.filter((feature) => stateOf(feature) === "installed");
  // Lo que viene: lo más cercano primero (le falta una sola cosa o es de la
  // etapa que sigue).
  const later = catalog.features
    .filter((feature) => {
      const state = stateOf(feature);
      return state === "locked" || state === "locked-stage";
    })
    .map((feature) => {
      const node = nodeBySlug.get(feature.slug);
      const distance = node?.state === "locked" ? (node.missing.length || 1) : 1 + Math.max(0, feature.minStage - company.stage.index);
      return { feature, distance };
    })
    .sort((a, b) => a.distance - b.distance || a.feature.minStage - b.feature.minStage || a.feature.cost - b.feature.cost)
    .slice(0, LATER_MAX);

  return (
    <div className="cs2-stack cs2-tree-simple">
      <section>
        <h4 className="cs2-ts-title">{t("codestudio.tree.nowTitle")}</h4>
        {available.length === 0 ? (
          <p className="cs2-muted">{t("codestudio.tree.nowEmpty")}</p>
        ) : (
          <div className="cs2-ts-now">
            {available.map((feature) => {
              const branch = look(feature.branch);
              const fit = fitOf(feature);
              return (
                <button key={feature.slug} type="button" className="cs2-ts-card" style={{ ["--branch" as string]: branch.color }} onClick={() => onOpen(feature)}>
                  <i className="cs2-ts-icon" aria-hidden="true">
                    <branch.icon size={20} />
                  </i>
                  <span className="cs2-ts-body">
                    <span className="cs2-ts-branch">{branchName.get(feature.branch) ?? feature.branch}</span>
                    <b>{feature.name}</b>
                    {feature.description && <span className="cs2-ts-desc">{feature.description}</span>}
                    <span className="cs2-ts-meta">
                      <span>
                        <Wallet size={13} aria-hidden="true" /> {money(feature.cost)}
                      </span>
                      <span>
                        <Clock size={13} aria-hidden="true" /> {duration(estimate(feature))}
                      </span>
                      {feature.xp > 0 && (
                        <span className="cs2-xp-chip">
                          <Zap size={13} aria-hidden="true" /> +{feature.xp} XP
                        </span>
                      )}
                      {fit >= 1.3 && (
                        <span className="cs2-fit good">
                          <Sparkles size={11} aria-hidden="true" /> {t("codestudio.tree.fitGood")}
                        </span>
                      )}
                      {fit <= 0.6 && (
                        <span className="cs2-fit bad">
                          <TrendingDown size={11} aria-hidden="true" /> {t("codestudio.tree.fitBad")}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="cs2-ts-go">
                    {t("codestudio.tree.open")} <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {built.length > 0 && (
        <section>
          <h4 className="cs2-ts-title">{t("codestudio.tree.builtTitle", { count: built.length })}</h4>
          <div className="cs2-ts-built">
            {built.map((feature) => {
              const level = nodeBySlug.get(feature.slug)?.level ?? 1;
              return (
                <button key={feature.slug} type="button" onClick={() => onOpen(feature)}>
                  <CheckCircle2 size={14} aria-hidden="true" /> {feature.name}
                  {level > 1 && <small>v{level}</small>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {later.length > 0 && (
        <section>
          <h4 className="cs2-ts-title">{t("codestudio.tree.laterTitle")}</h4>
          <ul className="cs2-ts-later">
            {later.map(({ feature }) => (
              <li key={feature.slug}>
                <button type="button" onClick={() => onOpen(feature)}>
                  <Lock size={13} aria-hidden="true" />
                  <b>{feature.name}</b>
                  <span>{lockReason(feature)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button type="button" className="cs2-ts-all" onClick={onShowAll}>
        {t("codestudio.tree.seeAll", { count: catalog.features.length })} <ArrowRight size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
