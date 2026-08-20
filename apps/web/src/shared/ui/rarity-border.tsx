import type { ReactNode } from "react";
import { getEffectDefinition, type EffectId } from "@codebuddies/visual-effects";
import { classNames } from "@/shared/utils/class-names";

interface RarityBorderProps {
  effect: EffectId | string | null | undefined;
  glow?: boolean;
  className?: string;
  children: ReactNode;
}

/** Wraps children in the shared rarity/premium border treatment for the given effect id. */
export function RarityBorder({ effect, glow = false, className, children }: RarityBorderProps) {
  const definition = getEffectDefinition(effect);
  return (
    <div
      className={classNames(
        definition.borderClassName,
        glow ? definition.glowClassName : undefined,
        className,
      )}
    >
      {children}
    </div>
  );
}
