import type { HTMLAttributes } from "react";

import { classNames } from "../utils/class-names";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={classNames(
        "rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]",
        className,
      )}
      {...props}
    />
  );
}
