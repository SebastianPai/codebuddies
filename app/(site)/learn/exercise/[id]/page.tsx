"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetcher } from "../../../../../utils/fetcher";
import { QuizExercise, QuizQuestion } from "../../../../../src/types/exercise";
import {
  Zap,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../../../../hooks/useAuth"; // Ajusta la ruta según tu estructura
import { useTranslation } from "../../../../../src/i18n/useTranslation";

export default function QuizExercisePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const t = useTranslation();

  const [exercise, setExercise] = useState<QuizExercise | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [coinsGained, setCoinsGained] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Protección temprana: si no hay auth → redirigir
    if (!authLoading && !isAuthenticated) {
      console.warn("[Quiz] No autenticado. Redirigiendo...");
      setErrorMessage(t("site.sessionInvalidRedirect"));
      setTimeout(() => router.replace("/login"), 1200);
      return;
    }

    if (authLoading || !isAuthenticated || !user?.userId) return;

    const loadExercise = async () => {
      try {
        setErrorMessage(null);
        const lang = localStorage.getItem("lang") || "es";

        console.log(
          "[Quiz] Cargando con userId:",
          user.userId,
          "y lang:",
          lang,
        );

        const data = await fetcher(
          `/exercises/${id}?lang=${lang}&userId=${user.userId}`,
        );

        if (data.type !== "QUIZ") {
          router.replace("/404");
          return;
        }

        setExercise(data as QuizExercise);
        setCompleted(data.completed);
      } catch (err: any) {
        console.error("[Quiz] Error cargando:", err);
        setErrorMessage(t("site.exerciseLoadError"));
      }
    };

    loadExercise();
  }, [id, router, authLoading, isAuthenticated, user?.userId]);

  // Pantalla de carga / verificación de sesión
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background))]">
        <div className="text-center space-y-6">
          <Zap
            className="animate-spin mx-auto text-[rgb(var(--primary))]"
            size={64}
          />
          <p className="text-2xl font-bold text-white">{t("site.verifyingSession")}</p>
          <p className="text-gray-400">{t("site.pleaseWaitMoment")}</p>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen p-10 flex items-center justify-center text-xl text-white">
        {t("site.loadingQuiz")}
      </div>
    );
  }

  const questions = exercise.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  if (!currentQuestion) {
    return (
      <div className="min-h-screen p-10 flex items-center justify-center text-xl text-white">
        {t("site.noQuestionsAvailable")}
      </div>
    );
  }

  const isMultiple = currentQuestion.isMultiple;
  const correctIndices = currentQuestion.correct || [];

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

    const userAnswered = selectedOptions.sort((a, b) => a - b);
    const sortedCorrect = [...correctIndices].sort((a, b) => a - b);
    const isRight =
      JSON.stringify(userAnswered) === JSON.stringify(sortedCorrect);

    setIsCorrect(isRight);
    setShowExplanation(true);

    if (!isRight || completed) return;

    if (!user?.userId) {
      setErrorMessage(t("site.sessionLostRedirect"));
      setTimeout(() => router.push("/login"), 1500);
      return;
    }

    console.log("[Submit] Enviando progreso con userId:", user.userId);

    try {
      const res = await fetcher("/progress", {
        method: "POST",
        body: JSON.stringify({
          userId: user.userId,
          lessonId: exercise.lessonId,
          exerciseId: exercise.id,
        }),
      });

      setCompleted(true);
      const gainedXP = res.xpAdded || res.xp || exercise.experience || 0;
      const gainedCoins = res.coinsAdded || exercise.coins || 0;
      setXpGained(gainedXP);
      setCoinsGained(gainedCoins);
      setErrorMessage(null);
    } catch (err: any) {
      console.error("[Submit] Error:", err);
      const msg = err.message?.includes("Not Found")
        ? t("site.progressSaveError")
        : t("site.saveErrorGeneric");
      setErrorMessage(msg);
    }
  };

  const goBackToCourse = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] p-6 md:p-10 relative">
      {/* Botón Volver al curso */}
      <button
        onClick={goBackToCourse}
        className="absolute top-6 left-6 flex items-center gap-3 px-6 py-3 bg-gray-900 hover:bg-gray-800 rounded-lg text-white font-medium transition-colors z-10 shadow-lg"
      >
        <ArrowLeft size={22} />
        {t("site.backToCourse")}
      </button>

      <div className="max-w-3xl mx-auto space-y-8 pt-20">
        {errorMessage && (
          <div className="bg-red-900/70 border border-red-500 p-5 rounded-xl flex items-start gap-4 text-red-100">
            <AlertTriangle size={28} className="mt-1 flex-shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <div>
          <h1 className="text-4xl font-black">{exercise.title}</h1>
          {exercise.description && (
            <p className="text-lg italic mt-3 opacity-90">
              {exercise.description}
            </p>
          )}
        </div>

        {questions.length > 1 && (
          <div className="text-center text-gray-400 font-medium">
            {t("site.questionOfTotal", { current: currentQuestionIndex + 1, total: questions.length })}
          </div>
        )}

        <div className="space-y-8">
          <h2 className="text-3xl font-bold">{currentQuestion.question}</h2>

          <div className="space-y-5">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedOptions.includes(index);
              const isCorrectOption = correctIndices.includes(index);

              let className =
                "w-full p-5 text-left border-2 rounded-xl transition-all cursor-pointer text-lg font-medium";

              if (isCorrect !== null) {
                if (isCorrectOption) {
                  className +=
                    " border-green-500 bg-green-900/40 text-green-200";
                } else if (isSelected) {
                  className += " border-red-500 bg-red-900/40 text-red-200";
                }
              } else if (isSelected) {
                className +=
                  " border-[rgb(var(--primary))] bg-[rgb(var(--primary))]/30 text-white";
              } else {
                className +=
                  " border-gray-700 hover:border-gray-500 bg-gray-900/50 hover:bg-gray-800";
              }

              return (
                <button
                  key={index}
                  onClick={() => toggleOption(index)}
                  disabled={isCorrect !== null}
                  className={className}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {isCorrect === null ? (
            <button
              onClick={handleSubmit}
              disabled={selectedOptions.length === 0}
              className="w-full bg-[rgb(var(--primary))] text-black font-black uppercase py-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed mt-8 text-xl shadow-xl hover:shadow-2xl transition-all"
            >
              {t("site.submitAnswerButton")}
            </button>
          ) : (
            <div className="text-center space-y-10 mt-12">
              {isCorrect ? (
                <>
                  <CheckCircle
                    size={110}
                    className="mx-auto text-green-500 animate-pulse"
                  />
                  <p className="text-5xl font-black text-green-400">
                    {t("site.correctExclamation")}
                  </p>

                  <div className="flex flex-col items-center gap-4 text-3xl font-bold">
                    <p className="text-yellow-400 animate-bounce">
                      +{xpGained} XP
                    </p>
                    <p className="text-green-400">+{coinsGained} coins</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle size={110} className="mx-auto text-red-500" />
                  <p className="text-5xl font-black text-red-400">{t("site.incorrectText")}</p>
                </>
              )}

              {showExplanation && currentQuestion.explanation && (
                <div className="bg-gray-900 p-8 rounded-2xl border border-gray-700 text-left max-w-2xl mx-auto">
                  <p className="text-2xl font-bold mb-4 text-white">
                    {t("site.explanationLabel")}
                  </p>
                  <p className="text-xl text-gray-300 leading-relaxed">
                    {currentQuestion.explanation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navegación */}
        {questions.length > 1 && (
          <div className="flex justify-between mt-12">
            <button
              onClick={() => {
                if (currentQuestionIndex > 0) {
                  setCurrentQuestionIndex(currentQuestionIndex - 1);
                  resetQuestionState();
                }
              }}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-3 px-8 py-4 bg-gray-900 hover:bg-gray-800 rounded-xl disabled:opacity-50 transition-colors font-bold text-lg"
            >
              <ChevronLeft size={26} />
              {t("common.previous")}
            </button>

            <button
              onClick={() => {
                if (currentQuestionIndex < questions.length - 1) {
                  setCurrentQuestionIndex(currentQuestionIndex + 1);
                  resetQuestionState();
                }
              }}
              disabled={currentQuestionIndex === questions.length - 1}
              className="flex items-center gap-3 px-8 py-4 bg-gray-900 hover:bg-gray-800 rounded-xl disabled:opacity-50 transition-colors font-bold text-lg"
            >
              {t("common.next")}
              <ChevronRight size={26} />
            </button>
          </div>
        )}

        {/* Botones finales */}
        {(isCorrect !== null || completed) && (
          <div className="flex flex-col sm:flex-row gap-6 justify-center mt-16">
            <button
              onClick={goBackToCourse}
              className="flex items-center justify-center gap-3 px-10 py-5 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold text-lg transition-colors"
            >
              <ArrowLeft size={24} />
              {t("site.backToCourse")}
            </button>

            {!completed && (
              <button
                onClick={resetQuiz}
                className="flex items-center justify-center gap-3 px-10 py-5 bg-[rgb(var(--primary))] hover:bg-opacity-90 text-black font-black uppercase rounded-xl text-lg transition-colors"
              >
                <RotateCcw size={24} />
                {t("site.retryQuizButton")}
              </button>
            )}
          </div>
        )}

        {completed && (
          <p className="text-center text-green-500 font-black text-3xl mt-12 animate-pulse">
            {t("site.exerciseCompletedMessage")}
          </p>
        )}
      </div>
    </div>
  );
}
