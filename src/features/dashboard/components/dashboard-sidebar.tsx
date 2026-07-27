import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, Crown, Gift, Link2, Target, TrendingUp, Trophy, Users, Zap } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { Button, ProgressBar, Skeleton } from "@/shared/ui";
import { classNames } from "@/shared/utils/class-names";
import { FOCUS_RING, PRESSABLE } from "@/shared/ui/styles";
import { TOP_PLAYERS } from "../constants/dashboard";
import type { DashboardUser, ReferralOverview } from "../types/dashboard";

type LoadStatus = "loading" | "error" | "ready";

interface DashboardSidebarProps {
  user: DashboardUser;
  referrals: ReferralOverview | null;
  referralsStatus: LoadStatus;
  rank: number | null;
  referralTarget: number;
  referralMissing: number;
  onReferrals: () => void;
  onLogout: () => void;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[rgb(var(--primary))]">{icon}</span>
        <span className="text-xs font-bold uppercase text-[rgb(var(--secondary-text))]">{label}</span>
      </div>
      <h3 className="truncate font-bold">{value}</h3>
    </div>
  );
}

const panelClasses = "rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6";
const textLinkClasses = classNames("rounded", FOCUS_RING);

export function DashboardSidebar({
  user,
  referrals,
  referralsStatus,
  rank,
  referralTarget,
  referralMissing,
  onReferrals,
  onLogout,
}: DashboardSidebarProps) {
  const t = useTranslation();
  const validated = referrals?.stats.validated ?? 0;
  const rewardText = referrals?.nextReward
    ? referralMissing > 0
      ? t("dashboard.missingFor", { count: referralMissing, name: referrals.nextReward.name })
      : t("dashboard.milestoneReached", { name: referrals.nextReward.name })
    : t("dashboard.noRewards");

  return (
    <div className="min-w-0 space-y-6">
      <div className="rounded-3xl bg-[rgb(var(--button))] p-6 text-[rgb(var(--button-text))]">
        <div className="mb-6 flex items-center justify-between">
          <Target size={28} />
          <span className="rounded-full bg-[rgb(var(--text))] px-3 py-1 text-xs font-bold uppercase text-[rgb(var(--background))]">
            {t("dashboard.dailyQuest")}
          </span>
        </div>
        <h2 className="text-3xl font-black">{t("dashboard.sqlChallenge")}</h2>
        <p className="mt-3 opacity-70">{t("dashboard.earnRewards")}</p>
        <Link
          href="/missions"
          className={classNames(
            "mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--text))] py-4 font-bold text-[rgb(var(--background))] transition hover:opacity-90",
            PRESSABLE,
            FOCUS_RING,
          )}
        >
          {t("dashboard.startMission")}
        </Link>
      </div>

      <div className={panelClasses}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link2 className="text-[rgb(var(--primary))]" />
            <h2 className="text-2xl font-black">{t("dashboard.referrals")}</h2>
          </div>
          <Button variant="ghost" onClick={onReferrals} className="border border-[rgb(var(--border))]">
            {t("dashboard.referralProgram")}
          </Button>
        </div>
        {referralsStatus === "loading" ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16 col-span-2 sm:col-span-1" />
            </div>
            <Skeleton className="h-20" />
          </div>
        ) : referralsStatus === "error" ? (
          <p className="text-sm text-[rgb(var(--secondary-text))]">{t("common.unexpectedError")}</p>
        ) : (
          <>
            <p className="text-sm text-[rgb(var(--secondary-text))]">
              {t("dashboard.code")} {referrals?.profile?.referralCode ?? "-"}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Stat icon={<Users size={16} />} label={t("dashboard.referrals")} value={String(referrals?.referrals.length ?? 0)} />
              <Stat icon={<Trophy size={16} />} label={t("dashboard.rank")} value={rank ? `#${rank}` : "-"} />
              <Stat icon={<Gift size={16} />} label={t("dashboard.next")} value={referrals?.nextReward?.threshold ? String(referrals.nextReward.threshold) : "-"} />
            </div>
            <div className="mt-4">
              <ProgressBar current={validated} target={referralTarget} title={t("dashboard.nextReward")} subtitle={rewardText} />
            </div>
          </>
        )}
      </div>

      <div className={panelClasses}>
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Crown className="text-[rgb(var(--primary))]" />
            <h2 className="text-2xl font-black">{t("dashboard.topPlayers")}</h2>
          </div>
          <Link
            href="/rankings"
            className={classNames("flex items-center gap-1 text-sm text-[rgb(var(--secondary-text))] transition hover:text-[rgb(var(--text))]", textLinkClasses)}
          >
            {t("dashboard.viewAll")} <ArrowRight size={14} />
          </Link>
        </div>
        <div className="space-y-4">
          {TOP_PLAYERS.map((player, index) => (
            <div key={player.name} className="flex items-center justify-between rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgb(var(--button))] font-black text-[rgb(var(--button-text))]">
                  #{index + 1}
                </div>
                <div>
                  <h3 className="font-bold">{player.name}</h3>
                  <p className="text-sm text-[rgb(var(--secondary-text))]">{player.xp}</p>
                </div>
              </div>
              <Trophy size={18} className="text-[rgb(var(--primary))]" />
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-4">
          <p className="text-sm text-[rgb(var(--secondary-text))]">{t("dashboard.currentPosition")}</p>
          <div className="mt-2 flex justify-between">
            <span className="text-lg font-bold">{t("dashboard.topLabel")} {rank ? `#${rank}` : "-"}</span>
            <span className="font-semibold text-[rgb(var(--primary))]">{t("dashboard.keepClimbing")}</span>
          </div>
        </div>
      </div>

      <div className={panelClasses}>
        <Link
          href="/settings"
          className={classNames("flex items-center gap-4 rounded-2xl transition hover:opacity-90", FOCUS_RING)}
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[rgb(var(--button))] text-2xl font-black text-[rgb(var(--button-text))]">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold">{user.email}</h2>
            <p className="capitalize text-[rgb(var(--secondary-text))]">{user.role}</p>
          </div>
        </Link>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <Stat icon={<BookOpen size={16} />} label={t("admin.courses")} value={String(user.enrollments ?? 0)} />
          <Stat icon={<Clock3 size={16} />} label={t("dashboard.hours")} value={`${Math.max(user.completions ?? 0, 0)} ${t("dashboard.milestones")}`} />
          <Stat icon={<TrendingUp size={16} />} label={t("dashboard.progress")} value={`${user.certificates ?? 0} ${t("dashboard.certificates")}`} />
          <Stat icon={<Zap size={16} />} label={t("dashboard.skills")} value={t("dashboard.levelValue", { level: user.level })} />
        </div>
        <Button variant="danger" onClick={onLogout} className="mt-6 w-full">
          {t("dashboard.logout")}
        </Button>
      </div>
    </div>
  );
}
