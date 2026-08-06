"use client";
import { Inbox } from "lucide-react";
import { useTranslation } from "../../src/i18n/useTranslation";
import { Button, EmptyState, ErrorState, Skeleton } from "../../src/shared/ui";

export function GamificationSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-36" />
      ))}
    </div>
  );
}

export function GamificationEmpty({ title, description }: { title: string; description: string }) {
  return (
    <EmptyState
      title={title}
      description={description}
      icon={<Inbox className="text-[rgb(var(--primary))]" />}
    />
  );
}

export function GamificationError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTranslation();
  return (
    <div className="space-y-4">
      <ErrorState message={message} />
      <Button variant="primary" onClick={onRetry}>
        {t("gamification.retry")}
      </Button>
    </div>
  );
}
