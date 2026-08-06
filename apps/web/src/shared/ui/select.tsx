import type { SelectHTMLAttributes } from "react";

import { classNames } from "../utils/class-names";
import { FOCUS_RING_INSET } from "./styles";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={classNames(
        "rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--text))] transition-colors hover:border-[rgb(var(--primary)/0.5)] focus:border-[rgb(var(--primary))] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[rgb(var(--border))]",
        FOCUS_RING_INSET,
        className,
      )}
      {...props}
    />
  );
}
