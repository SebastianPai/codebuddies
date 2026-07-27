import type { ReactNode } from "react";

import { classNames } from "../utils/class-names";
import { FOCUS_RING } from "./styles";

interface DropdownProps {
  label: ReactNode;
  children: ReactNode;
}

export function Dropdown({ label, children }: DropdownProps) {
  return (
    <details className="group relative">
      <summary
        className={classNames(
          "cursor-pointer list-none rounded-lg transition-colors group-hover:opacity-80",
          FOCUS_RING,
        )}
      >
        {label}
      </summary>
      <div className="absolute right-0 z-20 mt-2 min-w-40 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-2 shadow-xl">
        {children}
      </div>
    </details>
  );
}
