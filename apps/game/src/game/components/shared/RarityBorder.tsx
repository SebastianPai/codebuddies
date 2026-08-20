import type { ReactNode } from "react";
import { getEffectDefinition, type EffectId } from "@codebuddies/visual-effects";

interface Props {
  effect: EffectId | string | null | undefined;
  glow?: boolean;
  className?: string;
  children: ReactNode;
}

// Sin .module.css propio a propósito: ver RarityText.tsx.
export default function RarityBorder({ effect, glow = false, className = "", children }: Props) {
  const definition = getEffectDefinition(effect);
  const classes = [
    definition.borderClassName ?? "",
    glow ? (definition.glowClassName ?? "") : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <div className={classes}>{children}</div>;
}
