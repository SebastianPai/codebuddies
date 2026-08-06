import type { HTMLAttributes } from "react";

import { classNames } from "../utils/class-names";

type BadgeVariant = "default" | "primary" | "success" | "danger" | "warning";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-[rgb(var(--border))] text-[rgb(var(--text))]",
  primary: "bg-[rgb(var(--button))] text-[rgb(var(--button-text))]",
  success: "bg-[rgb(var(--success)/0.15)] text-[rgb(var(--success-text))]",
  danger: "bg-[rgb(var(--error)/0.15)] text-[rgb(var(--error-text))]",
  warning: "bg-[rgb(var(--cb-warning)/0.15)] text-[rgb(var(--warning-text))]",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
