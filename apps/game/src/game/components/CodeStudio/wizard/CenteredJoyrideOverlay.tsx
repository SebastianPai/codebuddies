"use client";

import type { ReactNode } from "react";
import { Joyride, type Step } from "react-joyride";
import "./CenteredJoyrideOverlay.css";

type Props = {
  content: ReactNode;
  anchorId?: string;
};

// Primitivo compartido: un solo step de Joyride con placement:"center" sobre
// un ancla invisible — lo usan tanto FoundingWizard (fundar empresa) como
// ExplainerTour (guías de "qué es esto/qué hago"). Joyride se encarga de
// oscurecer y bloquear clics en TODO lo demás mientras `content` (lo que sea
// que le pasemos) queda arriba de todo, centrado en pantalla.
export default function CenteredJoyrideOverlay({ content, anchorId = "cs-centered-anchor" }: Props) {
  const steps: Step[] = [
    {
      target: `#${anchorId}`,
      placement: "center",
      content,
      skipBeacon: true,
      buttons: [],
      spotlightPadding: 0,
      dismissKeyAction: false,
      overlayClickAction: false,
      overlayColor: "rgba(3, 7, 18, 0.88)",
      // El default de Joyride (100) queda muy por debajo de esta app: la
      // ventana del PC ya usa z-index 200, y los modales/toasts del juego
      // usan --cb-z-modal (15000) / --cb-z-toast (16000) — sin esto el
      // overlay se dibuja tapado detrás de todo lo demás.
      zIndex: 20000,
    },
  ];

  return (
    <>
      <div id={anchorId} className="cs-centered-anchor" />
      <Joyride
        steps={steps}
        run
        stepIndex={0}
        continuous
        styles={{
          tooltip: { background: "transparent", boxShadow: "none", padding: 0, width: 480 },
          tooltipContent: { padding: 0 },
          tooltipContainer: { textAlign: "left" },
        }}
      />
    </>
  );
}
