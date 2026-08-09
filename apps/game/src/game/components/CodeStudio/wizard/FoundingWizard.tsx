"use client";

import { useState, type CSSProperties } from "react";
import { Bike, Bot, Cloud, Network, Play, Rocket, ShoppingCart } from "lucide-react";
import { Catalog } from "../types";
import { useTranslation } from "../../../../i18n/useTranslation";
import WizardProgress from "./WizardProgress";
import WizardStepList from "./WizardStepList";
import CenteredJoyrideOverlay from "./CenteredJoyrideOverlay";
import "./FoundingWizard.css";

// slug -> ícono de lucide para las tarjetas de tipo de app (mismos strings
// que apps/api/prisma/seed-codestudio.ts).
const APP_TYPE_ICONS: Record<string, typeof Rocket> = {
  network: Network,
  cart: ShoppingCart,
  bike: Bike,
  play: Play,
  cloud: Cloud,
  bot: Bot,
};

type Props = {
  appTypes: Catalog["appTypes"];
  // Reusa la MISMA llamada de red / recarga / selección que ya existía en
  // CodeStudio.tsx — el wizard solo decide cuándo se llama (al confirmar el
  // último paso) y con qué datos, no reemplaza esa lógica.
  onFound: (appTypeId: string, name: string) => Promise<void>;
  onCancel: () => void;
};

const TOTAL_STEPS = 3;

// Un solo objetivo por pantalla: el jugador nunca ve más de un paso a la
// vez. Cada paso valida antes de dejar avanzar (nombre vacío, ningún tipo
// elegido) — no hay botón "Siguiente" de Joyride, avanzamos nosotros mismos
// vía stepIndex controlado para poder gatear el avance con nuestra propia
// validación.
export default function FoundingWizard({ appTypes, onFound, onCancel }: Props) {
  const t = useTranslation();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [appTypeId, setAppTypeId] = useState("");
  const [nameError, setNameError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const stepLabels = [
    t("codestudioGeneral.wizard.stepNameLabel"),
    t("codestudioGeneral.wizard.stepTypeLabel"),
    t("codestudioGeneral.wizard.stepConfirmLabel"),
  ];

  const goBack = () => {
    if (step > 0 && !submitting) setStep(step - 1);
  };

  const confirmName = () => {
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setNameError(t("codestudioGeneral.wizard.nameTooShort"));
      return;
    }
    setNameError("");
    setStep(1);
  };

  const confirmType = () => {
    if (!appTypeId) return;
    setStep(2);
  };

  const handleFound = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      await onFound(appTypeId, name.trim());
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("codestudioGeneral.errors.createCompanyFailed"));
      setSubmitting(false);
    }
  };

  const selectedType = appTypes.find((type) => type.id === appTypeId);

  let stepBody: React.ReactNode;

  if (step === 0) {
    stepBody = (
      <div className="cs-wizard-step">
        <h3>{t("codestudioGeneral.wizard.stepNameTitle")}</h3>
        <p>{t("codestudioGeneral.wizard.stepNameDescription")}</p>
        <input
          autoFocus
          className="cs-wizard-input"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setNameError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") confirmName();
          }}
          placeholder={t("codestudioGeneral.create.namePlaceholder")}
          maxLength={40}
        />
        {nameError && <p className="cs-wizard-error">{nameError}</p>}
        <div className="cs-wizard-actions">
          <button type="button" className="cs-wizard-cancel" onClick={onCancel}>
            {t("codestudioGeneral.wizard.cancel")}
          </button>
          <button type="button" className="cs-wizard-continue" onClick={confirmName} disabled={!name.trim()}>
            {t("codestudioGeneral.wizard.continue")}
          </button>
        </div>
      </div>
    );
  } else if (step === 1) {
    stepBody = (
      <div className="cs-wizard-step">
        <h3>{t("codestudioGeneral.wizard.stepTypeTitle")}</h3>
        <p>{t("codestudioGeneral.wizard.stepTypeDescription")}</p>
        <div className="cs-wizard-apptype-grid">
          {appTypes.map((type) => {
            const Icon = APP_TYPE_ICONS[type.icon ?? ""] ?? Rocket;
            const active = appTypeId === type.id;
            return (
              <button
                key={type.id}
                type="button"
                className={`cs-apptype-card ${active ? "active" : ""}`}
                style={{ "--apptype-accent": type.color ?? "#22d3ee" } as CSSProperties}
                onClick={() => setAppTypeId(type.id)}
              >
                <Icon size={20} />
                <b>{type.name}</b>
                <span className="cs-apptype-category">{type.category}</span>
                <span
                  className="cs-apptype-difficulty"
                  aria-label={t("codestudioGeneral.create.difficultyLabel", { difficulty: type.difficulty })}
                >
                  {Array.from({ length: 5 }).map((_, index) => (
                    <i key={index} className={index < type.difficulty ? "filled" : ""} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <div className="cs-wizard-actions">
          <button type="button" className="cs-wizard-cancel" onClick={goBack}>
            {t("codestudioGeneral.wizard.back")}
          </button>
          <button type="button" className="cs-wizard-continue" onClick={confirmType} disabled={!appTypeId}>
            {t("codestudioGeneral.wizard.continue")}
          </button>
        </div>
      </div>
    );
  } else {
    stepBody = (
      <div className="cs-wizard-step">
        <h3>{t("codestudioGeneral.wizard.stepConfirmTitle")}</h3>
        <p>{t("codestudioGeneral.wizard.stepConfirmDescription")}</p>
        <div className="cs-wizard-summary">
          <div>
            <span>{t("codestudioGeneral.create.namePlaceholder")}</span>
            <b>{name.trim()}</b>
          </div>
          <div>
            <span>{t("codestudioGeneral.wizard.stepTypeLabel")}</span>
            <b>{selectedType?.name}</b>
          </div>
        </div>
        {submitError && <p className="cs-wizard-error">{submitError}</p>}
        <div className="cs-wizard-actions">
          <button type="button" className="cs-wizard-cancel" onClick={goBack} disabled={submitting}>
            {t("codestudioGeneral.wizard.back")}
          </button>
          <button type="button" className="cs-wizard-continue" onClick={() => void handleFound()} disabled={submitting}>
            {submitting ? t("codestudioGeneral.wizard.founding") : t("codestudioGeneral.create.submit")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <CenteredJoyrideOverlay
      anchorId="cs-wizard-anchor"
      content={
        <div className="cs-wizard-card">
          <WizardProgress step={step} total={TOTAL_STEPS} />
          <WizardStepList labels={stepLabels} currentStep={step} />
          <div className="cs-wizard-body">{stepBody}</div>
        </div>
      }
    />
  );
}
