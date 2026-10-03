"use client";

import { ArrowRight } from "lucide-react";
import type { ViewKey } from "./types";
import { useTranslation } from "../../../i18n/useTranslation";

// "¿Cómo lo logro?" de cada meta de etapa: tres pasos concretos y un botón
// que lleva a la pantalla donde se hace. Así las metas son un tutorial, no
// solo un número que hay que adivinar cómo subir.

const GOAL_VIEW: Record<string, ViewKey> = {
  "core-feature": "tree",
  server: "infra",
  users: "marketing",
  revenue: "tree",
  rating: "bugs",
  churn: "tree",
  profit: "finance",
  stability: "infra",
  valuation: "marketing",
};

export function hasGoalGuide(key: string | undefined) {
  return Boolean(key && GOAL_VIEW[key]);
}

export default function GoalGuide({ goalKey, onNavigate }: { goalKey: string; onNavigate: (view: ViewKey) => void }) {
  const t = useTranslation();
  const view = GOAL_VIEW[goalKey];
  if (!view) return null;
  return (
    <div className="cs2-goal-guide">
      <ol>
        {[1, 2, 3].map((step) => (
          <li key={step}>{t(`codestudio.goalGuide.${goalKey}.step${step}`)}</li>
        ))}
      </ol>
      <button type="button" className="cs2-btn cs2-btn-primary" onClick={() => onNavigate(view)}>
        {t(`codestudio.goalGuide.${goalKey}.go`)} <ArrowRight size={14} />
      </button>
    </div>
  );
}
