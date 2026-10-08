"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Lock } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { exercisePath, lessonPath } from "@/shared/utils/exercise-path";
import type { ExerciseLockedStep } from "@/types/exercise";

// Pantalla única para un ejercicio que todavía no se puede hacer. En vez de
// mandar al curso a buscar qué falta, lleva directo al paso pendiente: la
// teoría de la lección o el ejercicio anterior sin resolver.
export function ExerciseLockedState({
  courseId,
  lockedReason,
  lockedStep,
}: {
  courseId?: string | null;
  lockedReason?: "premium" | "progression" | null;
  lockedStep?: ExerciseLockedStep | null;
}) {
  const t = useTranslation();

  let title = t("site.academyLesson.lockedProgressionTitle");
  let body = t("site.academyLesson.lockedProgressionBody");
  let href = courseId ? `/courses/${courseId}` : "/courses";
  let cta = t("site.academyLesson.backToCourse");
  let Icon = Lock;

  if (lockedReason === "premium") {
    body = t("site.exerciseLockedMessage");
    href = "/premium";
    cta = t("site.premiumTitle");
  } else if (lockedStep?.kind === "theory" && courseId) {
    title = t("site.academyLesson.lockedTheoryTitle");
    body = t("site.academyLesson.lockedTheoryBody");
    href = lessonPath(courseId, lockedStep.lessonId);
    cta = t("site.academyLesson.goToTheory");
    Icon = BookOpen;
  } else if (lockedStep?.kind === "exercise") {
    title = t("site.academyLesson.lockedPrevExerciseTitle");
    body = t("site.academyLesson.lockedPrevExerciseBody");
    href = exercisePath(lockedStep.exerciseId, lockedStep.exerciseType);
    cta = t("site.academyLesson.goToPrevExercise");
  }

  return (
    <div className="relative flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 text-center sm:p-8">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]">
          <Icon size={22} />
        </span>
        <h1 className="text-lg font-black text-[rgb(var(--text))]">{title}</h1>
        <p className="mt-2 text-sm text-[rgb(var(--secondary-text))]">{body}</p>
        <Link
          href={href}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[rgb(var(--button))] px-6 py-3 text-sm font-black uppercase tracking-wide text-[rgb(var(--button-text))] transition hover:brightness-110"
        >
          {cta}
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
