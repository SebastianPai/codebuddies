import type { HTMLAttributes } from "react";

import { classNames } from "../utils/class-names";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={classNames("animate-pulse rounded-lg bg-[rgb(var(--border))]", className)}
      {...props}
    />
  );
}
