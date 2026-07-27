"use client";
import { useTranslation } from "@/i18n/useTranslation";
import { Button, ErrorState, Loader } from "@/shared/ui";
import { DashboardHeader } from "./dashboard-header";
import { DashboardSidebar } from "./dashboard-sidebar";
import { LearningSection } from "./learning-section";
import { useDashboard } from "../hooks/use-dashboard";
import { getDashboardMetrics } from "../utils/dashboard-metrics";

export function DashboardPage() {
  const t = useTranslation();
  const { user, userStatus, referrals, referralsStatus, logout, retry, goToReferrals } = useDashboard();

  if (userStatus === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--background))] p-4">
        <div className="w-full max-w-md space-y-4">
          <ErrorState message={t("common.unexpectedError")} />
          <Button variant="primary" onClick={retry} className="w-full">
            {t("common.refresh")}
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--background))]">
        <Loader label={t("dashboard.loadingDashboard")} />
      </div>
    );
  }

  const metrics = getDashboardMetrics(user, referrals);
  return (
    <div className="relative min-h-screen overflow-hidden bg-[rgb(var(--background))] text-[rgb(var(--text))]">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-30">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-size-[40px_40px]" />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <DashboardHeader user={user} xp={metrics.xp} coins={metrics.coins} streak={metrics.streak} rank={metrics.rank} />
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_0.8fr]">
          <LearningSection level={metrics.level} xp={metrics.xp} nextLevel={metrics.nextLevel} xpRemaining={metrics.xpRemaining} />
          <DashboardSidebar
            user={user}
            referrals={referrals}
            referralsStatus={referralsStatus}
            rank={metrics.rank}
            referralTarget={metrics.referralTarget}
            referralMissing={metrics.referralMissing}
            onReferrals={goToReferrals}
            onLogout={logout}
          />
        </section>
      </div>
    </div>
  );
}
