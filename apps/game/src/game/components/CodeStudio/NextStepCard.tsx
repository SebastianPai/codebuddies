"use client";

import { ArrowRight, Clock, Hammer, Wallet, Zap } from "lucide-react";
import type { CompanyView } from "./types";
import { buildEstimate, duration, money, type NextStep } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

// Lo primero que se ve en el Panel: UNA acción clara (la más urgente, ver
// nextStep en ui.tsx) con su porqué. Si la acción es construir una función
// del árbol, se construye desde acá mismo con su costo y su tiempo a la
// vista; si no, el botón lleva a la pantalla donde se resuelve.

const MAX_QUEUE = 6;

type Props = {
  company: CompanyView;
  step: NextStep;
  busy: boolean;
  onBuild: (featureId: string) => void;
  onGo: () => void;
};

export default function NextStepCard({ company, step, busy, onBuild, onGo }: Props) {
  const t = useTranslation();
  const feature = step.feature;
  const node = feature ? company.tree.find((entry) => entry.slug === feature.slug) : undefined;
  const canBuildHere = !!feature && node?.state === "available";
  const blocked = !canBuildHere
    ? ""
    : company.development.length >= MAX_QUEUE
      ? t("codestudio.tree.queueFull", { max: MAX_QUEUE })
      : company.cash < feature.cost
        ? t("codestudio.common.notEnoughCash", { amount: money(feature.cost) })
        : "";

  return (
    <section className={`cs2-nextcard cs2-nextcard-${step.tone}`} aria-live="polite">
      <span className="cs2-nextcard-eyebrow">{t("codestudio.panel.nextEyebrow")}</span>
      <h2 className="cs2-nextcard-title">{step.text}</h2>

      {/* El porqué: la descripción de la función si se construye, si no la
          explicación del tipo de paso. */}
      <p className="cs2-nextcard-why">
        {canBuildHere && feature?.description ? feature.description : t(`codestudio.next.why.${step.key}`)}
      </p>

      {canBuildHere && feature && (
        <>
          <div className="cs2-nextcard-chips">
            <span>
              <Wallet size={15} aria-hidden="true" /> {money(feature.cost)}
            </span>
            <span>
              <Clock size={15} aria-hidden="true" /> {t("codestudio.panel.nextTime", { time: duration(buildEstimate(company, feature)) })}
            </span>
            {feature.xp > 0 && (
              <span className="cs2-xp-chip">
                <Zap size={15} aria-hidden="true" /> +{feature.xp} XP
              </span>
            )}
          </div>
        </>
      )}

      <div className="cs2-nextcard-actions">
        {canBuildHere && feature ? (
          <button type="button" className="cs2-nextcard-btn" disabled={busy || !!blocked} onClick={() => onBuild(feature.id)}>
            <Hammer size={17} aria-hidden="true" />
            {t("codestudio.panel.nextBuild", { amount: money(feature.cost) })}
          </button>
        ) : (
          <button type="button" className="cs2-nextcard-btn" onClick={onGo}>
            {t("codestudio.panel.nextGo")} <ArrowRight size={17} aria-hidden="true" />
          </button>
        )}
        {canBuildHere && (
          <button type="button" className="cs2-nextcard-link" onClick={onGo}>
            {t("codestudio.panel.nextSeeTree")}
          </button>
        )}
      </div>
      {blocked && <p className="cs2-nextcard-blocked">{blocked}</p>}
    </section>
  );
}
