import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] p-8 text-center">
      {icon && <div className="mb-3 flex justify-center text-[rgb(var(--secondary-text))]">{icon}</div>}
      <h2 className="font-semibold text-[rgb(var(--text))]">{title}</h2>
      {description && <p className="mt-2 text-sm text-[rgb(var(--secondary-text))]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
