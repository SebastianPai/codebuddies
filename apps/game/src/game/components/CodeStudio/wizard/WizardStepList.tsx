"use client";

import { ArrowRight, Check, Lock } from "lucide-react";

// Checklist (hecho / en curso / bloqueado) arriba del paso actual — ayuda al jugador a entender
// cuánto falta sin poder tocar todavía los pasos bloqueados (son solo
// visuales, no navegables: el wizard no permite saltar pasos).
export default function WizardStepList({ labels, currentStep }: { labels: string[]; currentStep: number }) {
  return (
    <div className="cs-wizard-steplist">
      {labels.map((label, index) => {
        const state = index < currentStep ? "done" : index === currentStep ? "active" : "locked";
        const Icon = state === "done" ? Check : state === "locked" ? Lock : ArrowRight;
        return (
          <span key={label} className={`cs-wizard-stepchip ${state}`}>
            <Icon size={11} className="cs-wizard-stepchip-icon" />
            {label}
          </span>
        );
      })}
    </div>
  );
}
