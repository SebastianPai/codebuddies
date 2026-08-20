import type { ElementType, ReactNode } from "react";
import { getEffectDefinition, type EffectId } from "@codebuddies/visual-effects";

interface Props {
  effect: EffectId | string | null | undefined;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

// Sin .module.css propio a propósito: el estilo vive entero en
// @codebuddies/visual-effects/effects.css (fuente única compartida con
// apps/web), esta función solo resuelve qué clase aplicar.
export default function RarityText({ effect, as: Tag = "span", className = "", children }: Props) {
  const definition = getEffectDefinition(effect);
  return <Tag className={`${definition.textClassName} ${className}`}>{children}</Tag>;
}
