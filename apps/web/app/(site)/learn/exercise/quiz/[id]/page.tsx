"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Zap,
  Coins,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  Rewind,
  FastForward,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  XCircle,
  Circle,
  Check,
  BookOpen,
  Lock,
  Sparkles,
  Loader2,
} from "lucide-react";
import { fetcher } from "../../../../../../utils/fetcher";
import { useReward } from "../../../../../../contexts/RewardContext";
import { QuizExercise } from "../../../../../../src/types/exercise";
import { useTranslation } from "../../../../../../src/i18n/useTranslation";
import { ContentDiscussion } from "@/features/courses/components/content-discussion";
import { CalloutBlock } from "@/features/academy";
import { classNames } from "@/shared/utils/class-names";
import { exercisePath } from "@/shared/utils/exercise-path";
import { useApiLang } from "@/shared/hooks/use-api-lang";
import {
  useTrackToolUsed,
  trackToolAction,
} from "../../../../../../components/analytics/tool-tracking";

interface ExtendedQuizExercise extends QuizExercise {
  prevExerciseId?: string | null;
  nextExerciseId?: string | null;
}

const SAVED_KEY = "cb:quiz:saved";

export default function QuizExercisePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showReward } = useReward();
  const t = useTranslation();
  const apiLang = useApiLang();
  useTrackToolUsed("quiz_exercise", "learning");

  const [exercise, setExercise] = useState<ExtendedQuizExercise | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [revealedCorrect, setRevealedCorrect] = useState<number[]>([]);
  const [revealedExplanation, setRevealedExplanation] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [coinsGained, setCoinsGained] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [solved, setSolved] = useState<Set<number>>(() => new Set());
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    // Cronómetro de la sesión — se ancla al montar, no durante el render.
    if (startedAtRef.current === 0) startedAtRef.current = Date.now();

    const token = localStorage.getItem("token")?.trim();
    const userId = localStorage.getItem("userId")?.trim();

    if (!token || !userId || userId === "null" || userId === "") {
      setErrorMessage(t("site.sessionCompromisedRedirect"));
      setTimeout(() => router.replace("/login"), 1200);
      return;
    }

    setAuthChecked(true);

    const loadExercise = async () => {
      try {
        setErrorMessage(null);
        const data = await fetcher(
          `/exercises/${id}?lang=${apiLang}&userId=${userId}`,
        );

        if (data.type !== "QUIZ") {
          router.replace("/404");
          return;
        }

        setExercise(data as ExtendedQuizExercise);
        setCompleted(data.completed);
      } catch {
        setErrorMessage(t("site.fileNotFoundError"));
      }
    };

    loadExercise();
  }, [id, router, apiLang]);

  // "Guardar para después" — lista liviana en localStorage, por ejercicio.
  useEffect(() => {
    try {
      const list: string[] = JSON.parse(
        localStorage.getItem(SAVED_KEY) || "[]",
      );
      setSaved(list.includes(id));
    } catch {
      /* localStorage no disponible: el bookmark simplemente no persiste */
    }
  }, [id]);

  const toggleSaved = () => {
    try {
      const list: string[] = JSON.parse(
        localStorage.getItem(SAVED_KEY) || "[]",
      );
      const next = list.includes(id)
        ? list.filter((x) => x !== id)
        : [...list, id];
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      setSaved(next.includes(id));
    } catch {
      /* noop */
    }
  };

  if (!authChecked || !exercise) {
    return (
      <div className="relative flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-8 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]">
            <Loader2 size={24} className="animate-spin" />
          </span>
          <div>
            <p className="text-base font-black text-[rgb(var(--text))]">
              {errorMessage || t("site.academyQuiz.loading")}
            </p>
            <p className="mt-1 text-sm text-[rgb(var(--secondary-text))]">
              {t("site.academyQuiz.loadingHint")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const questions = exercise.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const total = questions.length;

  if ((exercise as any).locked) {
    return (
      <div className="relative flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-2xl border border-[rgb(var(--cb-warning)/0.5)] bg-[rgb(var(--cb-warning)/0.08)] p-8 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgb(var(--cb-warning)/0.16)] text-[rgb(var(--warning-text))]">
            <Lock size={22} />
          </span>
          <p className="text-sm text-[rgb(var(--secondary-text))]">
            {t("site.exerciseLockedMessage")}
          </p>
          <Link
            href="/premium"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[rgb(var(--button))] px-6 py-3 text-sm font-black uppercase tracking-wide text-[rgb(var(--button-text))] transition hover:brightness-110"
          >
            {t("site.premiumTitle")}
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="relative flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-6 py-5 text-sm font-semibold text-[rgb(var(--secondary-text))]">
          <AlertTriangle size={18} className="text-[rgb(var(--warning-text))]" />
          {t("site.emptyMission")}
        </div>
      </div>
    );
  }

  const isMultiple = currentQuestion.isMultiple;
  const correctIndices = revealedCorrect;

  const answered = completed && solved.size === 0 ? total : solved.size;
  const percent = total
    ? Math.round((Math.min(answered, total) / total) * 100)
    : 0;

  const lessonHref =
    exercise.courseId && exercise.lessonId
      ? `/courses/${exercise.courseId}/lessons/${exercise.lessonId}`
      : null;

  const toggleOption = (index: number) => {
    if (isCorrect !== null) return;
    setSelectedOptions((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : isMultiple
          ? [...prev, index]
          : [index],
    );
  };

  const resetQuestionState = () => {
    setSelectedOptions([]);
    setIsCorrect(null);
    setShowExplanation(false);
    setRevealedCorrect([]);
    setRevealedExplanation("");
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    resetQuestionState();
    setCompleted(false);
    setXpGained(0);
    setCoinsGained(0);
    setSolved(new Set());
    setErrorMessage(null);
  };

  const goToQuestion = (nextIndex: number) => {
    setCurrentQuestionIndex(nextIndex);
    resetQuestionState();
  };

  const handleSubmit = async () => {
    if (selectedOptions.length === 0) return;

    try {
      const timeSpentSeconds = Math.round(
        (Date.now() - startedAtRef.current) / 1000,
      );
      const res = await fetcher(`/exercises/${exercise.id}/quiz/answer`, {
        method: "POST",
        body: JSON.stringify({
          questionIndex: currentQuestionIndex,
          selectedOptions,
          timeSpentSeconds,
        }),
      });

      trackToolAction("quiz_exercise", "learning", "answer");

      setIsCorrect(res.correct);
      setRevealedCorrect(res.correctOptions || []);
      setRevealedExplanation(res.explanation || "");
      setShowExplanation(true);

      if (res.correct) {
        setSolved((prev) => new Set(prev).add(currentQuestionIndex));
      }

      if (!res.correct || completed) return;

      setCompleted(true);
      const gainedXP = res.xpAdded || exercise.experience || 0;
      const gainedCoins = res.coinsAdded || exercise.coins || 0;
      setXpGained(gainedXP);
      setCoinsGained(gainedCoins);
      showReward({ xp: gainedXP, coins: gainedCoins });
    } catch {
      setErrorMessage(t("site.networkErrorProgress"));
    }
  };

  const isLastQuestion = currentQuestionIndex === total - 1;
  const showCompletionCta = (completed || isCorrect) && isLastQuestion;

  return (
    <div className="relative pb-12">
      {/* Fondo técnico discreto — rejilla tenue con degradado hacia arriba. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_right,rgb(var(--border)/0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--border)/0.14)_1px,transparent_1px)] bg-[size:46px_46px] [mask-image:radial-gradient(ellipse_75%_45%_at_50%_0%,#000_55%,transparent_100%)]"
      />

      <div className="relative z-10">
        {/* Barra superior: abortar + sello de desafío */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            onClick={() => router.back()}
            className="group inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-[rgb(var(--secondary-text))] transition-colors hover:border-[rgb(var(--primary)/0.5)] hover:text-[rgb(var(--text))]"
          >
            <ArrowLeft
              size={15}
              className="transition-transform group-hover:-translate-x-0.5"
            />
            {t("site.abortButton")}
          </button>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--border))] px-3 py-1.5 text-[0.7rem] font-black uppercase tracking-[0.12em] text-[rgb(var(--secondary-text))]">
            <Sparkles size={12} className="text-[rgb(var(--primary))]" />
            {t("site.academyQuiz.challenge")}
          </span>
        </div>

        {errorMessage && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-[rgb(var(--error)/0.4)] bg-[rgb(var(--error)/0.1)] p-4 text-sm font-semibold text-[rgb(var(--error-text))]">
            <AlertTriangle size={18} className="shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-8">
          {/* ---------- Escenario del quiz ---------- */}
          <div className="min-w-0">
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-[0_1px_0_0_rgb(var(--border)/0.6)] sm:p-7 md:p-8">
              {/* Metadatos: número de pregunta, categoría, tipo */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.12)] px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.1em] text-[rgb(var(--primary-text))]">
                  {t("site.questionOfTotal", {
                    current: currentQuestionIndex + 1,
                    total,
                  })}
                </span>
                {exercise.title && (
                  <span className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[rgb(var(--secondary-text))]">
                    {exercise.title}
                  </span>
                )}
                <span className="ml-auto inline-flex items-center rounded-md border border-[rgb(var(--border))] px-2 py-1 text-[0.62rem] font-bold uppercase tracking-wide text-[rgb(var(--secondary-text))]">
                  {isMultiple
                    ? t("site.academyQuiz.multiple")
                    : t("site.academyQuiz.single")}
                </span>
              </div>

              {/* Pregunta protagonista + opciones (con transición al cambiar) */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestionIndex}
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h1 className="mt-4 text-2xl font-black leading-tight tracking-tight text-[rgb(var(--text))] sm:text-3xl md:text-[2.05rem]">
                    {currentQuestion.question}
                  </h1>
                  <p className="mt-2 text-sm text-[rgb(var(--secondary-text))]">
                    {isMultiple
                      ? t("site.academyQuiz.selectMultiplePrompt")
                      : t("site.academyQuiz.selectPrompt")}
                  </p>

                  <div className="mt-6 grid gap-3">
                    {currentQuestion.options.map((option, index) => {
                      const isSelected = selectedOptions.includes(index);
                      const isCorrectOption = correctIndices.includes(index);
                      const settled = isCorrect !== null;

                      const state = settled
                        ? isCorrectOption
                          ? "correct"
                          : isSelected
                            ? "wrong"
                            : "muted"
                        : isSelected
                          ? "selected"
                          : "idle";

                      return (
                        <motion.button
                          key={index}
                          type="button"
                          onClick={() => toggleOption(index)}
                          disabled={settled}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.22,
                            delay: index * 0.04,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          whileTap={settled ? undefined : { scale: 0.992 }}
                          className={classNames(
                            "group relative flex w-full items-center gap-3.5 rounded-xl border p-4 text-left transition-all duration-200 md:gap-4 md:p-[18px]",
                            state === "idle" &&
                              "cursor-pointer border-[rgb(var(--border))] bg-[rgb(var(--card))] hover:-translate-y-0.5 hover:border-[rgb(var(--primary)/0.6)] hover:bg-[rgb(var(--primary)/0.06)]",
                            state === "selected" &&
                              "-translate-y-0.5 border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.1)] shadow-[0_0_26px_-8px_rgb(var(--primary)/0.6)]",
                            state === "correct" &&
                              "border-[rgb(var(--success))] bg-[rgb(var(--success)/0.12)] shadow-[0_0_26px_-10px_rgb(var(--success)/0.7)]",
                            state === "wrong" &&
                              "border-[rgb(var(--error))] bg-[rgb(var(--error)/0.1)]",
                            state === "muted" &&
                              "border-[rgb(var(--border)/0.6)] bg-[rgb(var(--card))] opacity-50",
                          )}
                        >
                          {/* Guía de acento a la izquierda del estado seleccionado */}
                          <span
                            aria-hidden
                            className={classNames(
                              "absolute inset-y-2 left-0 w-[3px] rounded-full transition-opacity",
                              state === "selected" &&
                                "bg-[rgb(var(--primary))] opacity-100",
                              state === "correct" &&
                                "bg-[rgb(var(--success))] opacity-100",
                              state === "wrong" &&
                                "bg-[rgb(var(--error))] opacity-100",
                              (state === "idle" || state === "muted") &&
                                "opacity-0",
                            )}
                          />

                          {/* Letra A/B/C/D */}
                          <span
                            className={classNames(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-black transition-colors",
                              state === "idle" &&
                                "border-[rgb(var(--border))] text-[rgb(var(--secondary-text))] group-hover:border-[rgb(var(--primary)/0.6)] group-hover:text-[rgb(var(--primary))]",
                              state === "selected" &&
                                "border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-[rgb(var(--button-text))]",
                              state === "correct" &&
                                "border-[rgb(var(--success))] bg-[rgb(var(--success))] text-[rgb(var(--button-text))]",
                              state === "wrong" &&
                                "border-[rgb(var(--error))] bg-[rgb(var(--error))] text-[rgb(var(--button-text))]",
                              state === "muted" &&
                                "border-[rgb(var(--border))] text-[rgb(var(--secondary-text))]",
                            )}
                          >
                            {String.fromCharCode(65 + index)}
                          </span>

                          {/* Texto de la opción */}
                          <span className="min-w-0 flex-1 text-[15px] font-medium leading-snug text-[rgb(var(--text))] md:text-base">
                            {option}
                          </span>

                          {/* Indicador de selección / resultado */}
                          <span className="shrink-0">
                            {settled ? (
                              state === "correct" ? (
                                <CheckCircle2
                                  size={20}
                                  className="text-[rgb(var(--success))]"
                                />
                              ) : state === "wrong" ? (
                                <XCircle
                                  size={20}
                                  className="text-[rgb(var(--error))]"
                                />
                              ) : (
                                <span className="block h-5 w-5" />
                              )
                            ) : (
                              <span
                                className={classNames(
                                  "flex h-5 w-5 items-center justify-center border-2 transition-colors",
                                  isMultiple ? "rounded-md" : "rounded-full",
                                  isSelected
                                    ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-[rgb(var(--button-text))]"
                                    : "border-[rgb(var(--border))] group-hover:border-[rgb(var(--primary)/0.6)]",
                                )}
                              >
                                {isSelected &&
                                  (isMultiple ? (
                                    <Check size={13} strokeWidth={3} />
                                  ) : (
                                    <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--button-text))]" />
                                  ))}
                              </span>
                            )}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Enviar respuesta + guardar para después */}
              {isCorrect === null && (
                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={toggleSaved}
                    className={classNames(
                      "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3.5 text-sm font-semibold transition-colors",
                      saved
                        ? "border-[rgb(var(--primary)/0.5)] text-[rgb(var(--primary))]"
                        : "border-[rgb(var(--border))] text-[rgb(var(--secondary-text))] hover:border-[rgb(var(--primary)/0.4)] hover:text-[rgb(var(--text))]",
                    )}
                  >
                    {saved ? (
                      <BookmarkCheck size={16} />
                    ) : (
                      <Bookmark size={16} />
                    )}
                    {saved
                      ? t("site.academyQuiz.saved")
                      : t("site.academyQuiz.saveForLater")}
                  </button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.99 }}
                    onClick={handleSubmit}
                    disabled={selectedOptions.length === 0}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[rgb(var(--button))] px-6 py-3.5 text-base font-black uppercase tracking-wide text-[rgb(var(--button-text))] shadow-[0_8px_24px_-12px_rgb(var(--primary)/0.45)] transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {t("site.academyQuiz.submit")}
                    <ArrowRight size={17} />
                  </motion.button>
                </div>
              )}

              {/* Feedback */}
              <AnimatePresence>
                {isCorrect !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-7 space-y-4"
                  >
                    {isCorrect ? (
                      <div className="relative overflow-hidden rounded-2xl border border-[rgb(var(--success)/0.4)] bg-[rgb(var(--success)/0.1)] p-5">
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--success)/0.18)] text-[rgb(var(--success))]">
                            <CheckCircle2 size={22} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-lg font-black text-[rgb(var(--text))]">
                              {t("site.academyQuiz.correctTitle")}
                            </p>
                            <p className="mt-0.5 text-sm text-[rgb(var(--secondary-text))]">
                              {t("site.academyQuiz.correctSubtitle")}
                            </p>
                          </div>
                        </div>

                        {(xpGained > 0 || coinsGained > 0) && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              delay: 0.15,
                              type: "spring",
                              stiffness: 220,
                              damping: 18,
                            }}
                            className="mt-4 flex flex-wrap gap-2"
                          >
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.12)] px-3 py-1.5 text-sm font-black text-[rgb(var(--primary-text))]">
                              <Zap size={14} /> +{xpGained} XP
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.12)] px-3 py-1.5 text-sm font-black text-[rgb(var(--primary-text))]">
                              <Coins size={14} /> +{coinsGained}
                            </span>
                          </motion.div>
                        )}

                        <div
                          aria-hidden
                          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[rgb(var(--success)/0.25)] blur-3xl"
                        />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-[rgb(var(--error)/0.4)] bg-[rgb(var(--error)/0.08)] p-5">
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--error)/0.16)] text-[rgb(var(--error-text))]">
                            <XCircle size={22} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-lg font-black text-[rgb(var(--text))]">
                              {t("site.academyQuiz.incorrectTitle")}
                            </p>
                            <p className="mt-0.5 text-sm text-[rgb(var(--secondary-text))]">
                              {t("site.academyQuiz.incorrectSubtitle")}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {showExplanation && revealedExplanation && (
                      <div className="rounded-xl border-l-2 border-[rgb(var(--primary))] bg-[rgb(var(--border)/0.18)] p-4">
                        <p className="mb-1 text-[0.7rem] font-black uppercase tracking-[0.08em] text-[rgb(var(--primary))]">
                          {t("site.academyQuiz.explanation")}
                        </p>
                        <p className="text-sm leading-relaxed text-[rgb(var(--text))]">
                          {revealedExplanation}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navegación */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {currentQuestionIndex > 0 && (
                <button
                  type="button"
                  aria-label={t("common.previous")}
                  onClick={() => goToQuestion(currentQuestionIndex - 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--border))] px-3.5 py-2.5 text-sm font-bold text-[rgb(var(--secondary-text))] transition-colors hover:border-[rgb(var(--primary)/0.5)] hover:text-[rgb(var(--text))]"
                >
                  <ChevronLeft size={16} />
                </button>
              )}

              {!isLastQuestion && isCorrect && (
                <button
                  type="button"
                  onClick={() => goToQuestion(currentQuestionIndex + 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[rgb(var(--button))] px-5 py-2.5 text-sm font-black uppercase tracking-wide text-[rgb(var(--button-text))] transition hover:brightness-110"
                >
                  {t("site.academyQuiz.nextQuestion")}
                  <ChevronRight size={16} />
                </button>
              )}

              {isCorrect === false && (
                <button
                  type="button"
                  onClick={resetQuiz}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--border))] px-4 py-2.5 text-sm font-bold text-[rgb(var(--text))] transition-colors hover:border-[rgb(var(--primary)/0.5)]"
                >
                  <RotateCcw size={15} />
                  {t("site.academyQuiz.retry")}
                </button>
              )}

              <div className="ml-auto flex flex-wrap items-center gap-3">
                {exercise.prevExerciseId && exercise.prevExerciseType && (
                  <Link
                    href={exercisePath(
                      exercise.prevExerciseId,
                      exercise.prevExerciseType,
                    )}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--border))] px-4 py-2.5 text-sm font-bold text-[rgb(var(--secondary-text))] transition-colors hover:text-[rgb(var(--text))]"
                  >
                    <Rewind size={15} />
                    {t("site.previousMissionButton")}
                  </Link>
                )}

                {showCompletionCta &&
                  (exercise.nextExerciseId && exercise.nextExerciseType ? (
                    <Link
                      href={exercisePath(
                        exercise.nextExerciseId,
                        exercise.nextExerciseType,
                      )}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[rgb(var(--button))] px-5 py-2.5 text-sm font-black uppercase tracking-wide text-[rgb(var(--button-text))] transition hover:brightness-110"
                    >
                      {t("site.nextMissionButton")}
                      <FastForward size={15} />
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[rgb(var(--button))] px-5 py-2.5 text-sm font-black uppercase tracking-wide text-[rgb(var(--button-text))] transition hover:brightness-110"
                    >
                      {t("site.courseCompleteButton")}
                      <FastForward size={15} />
                    </Link>
                  ))}
              </div>
            </div>

            <div className="mt-8">
              <ContentDiscussion target={{ exerciseId: id }} />
            </div>
          </div>

          {/* ---------- Riel de progreso ---------- */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
              <p className="text-sm font-black text-[rgb(var(--text))]">
                {t("site.academyQuiz.yourProgress")}
              </p>

              <div className="mt-4 flex items-center gap-4">
                <ProgressRing percent={percent} />
                <div className="min-w-0">
                  {exercise.title && (
                    <p className="truncate text-sm font-bold text-[rgb(var(--text))]">
                      {exercise.title}
                    </p>
                  )}
                  <p className="text-xs text-[rgb(var(--secondary-text))]">
                    {t("site.questionOfTotal", {
                      current: currentQuestionIndex + 1,
                      total,
                    })}
                  </p>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgb(var(--border))]">
                <div
                  className="h-full rounded-full bg-[rgb(var(--primary))] transition-all duration-500"
                  style={{ width: `${Math.max(percent, answered > 0 ? 8 : 0)}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
              <ul className="space-y-2.5 text-sm">
                <Step
                  done={isCorrect !== null}
                  label={t("site.academyQuiz.stepAnswer")}
                />
                <Step
                  done={showExplanation}
                  label={t("site.academyQuiz.stepReveal")}
                />
                <Step
                  done={completed || (isCorrect === true && isLastQuestion)}
                  label={t("site.academyQuiz.stepContinue")}
                />
              </ul>
            </div>

            {(xpGained > 0 || coinsGained > 0) && (
              <div className="rounded-2xl border border-[rgb(var(--primary)/0.35)] bg-[rgb(var(--primary)/0.06)] p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-[rgb(var(--text))]">
                    {t("site.academyQuiz.reward")}
                  </p>
                  <span className="text-[0.66rem] font-semibold uppercase tracking-wide text-[rgb(var(--secondary-text))]">
                    {t("site.academyQuiz.rewardHint")}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.12)] px-3 py-1.5 text-sm font-black text-[rgb(var(--primary-text))]">
                    <Zap size={14} /> +{xpGained} XP
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.12)] px-3 py-1.5 text-sm font-black text-[rgb(var(--primary-text))]">
                    <Coins size={14} /> +{coinsGained}
                  </span>
                </div>
              </div>
            )}

            <CalloutBlock
              variant="tip"
              title={t("site.academyQuiz.tipTitle")}
              markdown={t("site.academyQuiz.tipBody")}
            />

            {lessonHref && (
              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
                <p className="flex items-center gap-2 text-sm font-black text-[rgb(var(--text))]">
                  <BookOpen size={15} className="text-[rgb(var(--primary))]" />
                  {t("site.academyQuiz.needReview")}
                </p>
                <p className="mt-1 text-xs text-[rgb(var(--secondary-text))]">
                  {t("site.academyQuiz.needReviewBody")}
                </p>
                <Link
                  href={lessonHref}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] px-3.5 py-2 text-xs font-bold text-[rgb(var(--text))] transition-colors hover:border-[rgb(var(--primary)/0.5)]"
                >
                  {t("site.academyQuiz.goToLesson")}
                  <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="rgb(var(--border))"
          strokeWidth="6"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="rgb(var(--primary))"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-[rgb(var(--text))]">
        {clamped}%
      </span>
    </div>
  );
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5">
      {done ? (
        <CheckCircle2 size={16} className="shrink-0 text-[rgb(var(--success))]" />
      ) : (
        <Circle size={16} className="shrink-0 text-[rgb(var(--border))]" />
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
