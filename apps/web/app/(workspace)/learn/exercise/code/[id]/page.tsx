"use client";

import { useState, useEffect, useRef, memo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Editor from "@monaco-editor/react";

import {
  BookOpen,
  RotateCcw,
  Cpu,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Eye,
  Sparkles,
  Lock,
} from "lucide-react";

import { Group, Panel, Separator } from "react-resizable-panels";
import { api } from "../../../../../../utils/api";
import { useAuth } from "../../../../../../hooks/useAuth";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTranslation } from "../../../../../../src/i18n/useTranslation";

const panelClass = `
relative
overflow-hidden
rounded-[28px]
border
border-white/[0.06]
bg-[#0b0b0b]/90
backdrop-blur-2xl
shadow-[0_0_40px_rgba(250,204,21,0.05)]
before:absolute
before:inset-0
before:rounded-[28px]
before:border
before:border-white/[0.03]
before:pointer-events-none
`;

const PreviewFrame = memo(({ srcDoc }: { srcDoc: string }) => {
  const t = useTranslation();
  return (
    <iframe
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      className="w-full h-full bg-white"
      title={t("admin.previewTitle")}
    />
  );
});

PreviewFrame.displayName = "PreviewFrame";

const EditorContent = memo(
  ({
    activeTab,
    setActiveTab,
    htmlCode,
    setHtmlCode,
    cssCode,
    setCssCode,
    jsCode,
    setJsCode,
    starterCode,
    isMobile,
  }: any) => {
    const t = useTranslation();
    const handleChange = useCallback(
      (value: string | undefined) => {
        const newValue = value ?? "";

        if (activeTab === "html") setHtmlCode(newValue);
        else if (activeTab === "css") setCssCode(newValue);
        else setJsCode(newValue);
      },
      [activeTab],
    );

    const handleReset = useCallback(() => {
      setHtmlCode("");
      setCssCode("");
      setJsCode(starterCode);
    }, [starterCode]);

    return (
      <div className={`${panelClass} h-full flex flex-col`}>
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <div className="text-yellow-400">
              <Sparkles size={18} />
            </div>

            <h2 className="text-white font-semibold tracking-wide text-lg">
              {t("site.codeExerciseYourCodeTitle")}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {(["html", "css", "js"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-4
                  h-10
                  rounded-xl
                  text-sm
                  font-medium
                  transition-all
                  duration-300
                  ${
                    activeTab === tab
                      ? "bg-yellow-400 text-black"
                      : "bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:bg-white/[0.06]"
                  }
                `}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* EDITOR */}
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            theme="vs-dark"
            language={activeTab === "js" ? "javascript" : activeTab}
            value={
              activeTab === "html"
                ? htmlCode
                : activeTab === "css"
                  ? cssCode
                  : jsCode
            }
            onChange={handleChange}
            options={{
              minimap: { enabled: false },
              fontSize: isMobile ? 13 : 15,
              lineHeight: 26,
              fontFamily: "JetBrains Mono",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              smoothScrolling: true,
              cursorBlinking: "smooth",
              padding: {
                top: 20,
              },
              scrollbar: {
                verticalScrollbarSize: 6,
                horizontalScrollbarSize: 6,
              },
            }}
          />
        </div>

        {/* FOOT */}
        <div className="px-6 py-4 border-t border-white/[0.05] flex justify-end">
          <button
            onClick={handleReset}
            className="
            h-11
            px-5
            rounded-2xl
            bg-white/[0.03]
            border
            border-white/[0.06]
            text-white
            flex
            items-center
            gap-2
            hover:bg-white/[0.06]
            transition-all
          "
          >
            <RotateCcw size={16} />
            {t("common.reset")}
          </button>
        </div>
      </div>
    );
  },
);

EditorContent.displayName = "EditorContent";

export default function FullWidthConfidentialWorkspace() {
  const t = useTranslation();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const { id } = useParams<{ id: string }>();

  const storageKey = `exercise-${id}`;

  const [exercise, setExercise] = useState<any>(null);

  const [instructionElements, setInstructionElements] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [checkResult, setCheckResult] = useState<"idle" | "pass" | "fail">(
    "idle",
  );

  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  const [completed, setCompleted] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [xpGained, setXpGained] = useState(0);

  const [coinsGained, setCoinsGained] = useState(0);

  const [activeTab, setActiveTab] = useState<"html" | "css" | "js">("js");

  const [mobileView, setMobileView] = useState<
    "instructions" | "code" | "preview"
  >("code");

  const [htmlCode, setHtmlCode] = useState("");

  const [cssCode, setCssCode] = useState("");

  const [jsCode, setJsCode] = useState("");

  const [previewDoc, setPreviewDoc] = useState("");

  const [isMobile, setIsMobile] = useState(false);

  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);

    checkMobile();

    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!id || authLoading) return;

    startedAtRef.current = Date.now();

    const loadExercise = async () => {
      setLoading(true);

      try {
        const lang =
          typeof window !== "undefined"
            ? localStorage.getItem("lang") || "es"
            : "es";
        const query = user?.userId
          ? `?lang=${lang}&userId=${user.userId}`
          : `?lang=${lang}`;
        const data = (await api.get(`/exercises/${id}${query}`)) as any;

        setExercise(data);
        setCompleted(Boolean(data.completed));

        let elements: any[] = [];

        if (data.translations?.length > 0) {
          const translation =
            data.translations.find((t: any) => t.language?.code === lang) ||
            data.translations.find((t: any) => t.language?.code === "es") ||
            data.translations[0];

          if (translation?.content) {
            try {
              const parsed =
                typeof translation.content === "string"
                  ? JSON.parse(translation.content)
                  : translation.content;

              elements = parsed.instructionElements || [];
            } catch {}
          }
        }

        setInstructionElements(elements);

        const saved = localStorage.getItem(storageKey);

        if (saved) {
          const parsed = JSON.parse(saved);

          setHtmlCode(parsed.html || "");
          setCssCode(parsed.css || "");
          setJsCode(parsed.js || "");
        } else {
          setJsCode(data.starterCode || "");
        }
      } catch (err: any) {
        setError(err.message || t("site.codeExerciseLoadError"));
      } finally {
        setLoading(false);
      }
    };

    loadExercise();
  }, [id, authLoading, user?.userId]);

  useEffect(() => {
    if (exercise) {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          html: htmlCode,
          css: cssCode,
          js: jsCode,
        }),
      );
    }
  }, [htmlCode, cssCode, jsCode]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const assertions = (exercise?.solutionCode || "").trim();

      const doc = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />

<style>
body {
  font-family: sans-serif;
  margin: 0;
  padding: 2rem;
  background: white;
  color: #111;
}

${cssCode}
</style>

</head>

<body>

${htmlCode || `<h1>${t("site.codeExerciseYourHtmlHerePlaceholder")}</h1>`}

<div id="console"></div>

<script>

const consoleDiv = document.getElementById("console");

console.log = (...args) => {
  const div = document.createElement("div");

  div.textContent = args.join(" ");

  consoleDiv.appendChild(div);
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

(async () => {
try {
  ${jsCode}
  ${
    assertions
      ? `${assertions}\n  window.parent.postMessage({ type: "exercise-result", passed: true }, "*");`
      : ""
  }
} catch (err) {
  console.log(err.message);
  ${
    assertions
      ? `window.parent.postMessage({ type: "exercise-result", passed: false, message: err.message }, "*");`
      : ""
  }
}
})();
</script>

</body>
</html>
`;

      setPreviewDoc(doc);
    }, 500);

    return () => clearTimeout(timeout);
  }, [htmlCode, cssCode, jsCode, exercise?.solutionCode]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type !== "exercise-result") return;

      if (event.data.passed) {
        setCheckResult("pass");
        setCheckMessage(null);
      } else {
        setCheckResult("fail");
        setCheckMessage(event.data.message || null);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const submitCompletion = async () => {
    if (!exercise || completed || submitting || !user?.userId) return;

    setSubmitting(true);

    try {
      // El iframe ya corrió las mismas assertions para dar feedback
      // instantáneo, pero eso es 100% client-side y un estudiante podría
      // falsificar el postMessage — este POST vuelve a correr las
      // assertions server-side (ver exercise.service.ts#submitCodeAnswer)
      // y solo ahí se acredita el XP/monedas.
      const timeSpentSeconds = Math.round(
        (Date.now() - startedAtRef.current) / 1000,
      );
      const res = (await api.post(`/exercises/${exercise.id}/code/submit`, {
        code: jsCode,
        timeSpentSeconds,
      })) as any;

      if (!res.correct) {
        setCheckResult("fail");
        setCheckMessage(res.results?.[0]?.error ?? null);
        return;
      }

      setCompleted(true);
      setXpGained(res.xpAdded ?? exercise.experience ?? 0);
      setCoinsGained(res.coinsAdded ?? exercise.coins ?? 0);
    } catch (err) {
      console.error("[CodeExercise] Error guardando progreso:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckSolution = () => {
    if (checkResult === "pass") {
      void submitCompletion();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#070707] flex items-center justify-center text-yellow-400 text-2xl font-semibold">
        <Cpu className="animate-pulse mr-4" />
        {t("site.codeExerciseLoadingCore")}
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div className="fixed inset-0 bg-[#070707] flex items-center justify-center text-red-400">
        {t("site.codeExerciseLoadError")}
      </div>
    );
  }

  if (exercise.locked) {
    return (
      <div className="fixed inset-0 bg-[#070707] flex flex-col items-center justify-center gap-6 text-center px-6">
        <Lock className="text-yellow-400" size={48} />
        <p className="max-w-md text-white">{t("site.exerciseLockedMessage")}</p>
        <Link
          href="/premium"
          className="rounded-lg bg-yellow-400 px-6 py-3 font-black text-black"
        >
          {t("site.premiumTitle")}
        </Link>
      </div>
    );
  }

  const InstructionsContent = () => (
    <div className={`${panelClass} h-full overflow-y-auto`}>
      <div className="px-6 py-5 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <BookOpen className="text-yellow-400" size={20} />

          <h2 className="text-white font-semibold text-lg">{t("site.codeExerciseInstructionsTitle")}</h2>
        </div>
      </div>

      <div className="p-6">
        <div className="rounded-2xl border border-yellow-500/10 bg-yellow-500/[0.03] p-5 mb-6">
          <p className="text-gray-300 leading-8 text-[15px]">
            {exercise.description}
          </p>
        </div>

        <div className="space-y-6">
          {instructionElements.map((el: any, i: number) => (
            <div key={i}>
              {el.type === "text" && (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || "");

                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          className="!rounded-2xl !bg-[#111111] !border !border-white/[0.06]"
                          {...props}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      ) : (
                        <code
                          className="bg-white/[0.05] px-1.5 py-0.5 rounded text-yellow-300"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {el.value}
                </ReactMarkdown>
              )}

              {el.type === "image" && (
                <img
                  src={el.value}
                  className="rounded-2xl border border-white/[0.06]"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const PreviewContent = () => (
    <div className={`${panelClass} h-full flex flex-col`}>
      <div className="px-6 py-5 border-b border-white/[0.05] flex items-center gap-3">
        <Eye className="text-yellow-400" size={18} />

        <h2 className="text-white font-semibold text-lg">{t("site.codeExerciseResultTitle")}</h2>
      </div>

      <div className="flex-1 overflow-hidden rounded-b-[28px] bg-black">
        <PreviewFrame srcDoc={previewDoc} />
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-110px)] overflow-hidden bg-[#070707] text-white rounded-[32px] relative">
      {/* GRID */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #facc15 1px, transparent 1px),
            linear-gradient(to bottom, #facc15 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* GLOW */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-500/10 blur-[140px] rounded-full" />

      {/* CONTENT */}
      <div className="relative z-10 h-full flex flex-col p-5 gap-5 overflow-hidden">
        <main className="flex-1 min-h-0 overflow-hidden">
          {isMobile ? (
            <div className="h-full">
              {mobileView === "instructions" && <InstructionsContent />}

              {mobileView === "code" && (
                <EditorContent
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  htmlCode={htmlCode}
                  setHtmlCode={setHtmlCode}
                  cssCode={cssCode}
                  setCssCode={setCssCode}
                  jsCode={jsCode}
                  setJsCode={setJsCode}
                  starterCode={exercise?.starterCode || ""}
                  isMobile={isMobile}
                />
              )}

              {mobileView === "preview" && <PreviewContent />}
            </div>
          ) : (
            <Group orientation="horizontal" className="h-full min-h-0 gap-5">
              <Panel defaultSize={30} minSize={20} className="min-h-0">
                <InstructionsContent />
              </Panel>

              <Separator className="w-[1px] bg-white/[0.05]" />

              <Panel defaultSize={40} minSize={30}>
                <EditorContent
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  htmlCode={htmlCode}
                  setHtmlCode={setHtmlCode}
                  cssCode={cssCode}
                  setCssCode={setCssCode}
                  jsCode={jsCode}
                  setJsCode={setJsCode}
                  starterCode={exercise?.starterCode || ""}
                  isMobile={isMobile}
                />
              </Panel>

              <Separator className="w-[1px] bg-white/[0.05]" />

              <Panel defaultSize={30} minSize={20}>
                <PreviewContent />
              </Panel>
            </Group>
          )}
        </main>

        {/* FOOTER */}
        <footer className="h-24 rounded-[28px] border border-white/[0.05] bg-black/40 backdrop-blur-xl flex items-center justify-between px-8 gap-6">
          <div className="min-w-0 text-sm font-medium truncate">
            {completed ? (
              <span className="text-green-400 flex items-center gap-2">
                <CheckCircle size={18} />
                {t("site.exerciseCompletedMessage")} (+{xpGained} XP, +
                {coinsGained} coins)
              </span>
            ) : checkResult === "pass" ? (
              <span className="text-green-400 flex items-center gap-2">
                <CheckCircle size={18} />
                {t("site.codeExerciseCoreActivatedAlert")}
              </span>
            ) : checkResult === "fail" ? (
              <span className="text-red-400 truncate">
                {checkMessage || t("site.codeExerciseReviewCodeAlert")}
              </span>
            ) : (
              <span className="text-gray-500">
                {t("site.codeExerciseYourCodeTitle")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-5 shrink-0">
            <button
              disabled
              className="
                h-12
                px-6
                rounded-2xl
                bg-white/[0.03]
                border
                border-white/[0.06]
                text-gray-500
                flex
                items-center
                gap-2
              "
            >
              <ChevronLeft size={16} />
              {t("common.previous")}
            </button>

            <button
              onClick={handleCheckSolution}
              disabled={completed || submitting || checkResult !== "pass"}
              className="
                h-12
                px-8
                rounded-2xl
                bg-yellow-400
                text-black
                font-semibold
                flex
                items-center
                gap-2
                hover:scale-[1.02]
                transition-all
                disabled:opacity-40
                disabled:hover:scale-100
              "
            >
              <CheckCircle size={18} />
              {completed
                ? t("site.exerciseCompletedMessage")
                : t("site.codeExerciseCheckButton")}
            </button>

            <button
              disabled
              className="
                h-12
                px-6
                rounded-2xl
                bg-white/[0.03]
                border
                border-white/[0.06]
                text-gray-500
                flex
                items-center
                gap-2
              "
            >
              {t("common.next")}
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
