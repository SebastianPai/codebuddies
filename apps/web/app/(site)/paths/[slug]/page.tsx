"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Coins, Lock, Sparkles, Zap } from "lucide-react";
import { api } from "../../../../src/shared/api";
import { ProgressBar, Skeleton } from "../../../../src/shared/ui";
import { classNames } from "../../../../src/shared/utils/class-names";
import { useTranslation } from "../../../../src/i18n/useTranslation";

interface LearningPathCourseNode {
  id: string;
  order: number;
  title: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  imageUrl: string | null;
  xpReward: number;
  coinsReward: number;
  completed: boolean;
  locked: boolean;
  requires: string[];
}

interface LearningPathDetail {
  id: string;
  slug: string;
  imageUrl: string | null;
  title: string | null;
  description: string | null;
  progress: { completedCount: number; totalCount: number; percent: number };
  courses: LearningPathCourseNode[];
}

const DIFFICULTY_TONE: Record<LearningPathCourseNode["difficulty"], string> = {
  EASY: "text-emerald-500",
  MEDIUM: "text-amber-500",
  HARD: "text-rose-500",
};

type NodeState = "completed" | "current" | "locked";

function nodeState(course: LearningPathCourseNode, isFirstUnlocked: boolean): NodeState {
  if (course.completed) return "completed";
  if (!course.locked && isFirstUnlocked) return "current";
  return course.locked ? "locked" : "current";
}

export default function LearningPathDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useTranslation();
  const [path, setPath] = useState<LearningPathDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    api
      .get<LearningPathDetail>(`/learning-paths/${slug}`)
      .then((data) => {
        if (cancelled) return;
        setPath(data);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="py-12">
        <Skeleton className="mx-auto h-10 w-2/3" />
        <div className="mx-auto mt-10 max-w-md space-y-8">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (status === "error" || !path) {
    return <p className="py-20 text-center text-[rgb(var(--secondary-text))]">{t("common.unexpectedError")}</p>;
  }

  const firstUnlockedIndex = path.courses.findIndex((c) => !c.completed && !c.locked);

  return (
    <div className="py-12">
      <section className="text-center">
        <p className="font-mono text-sm uppercase text-[rgb(var(--primary))]">{t("site.pathsLabel")}</p>
        <h1 className="mt-4 text-5xl font-black text-[rgb(var(--text))]">{path.title}</h1>
        {path.description && (
          <p className="mx-auto mt-4 max-w-2xl text-[rgb(var(--secondary-text))]">{path.description}</p>
        )}
        <div className="mx-auto mt-8 max-w-sm">
          <ProgressBar
            current={path.progress.completedCount}
            target={path.progress.totalCount}
            title={t("site.pathMapProgress", {
              completed: path.progress.completedCount,
              total: path.progress.totalCount,
            })}
            subtitle={`${path.progress.percent}%`}
          />
        </div>
      </section>

      {path.courses.length === 0 ? (
        <p className="mt-16 text-center text-[rgb(var(--secondary-text))]">{t("site.pathsEmpty")}</p>
      ) : (
        <div className="relative mx-auto mt-16 max-w-3xl pb-4">
          {/* Línea central del mapa: sólida hasta donde llegó el progreso real, punteada en lo pendiente. */}
          <div
            aria-hidden
            className="absolute left-1/2 top-6 bottom-6 w-1 -translate-x-1/2 rounded-full bg-[rgb(var(--border))]"
          />
          <div
            aria-hidden
            className="absolute left-1/2 top-6 w-1 -translate-x-1/2 rounded-full bg-[rgb(var(--primary))] transition-all duration-700"
            style={{
              height:
                path.courses.length > 1
                  ? `${(Math.max(path.progress.completedCount - 1, 0) / (path.courses.length - 1)) * 100}%`
                  : "0%",
            }}
          />

          <ol className="relative space-y-10">
            {path.courses.map((course, index) => {
              const state = nodeState(course, index === firstUnlockedIndex);
              const align = index % 2 === 0 ? "justify-start" : "justify-end";
              return (
                <motion.li
                  key={course.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.35, delay: Math.min(index, 6) * 0.05 }}
                  className={classNames("flex", align)}
                >
                  <PathMapNode course={course} state={state} t={t} />
                </motion.li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

function PathMapNode({
  course,
  state,
  t,
}: {
  course: LearningPathCourseNode;
  state: NodeState;
  t: ReturnType<typeof useTranslation>;
}) {
  const badge =
    state === "completed" ? (
      <Check size={26} strokeWidth={3} />
    ) : state === "locked" ? (
      <Lock size={22} />
    ) : (
      <Sparkles size={24} />
    );

  const card = (
    <div
      className={classNames(
        "w-full max-w-sm rounded-3xl border p-5 transition",
        state === "completed" &&
          "border-[rgb(var(--primary))]/40 bg-[rgb(var(--primary))]/5",
        state === "current" &&
          "border-[rgb(var(--primary))] bg-[rgb(var(--card))] shadow-[0_0_0_4px_rgb(var(--primary)/0.12)]",
        state === "locked" && "border-[rgb(var(--border))] bg-[rgb(var(--card))] opacity-60",
      )}
    >
      <div className="flex items-start gap-4">
        <span
          className={classNames(
            "relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
            state === "completed" && "bg-[rgb(var(--primary))] text-black",
            state === "current" && "bg-[rgb(var(--primary))] text-black",
            state === "locked" && "bg-[rgb(var(--border))] text-[rgb(var(--secondary-text))]",
          )}
        >
          {state === "current" && (
            <motion.span
              className="absolute inset-0 rounded-2xl border-2 border-[rgb(var(--primary))]"
              animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          {badge}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-bold text-[rgb(var(--text))]">{course.title}</h2>
          </div>
          <p className={classNames("text-xs font-bold uppercase", DIFFICULTY_TONE[course.difficulty])}>
            {course.difficulty}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-[rgb(var(--secondary-text))]">
            <span className="inline-flex items-center gap-1">
              <Zap size={13} className="text-[rgb(var(--primary))]" /> +{course.xpReward}
            </span>
            <span className="inline-flex items-center gap-1">
              <Coins size={13} className="text-[rgb(var(--primary))]" /> +{course.coinsReward}
            </span>
          </div>

          {state === "locked" && course.requires.length > 0 && (
            <p className="mt-3 text-xs text-[rgb(var(--secondary-text))]">
              {t("site.pathMapRequiresPrevious", { course: course.requires[0] })}
            </p>
          )}

          <div className="mt-4">
            {state === "locked" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--border))] px-4 py-2 text-xs font-bold text-[rgb(var(--secondary-text))]">
                <Lock size={12} /> {t("site.pathMapLockedCta")}
              </span>
            ) : (
              <Link
                href={`/courses/${course.id}`}
                className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--primary))] px-4 py-2 text-xs font-bold text-black transition hover:opacity-90"
              >
                {state === "completed" ? t("site.pathMapCompletedLabel") : t("site.pathViewCta")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return card;
}
