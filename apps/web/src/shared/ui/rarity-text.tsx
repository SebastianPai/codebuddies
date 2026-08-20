import type { ElementType, ReactNode } from "react";
import { getEffectDefinition, type EffectId } from "@codebuddies/visual-effects";
import { classNames } from "@/shared/utils/class-names";

interface RarityTextProps {
  effect: EffectId | string | null | undefined;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

/** Renders text with the shared rarity/premium gradient treatment for the given effect id. */
export function RarityText({ effect, as: Component = "span", className, children }: RarityTextProps) {
  const definition = getEffectDefinition(effect);
  return (
    <Component className={classNames(definition.textClassName, className)}>
      {children}
    </Component>
  );
}
