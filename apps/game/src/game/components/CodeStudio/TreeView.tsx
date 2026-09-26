"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Hammer, Lock, Sparkles, TrendingDown, X } from "lucide-react";
import Modal from "../shared/Modal";
import type { Catalog, CatalogFeature, CompanyView } from "./types";
import { ProgressBar, Stars, duration, effectLines, money } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

type Props = {
  company: CompanyView;
  catalog: Catalog;
  busy: boolean;
  onBuild: (featureId: string) => void;
  onCancel: (taskId: string) => void;
};

const MAX_QUEUE = 6;

export default function TreeView({ company, catalog, busy, onBuild, onCancel }: Props) {
  const t = useTranslation();
  const [selected, setSelected] = useState<CatalogFeature | null>(null);
  const nodeBySlug = useMemo(() => new Map(company.tree.map((node) => [node.slug, node])), [company.tree]);
  const featureBySlug = useMemo(() => new Map(catalog.features.map((feature) => [feature.slug, feature])), [catalog.features]);
  const installedCount = company.tree.filter((node) => node.state === "installed").length;
  const m = company.metrics;

  const branches = catalog.branches.map((branch) => ({
    ...branch,
    features: catalog.features.filter((feature) => feature.branch === branch.key).sort((a, b) => a.minStage - b.minStage),
  }));

  const selectedNode = selected ? nodeBySlug.get(selected.slug) : undefined;
  const lockReason = (feature: CatalogFeature) => {
    const node = nodeBySlug.get(feature.slug);
    if (!node) return "";
    if (node.state === "locked-stage") return t("codestudio.tree.lockedStage", { stage: catalog.stages[feature.minStage]?.name ?? feature.minStage });
    if (node.state === "locked") return t("codestudio.tree.lockedRequires", { names: node.missing.map((slug) => featureBySlug.get(slug)?.name ?? slug).join(", ") });
    return "";
  };
  const estimate = (feature: CatalogFeature) => {
    const sharing = Math.min(m.maxParallel, company.development.length + 1);
    return feature.devSeconds / Math.max(0.1, m.devPower / Math.max(1, sharing));
  };
  const buildBlocked = (feature: CatalogFeature) => {
    const node = nodeBySlug.get(feature.slug);
    if (!node || node.state !== "available") return lockReason(feature) || t("codestudio.tree.notAvailable");
    if (company.development.length >= MAX_QUEUE) return t("codestudio.tree.queueFull", { max: MAX_QUEUE });
    if (company.cash < feature.cost) return t("codestudio.common.notEnoughCash", { amount: money(feature.cost) });
    return null;
  };

  return (
    <div className="cs2-stack">
      <section className="cs2-card">
        <div className="cs2-card-head">
          <div>
            <h3>{t("codestudio.tree.title")}</h3>
            <p>{t("codestudio.tree.subtitle", { installed: installedCount, total: catalog.features.length })}</p>
          </div>
          <div className="cs2-chips">
            <span className="cs2-chip">{t("codestudio.tree.devPower", { value: m.devPower.toFixed(1) })}</span>
            <span className="cs2-chip">{t("codestudio.tree.parallel", { value: m.maxParallel })}</span>
          </div>
        </div>

        {company.development.length === 0 ? (
          <p className="cs2-muted">{t("codestudio.tree.emptyQueue")}</p>
        ) : (
          <div className="cs2-queue">
            {company.development.map((task) => (
              <div key={task.id} className={`cs2-queue-item ${task.queued ? "queued" : ""}`}>
                <div>
                  <b>{task.name}</b>
                  <small>
                    {task.queued
                      ? t("codestudio.tree.waiting")
                      : t("codestudio.tree.remaining", { time: duration(task.remainingSeconds) })}
                  </small>
                </div>
                <ProgressBar value={task.progress} />
                <button
                  type="button"
                  className="cs2-icon-btn"
                  disabled={busy}
                  title={t("codestudio.tree.cancel", { amount: money(task.refund) })}
                  aria-label={t("codestudio.tree.cancel", { amount: money(task.refund) })}
                  onClick={() => onCancel(task.id)}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="cs2-tree" role="list">
        {branches.map((branch) => (
          <section key={branch.key} className="cs2-branch" role="listitem">
            <header>
              <b>{branch.name}</b>
              <small>{branch.description}</small>
            </header>
            <div className="cs2-branch-nodes">
              {branch.features.map((feature) => {
                const node = nodeBySlug.get(feature.slug);
                const state = node?.state ?? "locked";
                const task = company.development.find((entry) => entry.slug === feature.slug);
                const fit = node?.fit ?? 1;
                const crossRequires = feature.requires.filter((slug) => featureBySlug.get(slug)?.branch !== feature.branch);
                return (
                  <button key={feature.slug} type="button" className={`cs2-node ${state}`} onClick={() => setSelected(feature)}>
                    <div className="cs2-node-head">
                      {state === "installed" && <CheckCircle2 size={14} />}
                      {(state === "developing" || state === "queued") && <Hammer size={14} />}
                      {(state === "locked" || state === "locked-stage") && <Lock size={13} />}
                      <b>{feature.name}</b>
                    </div>
                    {fit >= 1.3 && (
                      <span className="cs2-fit good">
                        <Sparkles size={11} /> {t("codestudio.tree.fitGood")}
                      </span>
                    )}
                    {fit <= 0.6 && (
                      <span className="cs2-fit bad">
                        <TrendingDown size={11} /> {t("codestudio.tree.fitBad")}
                      </span>
                    )}
                    {state === "available" && <small>{money(feature.cost)} · {duration(estimate(feature))}</small>}
                    {task && <ProgressBar value={task.progress} />}
                    {(state === "locked" || state === "locked-stage") && <small className="cs2-lock">{lockReason(feature)}</small>}
                    {crossRequires.length > 0 && state !== "installed" && (
                      <small className="cs2-requires">
                        {t("codestudio.tree.needs", { names: crossRequires.map((slug) => featureBySlug.get(slug)?.name ?? slug).join(", ") })}
                      </small>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {company.legacyFeatures.length > 0 && (
        <p className="cs2-muted">{t("codestudio.tree.legacy", { count: company.legacyFeatures.length })}</p>
      )}

      {selected && selectedNode && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <div className="cs2-detail">
            <p>{selected.description}</p>
            {selectedNode.fit !== 1 && (
              <p className={`cs2-fit-line ${selectedNode.fit > 1 ? "good" : "bad"}`}>
                {selectedNode.fit > 1
                  ? t("codestudio.tree.fitExplainGood", { app: company.appType.name, value: selectedNode.fit.toFixed(1) })
                  : t("codestudio.tree.fitExplainBad", { app: company.appType.name, value: selectedNode.fit.toFixed(1) })}
              </p>
            )}
            <h4>{t("codestudio.tree.whatItDoes")}</h4>
            <ul className="cs2-effects">
              {effectLines(selected.effects, selectedNode.fit, t).map((line) => (
                <li key={line.text} className={line.good ? "good" : "bad"}>
                  {line.text}
                </li>
              ))}
            </ul>
            <div className="cs2-detail-grid">
              <div>
                <span>{t("codestudio.tree.cost")}</span>
                <b>{money(selected.cost)}</b>
              </div>
              <div>
                <span>{t("codestudio.tree.time")}</span>
                <b>
                  <Clock size={12} /> {duration(estimate(selected))}
                </b>
              </div>
              <div>
                <span>{t("codestudio.tree.difficulty")}</span>
                <Stars value={selected.difficulty} />
              </div>
              <div>
                <span>{t("codestudio.tree.xp")}</span>
                <b>+{selected.difficulty ** 2 * 4} XP</b>
              </div>
            </div>
            {selected.requires.length > 0 && (
              <p className="cs2-muted">
                {t("codestudio.tree.requiresList")}{" "}
                {selected.requires.map((slug) => `${nodeBySlug.get(slug)?.state === "installed" ? "✓" : "✗"} ${featureBySlug.get(slug)?.name ?? slug}`).join(" · ")}
              </p>
            )}
            <div className="cs2-lesson">
              <span>{t("codestudio.tree.lesson")}</span>
              <p>{selected.lesson}</p>
            </div>
            {selectedNode.state === "installed" ? (
              <p className="cs2-done">
                <CheckCircle2 size={15} /> {t("codestudio.tree.installed")}
              </p>
            ) : selectedNode.state === "developing" || selectedNode.state === "queued" ? (
              <p className="cs2-muted">{t("codestudio.tree.inProgress")}</p>
            ) : (
              <>
                {buildBlocked(selected) && <p className="cs2-warn-text">{buildBlocked(selected)}</p>}
                <button
                  type="button"
                  className="cs2-btn cs2-btn-primary cs2-btn-block"
                  disabled={busy || Boolean(buildBlocked(selected))}
                  onClick={() => {
                    onBuild(selected.id);
                    setSelected(null);
                  }}
                >
                  <Hammer size={15} /> {t("codestudio.tree.build", { amount: money(selected.cost) })}
                </button>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
