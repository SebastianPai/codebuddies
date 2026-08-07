"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../../utils/api";
import { useAuth } from "../../../../hooks/useAuth";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { TranslationsForm, type Translation } from "@/shared/ui";
import CommonFields from "./components/CommonFields";
import CodeExerciseForm from "./components/CodeExerciseForm";
import QuizExerciseForm from "./components/QuizExerciseForm";

import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Code as CodeIcon,
  ListChecks,
} from "lucide-react";

import {
  Code,
  InstructionElement,
  QuizQuestion,
  AdminExerciseResponse,
} from "./types";
import { useTranslation } from "../../../../src/i18n/useTranslation";

export default function AdminExerciseNew({
  exerciseId,
}: {
  exerciseId?: string;
}) {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const t = useTranslation();

  const [lessonId, setLessonId] = useState("");
  const [lessons, setLessons] = useState<{ id: string; title: string }[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(true);

  const [type, setType] = useState<"CODE" | "QUIZ" | "VIDEO_THEORY" | "LIVE">(
    "CODE",
  );
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">(
    "PUBLISHED",
  );
  const [experience, setExperience] = useState(10);
  const [coins, setCoins] = useState(5);
  const [order, setOrder] = useState<number | "">(1);

  const [translations, setTranslations] = useState<Translation[]>([
    { languageCode: "es", title: "", description: "" },
  ]);

  const [codes, setCodes] = useState<Code[]>([
    { language: "javascript", initialCode: "", expectedCode: "" },
  ]);

  const [instructionsByLang, setInstructionsByLang] = useState<
    Record<string, InstructionElement[]>
  >({
    es: [{ type: "text", value: "" }],
  });

  const [quizByLang, setQuizByLang] = useState<Record<string, QuizQuestion[]>>({
    es: [
      {
        question: "",
        options: ["", "", "", ""],
        correct: [0],
        isMultiple: false,
        explanation: "",
      },
    ],
  });

  const [loading, setLoading] = useState(false);

  // Clonar contenido base entre idiomas cuando cambian las traducciones
  useEffect(() => {
    function cloneInstructionElement(
      el: InstructionElement,
    ): InstructionElement {
      switch (el.type) {
        case "text":
          return { type: "text", value: el.value };
        case "code":
          return { type: "code", value: el.value, language: el.language };
        case "image":
          return { type: "image", value: el.value };
        case "video":
          return { type: "video", value: el.value };
        default:
          return { type: "text", value: "" };
      }
    }

    function cloneInstructionElements(
      elements: InstructionElement[],
    ): InstructionElement[] {
      return elements.map(cloneInstructionElement);
    }

    setInstructionsByLang((prev) => {
      const updated = { ...prev };
      const baseLang = translations[0]?.languageCode || "es";
      const baseInstructions = prev[baseLang] || [{ type: "text", value: "" }];

      translations.forEach((t) => {
        if (!updated[t.languageCode]) {
          updated[t.languageCode] = cloneInstructionElements(baseInstructions);
        }
      });
      return updated;
    });

    setQuizByLang((prev) => {
      const updated = { ...prev };
      const baseLang = translations[0]?.languageCode || "es";
      const baseQuiz = prev[baseLang] || [
        {
          question: "",
          options: ["", "", "", ""],
          correct: [0],
          isMultiple: false,
          explanation: "",
        },
      ];

      translations.forEach((t) => {
        if (!updated[t.languageCode]) {
          updated[t.languageCode] = baseQuiz.map((q) => ({ ...q }));
        }
      });
      return updated;
    });
  }, [translations]);

  // Cargar lecciones
  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const data = await api.get<{ id: string; title: string }[]>("/lessons");
        setLessons(data);
        if (data.length > 0) setLessonId(data[0].id);
      } catch {
        toast.error(t("admin.loadLessonsError"));
      } finally {
        setLoadingLessons(false);
      }
    };
    fetchLessons();
  }, []);

  // Cargar ejercicio en modo edición
  useEffect(() => {
    if (!exerciseId) return;

    const fetchExercise = async () => {
      try {
        const ex = await api.get<AdminExerciseResponse>(
          `/exercises/${exerciseId}?lang=es`,
        );

        setLessonId(ex.lessonId);
        setType(ex.type);
        setStatus(ex.status ?? "PUBLISHED");
        setExperience(ex.experience);
        setCoins(ex.coins);
        setOrder(ex.order);

        if (ex.translations) {
          setTranslations(
            ex.translations.map((t) => ({
              languageCode: t.language.code,
              title: t.title,
              description: t.description ?? "",
            })),
          );

          const instructions: Record<string, InstructionElement[]> = {};
          ex.translations.forEach((t) => {
            instructions[t.language.code] = t.content?.instructionElements ?? [
              { type: "text", value: "" },
            ];
          });
          setInstructionsByLang(instructions);
        }

        if (ex.codes) {
          setCodes(
            ex.codes.map((c) => ({
              language: c.language,
              initialCode: c.initialCode,
              expectedCode: c.expectedCode ?? "",
            })),
          );
        }
      } catch {
        toast.error(t("admin.loadExerciseError"));
      }
    };

    fetchExercise();
  }, [exerciseId]);

  // Protección admin
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "ADMIN")) {
      toast.error(t("admin.adminOnlyAccessDenied"));
      router.push("/admin");
    }
  }, [authLoading, isAuthenticated, user, router]);

  const handleSave = async () => {
    if (translations.some((tr) => !tr.title.trim())) {
      toast.error(t("admin.completeTitleAllLanguages"));
      return;
    }

    if (!lessonId) {
      toast.error(t("admin.selectLessonError"));
      return;
    }

    setLoading(true);

    try {
      const translationsPayload = translations.map((translation) => {
        let content: any = null;

        if (type === "CODE" || type === "VIDEO_THEORY") {
          const elements = instructionsByLang[translation.languageCode] || [];
          const filtered = elements.filter((el) => el.value.trim());
          content = { instructionElements: filtered };
        }

        if (type === "QUIZ") {
          const qs = quizByLang[translation.languageCode] || [];
          const valid = qs.filter(
            (q) =>
              q.question.trim() &&
              q.correct.length > 0 &&
              q.options.some((o) => o.trim()),
          );

          if (valid.length === 0)
            throw new Error(t("admin.noValidQuestionsInLang", { lang: translation.languageCode }));

          content = { questions: valid };
        }

        return {
          languageCode: translation.languageCode,
          title: translation.title.trim(),
          description: translation.description?.trim() || undefined,
          content,
        };
      });

      const payload: any = {
        lessonId,
        type,
        status,
        experience,
        coins,
        translations: translationsPayload,
      };

      if (order !== "") payload.order = Number(order);

      if (type === "CODE") {
        const validCodes = codes.filter((c) => c.initialCode.trim());
        if (validCodes.length === 0) throw new Error(t("admin.missingInitialCode"));

        payload.codes = validCodes.map((c) => ({
          language: c.language,
          initialCode: c.initialCode,
          expectedCode: c.expectedCode?.trim() || undefined,
        }));
      }

      if (exerciseId) {
        await api.patch(`/exercises/${exerciseId}`, payload);
        toast.success(t("admin.exerciseUpdatedToast"));
      } else {
        await api.post("/exercises", payload);
        toast.success(t("admin.exerciseCreatedToast"));
      }

      setTimeout(() => router.push("/admin/exercises"), 1500);
    } catch (err: any) {
      toast.error(err.message || t("admin.saveExerciseError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10 space-y-8">
      <ToastContainer theme="dark" position="top-right" autoClose={4000} />

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-yellow-400 flex items-center gap-3">
            {type === "CODE" ? (
              <CodeIcon size={28} />
            ) : (
              <ListChecks size={28} />
            )}
            {exerciseId ? t("admin.editExerciseTitle") : t("admin.newExerciseTitle")}
          </h1>
          <p className="text-zinc-400 mt-1">
            {exerciseId
              ? t("admin.editExerciseDescription")
              : t("admin.createExerciseDescription")}
          </p>
        </div>

        <button
          onClick={() => router.push("/admin/exercises")}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft size={16} />
          {t("common.back")}
        </button>
      </div>

      <form className="space-y-8">
        {/* Campos comunes */}
        <div className="bg-[#111] border border-zinc-800 rounded-lg p-6">
          <CommonFields
            type={type}
            status={status}
            experience={experience}
            coins={coins}
            order={order}
            lessonId={lessonId}
            lessons={lessons}
            onChangeType={(e) => setType(e.target.value as any)}
            onChangeStatus={(e) => setStatus(e.target.value as any)}
            onChangeExperience={(e) =>
              setExperience(Number(e.target.value) || 10)
            }
            onChangeCoins={(e) => setCoins(Number(e.target.value) || 5)}
            onChangeOrder={(e) =>
              setOrder(e.target.value === "" ? "" : Number(e.target.value))
            }
            onChangeLesson={(e) => setLessonId(e.target.value)}
          />
        </div>

        {/* Traducciones básicas (título + descripción) */}
        <div className="bg-[#111] border border-zinc-800 rounded-lg p-6">
          <TranslationsForm
            translations={translations}
            onChange={setTranslations}
            showContent={false}
          />
        </div>

        {/* Formularios específicos por tipo */}
        {(type === "CODE" || type === "VIDEO_THEORY") && (
          <div className="space-y-8">
            {translations.map((translation) => (
              <div
                key={translation.languageCode}
                className="bg-[#111] border border-zinc-800 rounded-lg p-6"
              >
                <h3 className="text-lg font-semibold text-yellow-400 mb-4">
                  {t("admin.instructionsForLang", { lang: translation.languageCode.toUpperCase() })}
                </h3>
                <CodeExerciseForm
                  codes={codes}
                  instructionElements={instructionsByLang[translation.languageCode] || []}
                  setCodes={setCodes}
                  setInstructionElements={(updater) => {
                    setInstructionsByLang((prev) => {
                      const current = prev[translation.languageCode] || [];
                      const updated =
                        typeof updater === "function"
                          ? updater(current)
                          : updater;
                      return { ...prev, [translation.languageCode]: updated };
                    });
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {type === "QUIZ" && (
          <div className="space-y-8">
            {translations.map((translation) => (
              <div
                key={translation.languageCode}
                className="bg-[#111] border border-zinc-800 rounded-lg p-6"
              >
                <h3 className="text-lg font-semibold text-yellow-400 mb-4">
                  {t("admin.quizQuestionsForLang", { lang: translation.languageCode.toUpperCase() })}
                </h3>
                <QuizExerciseForm
                  questions={quizByLang[translation.languageCode] || []}
                  setQuestions={(updater) => {
                    setQuizByLang((prev) => {
                      const current = prev[translation.languageCode] || [];
                      const updated =
                        typeof updater === "function"
                          ? updater(current)
                          : updater;
                      return { ...prev, [translation.languageCode]: updated };
                    });
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || loadingLessons}
            className="flex items-center gap-2 bg-yellow-400 text-black px-6 py-3 rounded-md font-medium hover:bg-yellow-300 transition disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {exerciseId ? t("admin.updatingButton") : t("admin.creatingButton")}
              </>
            ) : (
              <>
                <Save size={18} />
                {exerciseId ? t("common.saveChanges") : t("admin.createExerciseButton")}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => router.push("/admin/exercises")}
            className="text-zinc-400 hover:text-white text-sm"
          >
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
