import type { InputHTMLAttributes } from "react";

import { classNames } from "../utils/class-names";
import { FOCUS_RING } from "./styles";

export function Switch({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <input
      type="checkbox"
      role="switch"
      className={classNames(
        "h-4 w-8 cursor-pointer accent-[rgb(var(--primary))] disabled:cursor-not-allowed disabled:opacity-40",
        FOCUS_RING,
        className,
      )}
      {...props}
    />
  );
}
