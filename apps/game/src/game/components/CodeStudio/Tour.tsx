"use client";

import { X } from "lucide-react";
import type { ViewKey } from "./types";
import { useTranslation } from "../../../i18n/useTranslation";

// Tutorial guiado de CodeStudio: un globo por pestaña que cambia la vista y
// hace parpadear el botón de la barra (clase tour-target, ver CodeStudio.css).
// Sale solo la primera vez que el jugador tiene una empresa y se puede volver
// a ver con el botón "?" del encabezado.

export const TOUR_STEPS: ViewKey[] = ["panel", "tree", "bugs", "team", "infra", "marketing", "finance", "career"];
const TOUR_KEY = "cs-tour-done";

export function tourSeen() {
  try {
    return window.localStorage.getItem(TOUR_KEY) === "1";
  } catch {
    return true; // sin storage no insistimos en cada apertura
  }
}

function markTourSeen() {
  try {
    window.localStorage.setItem(TOUR_KEY, "1");
  } catch {
    // Sin storage (modo privado): el tutorial volverá a salir, no pasa nada.
  }
}

type Props = {
  step: number;
  onStep: (step: number) => void;
  onClose: () => void;
};

export default function Tour({ step, onStep, onClose }: Props) {
  const t = useTranslation();
  const key = TOUR_STEPS[step];
  const last = step === TOUR_STEPS.length - 1;
  const close = () => {
    markTourSeen();
    onClose();
  };

  return (
    <aside className="cs2-tour" role="dialog" aria-live="polite" aria-label={t("codestudio.tour.label", { step: step + 1, total: TOUR_STEPS.length })}>
      <header>
        <span>{t("codestudio.tour.label", { step: step + 1, total: TOUR_STEPS.length })}</span>
        <button type="button" className="cs2-icon-btn" onClick={close} aria-label={t("codestudio.tour.skip")} title={t("codestudio.tour.skip")}>
          <X size={14} />
        </button>
      </header>
      <div className="cs2-tour-dots" aria-hidden>
        {TOUR_STEPS.map((item, index) => (
          <i key={item} className={index <= step ? "on" : ""} />
        ))}
      </div>
      <h4>{t(`codestudio.tour.${key}.title`)}</h4>
      <p>{t(`codestudio.tour.${key}.text`)}</p>
      <footer>
        <button type="button" className="cs2-btn" onClick={() => (step === 0 ? close() : onStep(step - 1))}>
          {step === 0 ? t("codestudio.tour.skip") : t("codestudio.tour.back")}
        </button>
        <button type="button" className="cs2-btn cs2-btn-primary" onClick={() => (last ? close() : onStep(step + 1))}>
          {last ? t("codestudio.tour.done") : t("codestudio.tour.next")}
        </button>
      </footer>
    </aside>
  );
}
