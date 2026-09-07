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
import { translateInstructions, translateQuiz } from "./lib/translate-content";

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
  const [contentSourceLang, setContentSourceLang] = useState<
    Record<string, string>
  >({});
  const [translatingContent, setTranslatingContent] = useState<string | null>(
    null,
  );

  const translateContentFor = async (targetLang: string) => {
    const others = translations
      .map((tr) => tr.languageCode)
      .filter((code) => code !== targetLang);
    const chosen = contentSourceLang[targetLang];
    const src = chosen && others.includes(chosen) ? chosen : others[0];
    if (!src) return;

    if (type === "QUIZ") {
      const hasContent = (quizByLang[targetLang] ?? []).some(
        (q) => q.question.trim() || q.options.some((o) => o.trim()),
      );
      if (
        hasContent &&
        !window.confirm(
          t("admin.translateContentOverwrite", {
            lang: targetLang.toUpperCase(),
          }),
        )
      ) {
        return;
      }
      setTranslatingContent(targetLang);
      try {
        const translated = await translateQuiz(
          quizByLang[src] ?? [],
          targetLang,
        );
        setQuizByLang((prev) => ({ ...prev, [targetLang]: translated }));
      } finally {
        setTranslatingContent(null);
      }
      return;
    }

    const hasContent = (instructionsByLang[targetLang] ?? []).some((el) =>
      el.value.trim(),
    );
    if (
      hasContent &&
      !window.confirm(
        t("admin.translateContentOverwrite", { lang: targetLang.toUpperCase() }),
      )
    ) {
      return;
    }
    setTranslatingContent(targetLang);
    try {
      const translated = await translateInstructions(
        instructionsByLang[src] ?? [],
        targetLang,
      );
      setInstructionsByLang((prev) => ({ ...prev, [targetLang]: translated }));
    } finally {
      setTranslatingContent(null);
    }
  };

  const renderTranslateBar = (targetLang: string) => {
    const others = translations
      .map((tr) => tr.languageCode)
      .filter((code) => code !== targetLang);
    if (others.length === 0) return null;
    const chosen = contentSourceLang[targetLang];
    const src = chosen && others.includes(chosen) ? chosen : others[0];
    return (
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-2">
        <span className="text-xs text-[rgb(var(--secondary-text))]">
          {t("admin.translateContentFrom")}
        </span>
        <select
          value={src}
          onChange={(e) =>
            setContentSourceLang((prev) => ({
              ...prev,
              [targetLang]: e.target.value,
            }))
          }
          className="rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-1 text-xs text-[rgb(var(--text))]"
        >
          {others.map((code) => (
            <option key={code} value={code}>
              {code.toUpperCase()}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={translatingContent === targetLang}
          onClick={() => void translateContentFor(targetLang)}
          className="text-xs font-semibold text-[rgb(var(--primary))] transition hover:opacity-80 disabled:opacity-50"
        >
          {translatingContent === targetLang
            ? t("common.loading")
            : t("common.translate")}
        </button>
      </div>
    );
  };

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
        // Endpoint de admin: trae la fila cruda con TODAS las traducciones y
        // su content sin procesar (GET /exercises/:id aplana a un idioma y
        // borra las respuestas del quiz).
        const ex = await api.get<AdminExerciseResponse>(
          `/exercises/admin/${exerciseId}`,
        );

        setLessonId(ex.lessonId);
        setType(ex.type);
        setStatus(ex.status ?? "PUBLISHED");
        setExperience(ex.experience);
        setCoins(ex.coins);
        setOrder(ex.order);

        if (ex.translations && ex.translations.length > 0) {
          setTranslations(
            ex.translations.map((t) => ({
              languageCode: t.language.code,
              title: t.title,
              description: t.description ?? "",
            })),
          );

          const instructions: Record<string, InstructionElement[]> = {};
          const quiz: Record<string, QuizQuestion[]> = {};
          ex.translations.forEach((t) => {
            instructions[t.language.code] = t.content?.instructionElements ?? [
              { type: "text", value: "" },
            ];
            quiz[t.language.code] = t.content?.questions ?? [];
          });
          setInstructionsByLang(instructions);
          setQuizByLang(quiz);
        }

        if (ex.codes && ex.codes.length > 0) {
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

        {/* Traducciones: título + descripción + contenido (instrucciones o
            quiz) del idioma activo, todo bajo la misma pestaña — igual que en
            el editor de lecciones. */}
        <div className="bg-[#111] border border-zinc-800 rounded-lg p-6">
          <TranslationsForm
            translations={translations}
            onChange={setTranslations}
            showContent={type === "CODE" || type === "VIDEO_THEORY" || type === "QUIZ"}
            contentLabel=""
            renderContentField={({ languageCode }) => (
              <div className="space-y-4">
                {renderTranslateBar(languageCode)}
                {type === "QUIZ" ? (
                  <QuizExerciseForm
                    questions={quizByLang[languageCode] || []}
                    setQuestions={(updater) => {
                      setQuizByLang((prev) => {
                        const current = prev[languageCode] || [];
                        const updated =
                          typeof updater === "function"
                            ? updater(current)
                            : updater;
                        return { ...prev, [languageCode]: updated };
                      });
                    }}
                  />
                ) : (
                  <CodeExerciseForm
                    section="instructions"
                    codes={codes}
                    instructionElements={instructionsByLang[languageCode] || []}
                    setCodes={setCodes}
                    setInstructionElements={(updater) => {
                      setInstructionsByLang((prev) => {
                        const current = prev[languageCode] || [];
                        const updated =
                          typeof updater === "function"
                            ? updater(current)
                            : updater;
                        return { ...prev, [languageCode]: updated };
                      });
                    }}
                  />
                )}
              </div>
            )}
          />
        </div>

        {/* Códigos: compartidos entre idiomas, una sola vez. */}
        {(type === "CODE" || type === "VIDEO_THEORY") && (
          <div className="bg-[#111] border border-zinc-800 rounded-lg p-6">
            <CodeExerciseForm
              section="codes"
              codes={codes}
              setCodes={setCodes}
              instructionElements={[]}
              setInstructionElements={() => {}}
            />
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
