import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

import { classNames } from "../utils/class-names";
import { FOCUS_RING, PRESSABLE } from "./styles";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[rgb(var(--button))] text-[rgb(var(--button-text))] hover:brightness-110 active:brightness-95",
  secondary:
    "border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--border)/0.4)] active:bg-[rgb(var(--border)/0.6)]",
  // text-black is intentional: --error is the same soft red in all 3 themes, and white
  // text on it fails WCAG AA (~2:1); black text keeps ~7:1 in every theme.
  danger: "bg-[rgb(var(--error))] text-black hover:brightness-95 active:brightness-90",
  ghost: "text-[rgb(var(--secondary-text))] hover:bg-[rgb(var(--border)/0.4)] hover:text-[rgb(var(--text))] active:bg-[rgb(var(--border)/0.6)]",
};

export function Button({
  className,
  type = "button",
  variant = "primary",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={classNames(
        "relative rounded-lg px-4 py-2 text-sm font-medium transition",
        PRESSABLE,
        FOCUS_RING,
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <span className={classNames("inline-flex items-center justify-center gap-2", isLoading && "invisible")}>
        {children}
      </span>
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="animate-spin" size={16} />
        </span>
      )}
    </button>
  );
}
