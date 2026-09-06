"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  FlaskConical,
  Gift,
  Lock,
  RotateCcw,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";

import { api } from "@/shared/api";
import { CurrencyIcon, ErrorState, Loader } from "@/shared/ui";
import { classNames } from "@/shared/utils/class-names";
import { useTranslation } from "@/i18n/useTranslation";
import {
  CalloutBlock,
  LessonContentRenderer,
  normalizeLessonContent,
} from "@/features/academy";
import { useAuth } from "@/shared/hooks/use-auth";
import { useReward } from "../../../../../../contexts/RewardContext";

interface LessonExercise {
  id: string;
  type: string;
}

interface LessonResponse {
  id: string;
  courseId: string;
  order: number;
  type: string;
  title: string | null;
  description: string | null;
  content: unknown;
  locked: boolean;
  experience?: number;
  coins?: number;
  exercises?: LessonExercise[];
  course?: { title?: string | null; experience?: number; coins?: number };
}

interface SidebarLesson {
  id: string;
  order: number;
  title: string | null;
  locked?: boolean;
}

interface CourseResponse {
  id: string;
  title: string | null;
  module?: { id?: string; title: string | null };
  lessons?: SidebarLesson[];
}

interface ProgressItem {
  lesson?: { id: string } | null;
  exercise?: { id: string } | null;
}

function getLang(): string {
  if (typeof window === "undefined") return "es";
  return localStorage.getItem("lang") || "es";
}

export default function LessonTheoryPage() {
  const { id: courseId, lessonId } = useParams<{
    id: string;
    lessonId: string;
  }>();
  const t = useTranslation();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { showReward } = useReward();

  const [lesson, setLesson] = useState<LessonResponse | null>(null);
  const [course, setCourse] = useState<CourseResponse | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(
    new Set(),
  );
  const [loadError, setLoadError] = useState(false);
  const [completing, setCompleting] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    const lang = getLang();
    try {
      const [lessonData, courseData] = await Promise.all([
        api.get<LessonResponse>(`/lessons/${lessonId}?lang=${lang}`),
        api
          .get<CourseResponse>(`/courses/${courseId}?lang=${lang}`)
          .catch(() => null),
      ]);
      setLesson(lessonData);
      setCourse(courseData);
    } catch {
      setLoadError(true);
      return;
    }

    if (isAuthenticated && user?.userId) {
      try {
        const progress = await api.get<ProgressItem[]>(
          `/progress/user/${user.userId}`,
        );
        setCompletedLessonIds(
          new Set(
            progress
              .filter((item) => item.lesson?.id && !item.exercise?.id)
              .map((item) => item.lesson!.id),
          ),
        );
      } catch {
        // el progreso es secundario, no bloquea la lección
      }
    }
  }, [courseId, lessonId, isAuthenticated, user?.userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const doc = useMemo(
    () => normalizeLessonContent(lesson?.content),
    [lesson?.content],
  );

  const sidebarLessons = useMemo<SidebarLesson[]>(() => {
    if (course?.lessons?.length) {
      return [...course.lessons].sort((a, b) => a.order - b.order);
    }
    if (lesson) {
      return [
        { id: lesson.id, order: lesson.order, title: lesson.title },
      ];
    }
    return [];
  }, [course?.lessons, lesson]);

  const currentIndex = sidebarLessons.findIndex((item) => item.id === lessonId);
  const totalLessons = sidebarLessons.length;
  const completedCount = sidebarLessons.filter((item) =>
    completedLessonIds.has(item.id),
  ).length;
  const isCompleted = completedLessonIds.has(lessonId);

  const xp = lesson?.experience ?? lesson?.course?.experience ?? 50;
  const coins = lesson?.coins ?? lesson?.course?.coins ?? 10;

  const firstExercise = lesson?.exercises?.[0];
  const nextHref = firstExercise
    ? `/learn/exercise/${firstExercise.type.toLowerCase()}/${firstExercise.id}`
    : `/courses/${courseId}`;

  const isAdmin = user?.role === "ADMIN";
  const [adminBusy, setAdminBusy] = useState<string | null>(null);

  const runAdminAction = useCallback(
    async (
      key: string,
      request: () => Promise<{ xpAdded?: number; coinsAdded?: number }>,
    ) => {
      setAdminBusy(key);
      try {
        const result = await request();
        if (result?.xpAdded || result?.coinsAdded) {
          showReward({
            xp: result.xpAdded ?? 0,
            coins: result.coinsAdded ?? 0,
          });
        }
        await load();
      } catch {
        // herramienta de test: si falla, no romper la página
      } finally {
        setAdminBusy(null);
      }
    },
    [load, showReward],
  );

  const handleContinue = useCallback(async () => {
    if (
      isAuthenticated &&
      lesson &&
      !lesson.locked &&
      !completedLessonIds.has(lessonId)
    ) {
      setCompleting(true);
      try {
        const result = await api.post<{
          alreadyCompleted?: boolean;
          xpAdded?: number;
          coinsAdded?: number;
        }>("/progress", { lessonId });
        setCompletedLessonIds((current) => new Set(current).add(lessonId));
        if (!result.alreadyCompleted && (result.xpAdded || result.coinsAdded)) {
          showReward({
            xp: result.xpAdded ?? 0,
            coins: result.coinsAdded ?? 0,
          });
        }
      } catch {
        // no bloquear la navegación si el registro de progreso falla
      } finally {
        setCompleting(false);
      }
    }
    router.push(nextHref);
  }, [
    isAuthenticated,
    lesson,
    completedLessonIds,
    lessonId,
    nextHref,
    router,
    showReward,
  ]);

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <ErrorState message={t("courseDetail.loadError")} />
        <button
          onClick={() => void load()}
          className="rounded-lg bg-[rgb(var(--button))] px-6 py-3 text-sm font-bold uppercase tracking-wide text-[rgb(var(--button-text))] transition hover:brightness-110"
        >
          {t("common.refresh")}
        </button>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader label={t("courseDetail.loading")} size={28} />
      </div>
    );
  }

  const progressPercent = totalLessons
    ? Math.round((completedCount / totalLessons) * 100)
    : 0;

  const sidebar = (
    <nav className="space-y-4">
      <Link
        href={`/courses/${courseId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--secondary-text))] transition hover:text-[rgb(var(--text))]"
      >
        <ArrowLeft size={15} />
        {t("site.academyLesson.backToModule")}
      </Link>

      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
        {course?.module?.title && (
          <p className="text-[0.7rem] font-bold uppercase tracking-wide text-[rgb(var(--secondary-text))]">
            {course.module.title}
          </p>
        )}
        <p className="mt-1 flex items-center gap-2 text-sm font-bold text-[rgb(var(--text))]">
          <BookOpen size={15} className="text-[rgb(var(--primary))]" />
          {course?.title ?? lesson.course?.title ?? t("courseDetail.lessonFallback")}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgb(var(--border))]">
          <div
            className="h-full rounded-full bg-[rgb(var(--primary))] transition-all duration-500"
            style={{ width: `${Math.max(progressPercent, completedCount > 0 ? 6 : 0)}%` }}
          />
        </div>
        <p className="mt-1.5 text-[0.7rem] text-[rgb(var(--secondary-text))]">
          {t("site.academyLesson.lessonProgress", {
            done: completedCount,
            total: totalLessons,
          })}
        </p>
      </div>

      <ol className="space-y-1">
        {sidebarLessons.map((item) => {
          const done = completedLessonIds.has(item.id);
          const active = item.id === lessonId;
          return (
            <li key={item.id}>
              <Link
                href={`/courses/${courseId}/lessons/${item.id}`}
                aria-current={active ? "page" : undefined}
                className={classNames(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "bg-[rgb(var(--primary)/0.12)] font-semibold text-[rgb(var(--text))] ring-1 ring-[rgb(var(--primary)/0.5)]"
                    : "text-[rgb(var(--secondary-text))] hover:bg-[rgb(var(--border)/0.4)] hover:text-[rgb(var(--text))]",
                )}
              >
                {item.locked ? (
                  <Lock size={15} className="shrink-0 text-[rgb(var(--disabled))]" />
                ) : done ? (
                  <CheckCircle2
                    size={15}
                    className="shrink-0 text-[rgb(var(--success))]"
                  />
                ) : (
                  <Circle
                    size={15}
                    className={classNames(
                      "shrink-0",
                      active
                        ? "text-[rgb(var(--primary))]"
                        : "text-[rgb(var(--border))]",
                    )}
                  />
                )}
                <span className="tabular-nums text-[0.7rem] text-[rgb(var(--secondary-text))]">
                  {String(item.order).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {item.title ?? t("courseDetail.lessonFallback")}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)_296px] xl:gap-8">
      {/* Sidebar de navegación del curso */}
      <aside className="hidden lg:block">
        <div className="sticky top-24">{sidebar}</div>
      </aside>

      {/* Navegación colapsable en mobile */}
      <details className="group rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] lg:hidden">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-[rgb(var(--text))]">
          {t("site.academyLesson.lessonsInCourse")}
          <ArrowRight
            size={15}
            className="transition-transform group-open:rotate-90"
          />
        </summary>
        <div className="border-t border-[rgb(var(--border))] p-4">{sidebar}</div>
      </details>

      {/* Contenido de la lección */}
      <article className="min-w-0">
        {isAdmin && (
          <div className="mb-5 rounded-xl border border-dashed border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.05)] p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-[rgb(var(--primary))]">
              <FlaskConical size={13} />
              {t("site.academyLesson.adminTools")}
            </p>
            <div className="flex flex-wrap gap-2">
              <AdminButton
                busy={adminBusy === "complete-lesson"}
                onClick={() =>
                  runAdminAction("complete-lesson", () =>
                    api.post("/progress", { lessonId }),
                  )
                }
              >
                <CheckCircle2 size={13} />
                {t("site.academyLesson.adminCompleteLesson")}
              </AdminButton>
              <AdminButton
                busy={adminBusy === "reset-lesson"}
                onClick={() =>
                  runAdminAction("reset-lesson", () =>
                    api.post("/progress/admin/reset", {
                      scope: "lesson",
                      lessonId,
                    }),
                  )
                }
              >
                <RotateCcw size={13} />
                {t("site.academyLesson.adminResetLesson")}
              </AdminButton>
              <AdminButton
                busy={adminBusy === "complete-course"}
                onClick={() =>
                  runAdminAction("complete-course", () =>
                    api.post("/progress/admin/complete-course", { courseId }),
                  )
                }
              >
                <CheckCircle2 size={13} />
                {t("site.academyLesson.adminCompleteCourse")}
              </AdminButton>
              <AdminButton
                busy={adminBusy === "reset-course"}
                onClick={() =>
                  runAdminAction("reset-course", () =>
                    api.post("/progress/admin/reset", {
                      scope: "course",
                      courseId,
                    }),
                  )
                }
              >
                <RotateCcw size={13} />
                {t("site.academyLesson.adminResetCourse")}
              </AdminButton>
            </div>
          </div>
        )}
        <p className="text-xs font-bold uppercase tracking-wide text-[rgb(var(--primary))]">
          {t("site.academyLesson.lessonXofY", {
            index: currentIndex >= 0 ? currentIndex + 1 : lesson.order,
            total: totalLessons || lesson.order,
          })}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[rgb(var(--text))] sm:text-4xl">
          {lesson.title ?? t("courseDetail.lessonFallback")}
        </h1>
        {lesson.description && (
          <p className="mt-3 text-lg text-[rgb(var(--secondary-text))]">
            {lesson.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.1)] px-3 py-1 text-xs font-bold text-[rgb(var(--primary-text))]">
            <Zap size={13} />+{xp} XP
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--border))] px-3 py-1 text-xs font-bold text-[rgb(var(--text))]">
            <CurrencyIcon currency="coins" size={13} />+{coins}
          </span>
          {isCompleted && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--success)/0.4)] bg-[rgb(var(--success)/0.1)] px-3 py-1 text-xs font-bold text-[rgb(var(--success-text))]">
              <CheckCircle2 size={13} />
              {t("site.academyLesson.completed")}
            </span>
          )}
        </div>

        {lesson.locked ? (
          <div className="mt-8 rounded-2xl border border-[rgb(var(--cb-warning))] bg-[rgb(var(--cb-warning)/0.08)] p-8 text-center">
            <Lock
              size={28}
              className="mx-auto mb-3 text-[rgb(var(--warning-text))]"
            />
            <h2 className="text-xl font-bold text-[rgb(var(--text))]">
              {t("site.academyLesson.lockedTitle")}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[rgb(var(--secondary-text))]">
              {t("site.academyLesson.lockedBody")}
            </p>
            <Link
              href="/premium"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[rgb(var(--button))] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-[rgb(var(--button-text))] transition hover:brightness-110"
            >
              {t("site.premiumTitle")}
              <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-gradient-to-br from-[rgb(var(--primary)/0.14)] via-[rgb(var(--card))] to-[rgb(var(--card))] p-6">
              <Sparkles size={22} className="text-[rgb(var(--primary))]" />
              <p className="mt-2 text-sm text-[rgb(var(--secondary-text))]">
                {t("site.academyLesson.heroTagline")}
              </p>
            </div>

            {doc.blocks.length > 0 ? (
              <LessonContentRenderer doc={doc} className="mt-8" />
            ) : (
              <p className="mt-8 text-sm italic text-[rgb(var(--secondary-text))]">
                {t("site.academyLesson.noContentYet")}
              </p>
            )}

            {/* Transición a los ejercicios */}
            <div className="mt-12 overflow-hidden rounded-2xl border border-[rgb(var(--primary)/0.35)] bg-[rgb(var(--primary)/0.06)] p-6 sm:p-8">
              <h2 className="flex items-center gap-2 text-xl font-black text-[rgb(var(--text))]">
                <Trophy size={20} className="text-[rgb(var(--primary))]" />
                {t("site.academyLesson.readyToPractice")}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-[rgb(var(--secondary-text))]">
                {t("site.academyLesson.recap")}
              </p>
              <button
                onClick={() => void handleContinue()}
                disabled={completing}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[rgb(var(--button))] px-6 py-3 text-sm font-black uppercase tracking-wide text-[rgb(var(--button-text))] transition hover:brightness-110 disabled:opacity-60"
              >
                {completing ? (
                  <Loader label="" size={16} />
                ) : (
                  <>
                    {firstExercise
                      ? t("site.academyLesson.continueToExercises")
                      : t("site.academyLesson.backToCourse")}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </article>

      {/* Riel derecho */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-4">
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
            <p className="text-sm font-bold text-[rgb(var(--text))]">
              {t("site.academyLesson.yourProgress")}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <ChecklistRow done label={t("site.academyLesson.readContent")} />
              <ChecklistRow
                done={isCompleted}
                label={t("site.academyLesson.completeExercises")}
              />
              <ChecklistRow
                done={isCompleted}
                label={t("site.academyLesson.getRewards")}
              />
            </ul>
          </div>

          <CalloutBlock
            variant="tip"
            title={t("site.academyLesson.quickTip")}
            markdown={t("site.academyLesson.quickTipBody")}
          />

          <button
            onClick={() => void handleContinue()}
            disabled={completing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[rgb(var(--button))] px-4 py-3 text-sm font-black uppercase tracking-wide text-[rgb(var(--button-text))] transition hover:brightness-110 disabled:opacity-60"
          >
            <Gift size={15} />
            {firstExercise
              ? t("site.academyLesson.continueToExercises")
              : t("site.academyLesson.backToCourse")}
          </button>
        </div>
      </aside>
    </div>
  );
}

function AdminButton({
  children,
  onClick,
  busy,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 py-1.5 text-xs font-semibold text-[rgb(var(--text))] transition hover:border-[rgb(var(--primary)/0.6)] disabled:opacity-50"
    >
      {busy ? <Loader label="" size={12} /> : children}
    </button>
  );
}

function ChecklistRow({ done, label }: { done?: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 size={16} className="text-[rgb(var(--success))]" />
      ) : (
        <Circle size={16} className="text-[rgb(var(--border))]" />
      )}
      <span
        className={
          done
            ? "text-[rgb(var(--text))]"
            : "text-[rgb(var(--secondary-text))]"
        }
      >
        {label}
      </span>
    </li>
  );
}
