import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight, PlayCircle } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { CachedImage, EmptyState, Skeleton } from "@/shared/ui";
import { classNames } from "@/shared/utils/class-names";
import { FOCUS_RING } from "@/shared/ui/styles";
import type { ContinueLearningCourse } from "../types/dashboard";

type LoadStatus = "loading" | "error" | "ready";

interface LearningSectionProps {
  level: number;
  xp: number;
  nextLevel: number;
  xpRemaining: number;
  continueLearning: ContinueLearningCourse[];
  continueLearningStatus: LoadStatus;
}

function courseHref(course: ContinueLearningCourse) {
  if (!course.nextExercise) return `/courses/${course.courseId}`;
  return `/learn/exercise/${course.nextExercise.type.toLowerCase()}/${course.nextExercise.id}`;
}

export function LearningSection({
  level,
  xp,
  nextLevel,
  xpRemaining,
  continueLearning,
  continueLearningStatus,
}: LearningSectionProps) {
  const t = useTranslation();
  return (
    <div className="min-w-0 space-y-6">
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 md:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--secondary-text))]">
              {t("dashboard.currentLevel")}
            </h2>
            <div className="mt-2 flex items-end gap-4">
              <p className="text-7xl font-black leading-none md:text-8xl">{level}</p>
              <p className="pb-2 text-sm text-[rgb(var(--secondary-text))]">{t("dashboard.nextLevelRewards")}</p>
            </div>
          </div>
          <div className="w-full max-w-xl">
            <div className="mb-3 flex justify-between text-sm">
              <span className="text-[rgb(var(--secondary-text))]">{t("dashboard.progress")}</span>
              <span className="font-semibold">{xp.toLocaleString()}/{nextLevel.toLocaleString()} XP</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-[rgb(var(--border))]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((xp / nextLevel) * 100, 100)}%` }}
                transition={{ duration: 1 }}
                className="h-full bg-[rgb(var(--button))]"
              />
            </div>
            <p className="mt-3 text-sm text-[rgb(var(--secondary-text))]">
              {t("dashboard.xpToLevel", { xp: xpRemaining.toLocaleString() })}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 md:p-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight md:text-4xl">{t("dashboard.continueLearning")}</h2>
            <p className="mt-2 text-[rgb(var(--secondary-text))]">{t("dashboard.resumeCourses")}</p>
          </div>
          <Link
            href="/courses"
            className={classNames(
              "flex shrink-0 items-center gap-2 rounded-2xl bg-[rgb(var(--button))] px-5 py-3 font-bold text-[rgb(var(--button-text))] transition-all hover:scale-[1.02]",
              FOCUS_RING,
            )}
          >
            {t("dashboard.viewAll")} <ChevronRight size={18} />
          </Link>
        </div>

        {continueLearningStatus === "loading" ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="aspect-video rounded-2xl" />
            <Skeleton className="aspect-video rounded-2xl" />
            <Skeleton className="aspect-video rounded-2xl" />
          </div>
        ) : continueLearning.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={28} />}
            title={t("dashboard.noCoursesInProgress")}
            action={
              <Link
                href="/courses"
                className={classNames(
                  "inline-flex items-center gap-2 rounded-2xl bg-[rgb(var(--button))] px-5 py-3 font-bold text-[rgb(var(--button-text))]",
                  FOCUS_RING,
                )}
              >
                {t("dashboard.exploreCoursesCta")}
              </Link>
            }
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {continueLearning.map((course) => (
              <Link
                key={course.courseId}
                href={courseHref(course)}
                className={classNames(
                  "group overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] transition-transform hover:-translate-y-1",
                  FOCUS_RING,
                )}
              >
                <div className="relative aspect-video overflow-hidden">
                  <CachedImage
                    src={course.imageUrl ?? "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop"}
                    alt={course.title ?? ""}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-all group-hover:opacity-100">
                    <PlayCircle size={55} className="text-white" />
                  </div>
                </div>
                <div className="p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="text-sm text-[rgb(var(--secondary-text))]">
                      {t("dashboard.exercisesCount", { count: course.totalExercises })}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold">{course.title}</h3>
                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-[rgb(var(--secondary-text))]">{t("dashboard.progress")}</span>
                      <span className="font-semibold">{course.progressPercent}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-[rgb(var(--border))]">
                      <div className="h-full bg-[rgb(var(--button))]" style={{ width: `${course.progressPercent}%` }} />
                    </div>
                  </div>
                  <span className="mt-6 flex w-full items-center justify-center rounded-xl bg-[rgb(var(--button))] py-3 font-bold text-[rgb(var(--button-text))]">
                    {t("dashboard.continueCourse")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
