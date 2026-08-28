"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { fetcher } from "../../../../../../utils/fetcher";
import { useReward } from "../../../../../../contexts/RewardContext";
import { QuizExercise } from "../../../../../../src/types/exercise";
import {
  Zap,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  AlertTriangle,
  Terminal,
  ShieldAlert,
  Coins,
  FastForward,
  Rewind,
} from "lucide-react";
import { useTranslation } from "../../../../../../src/i18n/useTranslation";
import { ContentDiscussion } from "@/features/courses/components/content-discussion";
import { exercisePath } from "@/shared/utils/exercise-path";
import { useTrackToolUsed, trackToolAction } from "../../../../../../components/analytics/tool-tracking";

interface ExtendedQuizExercise extends QuizExercise {
  prevExerciseId?: string | null;
  nextExerciseId?: string | null;
}

export default function BrutalistQuizExercisePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showReward } = useReward();
  const t = useTranslation();
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
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
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
        const lang = localStorage.getItem("lang") || "es";
        const data = await fetcher(
          `/exercises/${id}?lang=${lang}&userId=${userId}`,
        );

        console.log("QUIZ DATA", data);

        if (data.type !== "QUIZ") {
          router.replace("/404");
          return;
        }

        setExercise(data as ExtendedQuizExercise);
        setCompleted(data.completed);
      } catch (err: any) {
        setErrorMessage(t("site.fileNotFoundError"));
      }
    };

    loadExercise();
  }, [id, router]);

  if (!authChecked || !exercise) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background))] text-[rgb(var(--text))] font-mono p-4">
        <div className="border-4 border-[rgb(var(--primary))] p-6 md:p-8 bg-[rgb(var(--card))] shadow-[8px_8px_0_0_rgb(var(--primary))] max-w-md w-full">
          <div className="flex items-center gap-4 mb-4 border-b-2 border-[rgb(var(--border))] pb-4">
            <Terminal
              className="animate-pulse text-[rgb(var(--primary))]"
              size={32}
            />
            <h2 className="text-lg md:text-xl font-bold uppercase tracking-widest text-[rgb(var(--primary))]">
              {t("site.bootingSystem")}
            </h2>
          </div>
          <div className="space-y-2 opacity-80 text-xs md:text-sm">
            <p>{t("site.verifyingCredentials")}</p>
            <p className="animate-pulse">
              &gt; {errorMessage || t("site.loadingMatrix")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  console.log("QUESTIONS", exercise.questions);

  const questions = exercise.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  if ((exercise as any).locked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-black text-white font-mono uppercase text-center p-6">
        <ShieldAlert size={48} className="text-[rgb(var(--primary))]" />
        <p className="text-xl max-w-md">{t("site.exerciseLockedMessage")}</p>
        <Link
          href="/premium"
          className="rounded-lg bg-[rgb(var(--primary))] px-6 py-3 font-black text-black normal-case"
        >
          {t("site.premiumTitle")}
        </Link>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white font-mono uppercase text-xl p-6 text-center">
        <ShieldAlert size={48} className="text-red-500 mb-4 md:mr-4 md:mb-0" />
        {t("site.emptyMission")}
      </div>
    );
  }

  const isMultiple = currentQuestion.isMultiple;
  const correctIndices = revealedCorrect;

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
    setErrorMessage(null);
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

      // Éxito = el backend proceso la respuesta y devolvió un resultado
      // válido (correcta o no) -- igual criterio que code_exercise.
      trackToolAction("quiz_exercise", "learning", "answer");

      setIsCorrect(res.correct);
      setRevealedCorrect(res.correctOptions || []);
      setRevealedExplanation(res.explanation || "");
      setShowExplanation(true);

      if (!res.correct || completed) return;

      setCompleted(true);
      const gainedXP = res.xpAdded || exercise.experience || 0;
      const gainedCoins = res.coinsAdded || exercise.coins || 0;
      setXpGained(gainedXP);
      setCoinsGained(gainedCoins);
      showReward({ xp: gainedXP, coins: gainedCoins });
    } catch (err: any) {
      setErrorMessage(t("site.networkErrorProgress"));
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--text))] selection:bg-[rgb(var(--primary))] selection:text-black relative overflow-x-hidden font-sans pb-10">
      {/* FONDO ANIMADO */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-6 md:pt-10">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 bg-[rgb(var(--card))] text-[rgb(var(--text))] px-4 py-2 font-black uppercase border-2 border-[rgb(var(--border))] shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_rgb(var(--primary))] transition-all text-sm"
          >
            <ArrowLeft
              size={18}
              className="group-hover:-translate-x-1 transition-transform"
            />
            {t("site.abortButton")}
          </button>

          <div className="w-full sm:w-auto bg-black text-[rgb(var(--primary))] border-2 border-[rgb(var(--primary))] px-3 py-1.5 font-mono text-[10px] md:text-xs tracking-widest shadow-[4px_4px_0_0_rgb(var(--primary))] uppercase overflow-hidden whitespace-nowrap">
            {t("site.liveSystemLabel", { id: id.slice(0, 8) })}
          </div>
        </div>

        {errorMessage && (
          <div className="bg-red-600 text-white border-4 border-black p-4 mb-6 font-black uppercase flex items-center gap-3 shadow-[6px_6px_0_0_#000] text-sm animate-pulse">
            <AlertTriangle size={24} className="shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* TITULO */}
        <div className="mb-8 md:mb-12">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-block bg-[rgb(var(--primary))] text-black font-black px-3 py-1 mb-4 transform -skew-x-12 border-2 border-black shadow-[3px_3px_0_0_#000] uppercase text-xs"
          >
            {t("site.questionOfTotal", { current: currentQuestionIndex + 1, total: questions.length })}
          </motion.div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-[0.95] drop-shadow-[3px_3px_0_rgb(var(--primary))]">
            {exercise.title}
          </h1>
        </div>

        {/* AREA DE PREGUNTAS */}
        <div className="bg-[rgb(var(--card))] border-4 border-[rgb(var(--border))] p-5 md:p-10 shadow-[8px_8px_0_0_#000] relative">
          <div className="absolute top-0 right-0 bg-[rgb(var(--border))] text-[rgb(var(--background))] px-2 py-1 text-[10px] font-mono font-bold border-l-2 border-b-2 border-black">
            {isMultiple ? t("site.multipleChoice") : t("site.singleChoice")}
          </div>

          <h2 className="text-xl md:text-3xl font-black uppercase text-[rgb(var(--text))] mb-8 leading-tight pt-2">
            {currentQuestion.question}
          </h2>

          <div className="grid gap-3 md:gap-4">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedOptions.includes(index);
              const isCorrectOption = correctIndices.includes(index);

              let optionClasses =
                "w-full p-4 md:p-5 text-left border-4 transition-all duration-200 font-bold text-base md:text-lg flex items-start gap-4 ";

              if (isCorrect !== null) {
                if (isCorrectOption) {
                  optionClasses +=
                    "border-green-500 bg-green-500/10 text-green-500 shadow-[4px_4px_0_0_#22c55e]";
                } else if (isSelected) {
                  optionClasses +=
                    "border-red-600 bg-red-600/10 text-red-600 shadow-[4px_4px_0_0_#dc2626] line-through";
                } else {
                  optionClasses +=
                    "border-[rgb(var(--border))] opacity-40 grayscale";
                }
              } else if (isSelected) {
                optionClasses +=
                  "border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-black shadow-[4px_4px_0_0_#000] -translate-y-1";
              } else {
                optionClasses +=
                  "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:border-[rgb(var(--primary))] shadow-[4px_4px_0_0_#000] hover:-translate-y-1 cursor-pointer";
              }

              return (
                <button
                  key={index}
                  onClick={() => toggleOption(index)}
                  disabled={isCorrect !== null}
                  className={optionClasses}
                >
                  <div
                    className={`mt-1 shrink-0 w-5 h-5 border-2 border-current flex items-center justify-center ${isSelected ? "bg-current" : ""}`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 bg-[rgb(var(--card))]"></div>
                    )}
                  </div>
                  <span className="leading-snug">{option}</span>
                </button>
              );
            })}
          </div>

          {isCorrect === null && (
            <motion.button
              whileTap={{ y: 2, boxShadow: "0px 0px 0px 0px #000" }}
              onClick={handleSubmit}
              disabled={selectedOptions.length === 0}
              className="mt-8 w-full bg-red-600 text-white font-black text-xl md:text-2xl uppercase py-4 border-4 border-black shadow-[6px_6px_0_0_#000] disabled:opacity-50 transition-colors"
            >
              {t("site.executeCodeButton")}
            </motion.button>
          )}

          {/* RESULTADO */}
          <AnimatePresence>
            {isCorrect !== null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8 pt-8 border-t-4 border-[rgb(var(--border))]"
              >
                {isCorrect ? (
                  <div className="bg-black p-4 border-4 border-[rgb(var(--primary))] text-center">
                    <h3 className="text-2xl md:text-4xl font-black uppercase text-[rgb(var(--primary))] mb-4 italic">
                      {t("site.breachClearedTitle")}
                    </h3>
                    <div className="flex flex-wrap justify-center gap-3 md:gap-6">
                      <div className="bg-[rgb(var(--card))] border-2 border-[rgb(var(--primary))] px-4 py-2 flex items-center gap-2 transform -rotate-1">
                        <Zap className="text-[rgb(var(--primary))]" size={20} />
                        <span className="text-[rgb(var(--text))] font-black text-lg">
                          +{xpGained} XP
                        </span>
                      </div>
                      <div className="bg-[rgb(var(--card))] border-2 border-yellow-400 px-4 py-2 flex items-center gap-2 transform rotate-1">
                        <Coins className="text-yellow-400" size={20} />
                        <span className="text-[rgb(var(--text))] font-black text-lg">
                          +{coinsGained} {t("site.chipsUnit")}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-600 p-6 border-4 border-black text-center text-white">
                    <h3 className="text-2xl font-black uppercase mb-1">
                      {t("site.accessDeniedTitle")}
                    </h3>
                    <p className="font-mono text-xs opacity-90 tracking-tighter">
                      {t("site.errorCodeRetry")}
                    </p>
                  </div>
                )}

                {showExplanation && revealedExplanation && (
                  <div className="mt-6 bg-[rgb(var(--border))] bg-opacity-20 border-l-8 border-[rgb(var(--primary))] p-4 font-mono text-[rgb(var(--text))] text-sm md:text-base">
                    <p className="font-bold uppercase text-[10px] mb-2 opacity-50">
                      {t("site.logDecryptedLabel")}
                    </p>
                    <p>{revealedExplanation}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* NAVEGACIÓN */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-between items-stretch">
          <div className="flex gap-3">
            {currentQuestionIndex > 0 && (
              <button
                onClick={() => {
                  setCurrentQuestionIndex(currentQuestionIndex - 1);
                  resetQuestionState();
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-transparent text-[rgb(var(--text))] px-4 py-3 font-bold uppercase border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--text))] hover:text-[rgb(var(--background))] transition-colors text-sm"
              >
                <ChevronLeft size={18} />
              </button>
            )}

            {currentQuestionIndex < questions.length - 1 && isCorrect && (
              <button
                onClick={() => {
                  setCurrentQuestionIndex(currentQuestionIndex + 1);
                  resetQuestionState();
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[rgb(var(--primary))] text-black px-6 py-3 font-black uppercase border-2 border-black shadow-[4px_4px_0_0_#000] text-sm"
              >
                {t("common.next")} <ChevronRight size={18} />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {exercise.prevExerciseId && exercise.prevExerciseType && (
              <Link
                href={exercisePath(exercise.prevExerciseId, exercise.prevExerciseType)}
                className="w-full"
              >
                <button className="w-full flex items-center justify-center gap-2 bg-black text-white px-4 py-3 font-black uppercase border-2 border-[rgb(var(--border))] text-sm">
                  <Rewind size={18} /> {t("site.previousMissionButton")}
                </button>
              </Link>
            )}

            {(completed || isCorrect) &&
            currentQuestionIndex === questions.length - 1 ? (
              exercise.nextExerciseId && exercise.nextExerciseType ? (
                <Link
                  href={exercisePath(exercise.nextExerciseId, exercise.nextExerciseType)}
                  className="w-full"
                >
                  <button className="w-full flex items-center justify-center gap-2 bg-[rgb(var(--primary))] text-black px-6 py-3 font-black uppercase border-2 border-black shadow-[4px_4px_0_0_#000] text-sm animate-bounce sm:animate-none">
                    {t("site.nextMissionButton")} <FastForward size={18} />
                  </button>
                </Link>
              ) : (
                <Link href="/dashboard" className="w-full">
                  <button className="w-full flex items-center justify-center gap-2 bg-[rgb(var(--primary))] text-black px-6 py-3 font-black uppercase border-2 border-black shadow-[4px_4px_0_0_#000] text-sm">
                    {t("site.courseCompleteButton")} <FastForward size={18} />
                  </button>
                </Link>
              )
            ) : (
              isCorrect === false && (
                <button
                  onClick={resetQuiz}
                  className="w-full flex items-center justify-center gap-2 bg-black text-white px-6 py-3 font-black uppercase border-2 border-white/20 shadow-[4px_4px_0_0_#000] text-sm"
                >
                  <RotateCcw size={18} /> {t("site.retryButton")}
                </button>
              )
            )}
          </div>

          <ContentDiscussion target={{ exerciseId: id }} />
        </div>
      </div>
    </div>
  );
}
