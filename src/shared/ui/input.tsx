import type { InputHTMLAttributes } from "react";

import { classNames } from "../utils/class-names";
import { FOCUS_RING_INSET } from "./styles";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={classNames(
        "w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 text-sm text-[rgb(var(--text))] placeholder:text-[rgb(var(--secondary-text))] transition-colors hover:border-[rgb(var(--primary)/0.5)] focus:border-[rgb(var(--primary))] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[rgb(var(--border))]",
        FOCUS_RING_INSET,
        className,
      )}
      {...props}
    />
  );
}
