"use client";

import { useState } from "react";
import CenteredJoyrideOverlay from "./CenteredJoyrideOverlay";
import { useTranslation } from "../../../../i18n/useTranslation";
import "./ExplainerTour.css";

export type ExplainerSlide = { title: string; description: string };

type Props = {
  slides: ExplainerSlide[];
  onFinish: () => void;
};

// Guía corta de "qué es esto / qué hago" — a diferencia de FoundingWizard,
// acá no se pide ninguna decisión: son 2-3 slides que explican un concepto
// en palabras simples y al final devuelven el control al jugador sobre la
// pantalla real (que sigue montada detrás, sin cambios) para que interactúe
// él mismo ya entendiendo qué está mirando.
export default function ExplainerTour({ slides, onFinish }: Props) {
  const t = useTranslation();
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  return (
    <CenteredJoyrideOverlay
      anchorId="cs-explainer-anchor"
      content={
        <div className="cs-explainer-card">
          <div className="cs-explainer-dots">
            {slides.map((_, dotIndex) => (
              <span key={dotIndex} className={dotIndex === index ? "active" : dotIndex < index ? "done" : ""} />
            ))}
          </div>
          <h3>{slide.title}</h3>
          <p>{slide.description}</p>
          <div className="cs-explainer-actions">
            {index > 0 && (
              <button type="button" className="cs-wizard-cancel" onClick={() => setIndex(index - 1)}>
                {t("codestudioGeneral.wizard.back")}
              </button>
            )}
            <button
              type="button"
              className="cs-wizard-continue"
              onClick={() => (isLast ? onFinish() : setIndex(index + 1))}
            >
              {isLast ? t("codestudioMisc.guides.start") : t("codestudioMisc.guides.next")}
            </button>
          </div>
        </div>
      }
    />
  );
}
