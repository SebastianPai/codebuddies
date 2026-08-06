import type { InputHTMLAttributes } from "react";

import { classNames } from "../utils/class-names";
import { FOCUS_RING } from "./styles";

export function Checkbox({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <input
      type="checkbox"
      className={classNames(
        "h-4 w-4 cursor-pointer rounded accent-[rgb(var(--primary))] disabled:cursor-not-allowed disabled:opacity-40",
        FOCUS_RING,
        className,
      )}
      {...props}
    />
  );
}
