"use client";

import { Scale } from "lucide-react";
import Modal from "../shared/Modal";
import type { CompanyView } from "./types";
import { useTranslation } from "../../../i18n/useTranslation";

type Props = {
  decision: NonNullable<CompanyView["pendingDecision"]>;
  busy: boolean;
  onChoose: (choice: string) => void;
  onClose: () => void;
};

export default function DecisionModal({ decision, busy, onChoose, onClose }: Props) {
  const t = useTranslation();
  return (
    <Modal className="cs2-modal" title={decision.title} onClose={onClose}>
      <div className="cs2-detail">
        <p>{decision.description}</p>
        <p className="cs2-muted">
          <Scale size={13} /> {t("codestudio.decision.deadline", { days: decision.daysLeft.toFixed(1) })}
        </p>
        <div className="cs2-options">
          {decision.choices.map((choice) => (
            <button key={choice.key} type="button" className="cs2-option" disabled={busy} onClick={() => onChoose(choice.key)}>
              <b>{choice.label}</b>
              <small>{choice.hint}</small>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
