"use client";

import { useState, useEffect, useRef, memo, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";

import {
  BookOpen,
  RotateCcw,
  Cpu,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Eye,
  Sparkles,
  Lightbulb,
} from "lucide-react";

import { Group, Panel, Separator } from "react-resizable-panels";
import { api } from "../../../../../../utils/api";
import { useAuth } from "../../../../../../hooks/useAuth";

import {
  LessonContentRenderer,
  normalizeLessonContent,
  type LessonContentDoc,
} from "@/features/academy";
import { useTranslation } from "../../../../../../src/i18n/useTranslation";
import { exercisePath, lessonPath, nextStepPath } from "@/shared/utils/exercise-path";
import { ExerciseLockedState, SignupToSave, markGuestDone } from "@/features/academy";
import { trackEvent } from "../../../../../../components/analytics/events";
import { useApiLang } from "@/shared/hooks/use-api-lang";
import { PracticeInCodeStudio } from "@/features/codestudio";
import { useReward } from "../../../../../../contexts/RewardContext";
import { useTrackToolUsed, trackToolAction, trackCodeStarted, trackCodeResult } from "../../../../../../components/analytics/tool-tracking";
import { MissionPanel, buildBuddyStageDoc, buildNaveStageDoc, buildPythonStageDoc } from "@/features/buddy";
import { buddySvg, buildWebCheckDoc, buildWebPreviewDoc } from "@codebuddies/world-objects";

// Ejercicios de Buddy (cursos para niños): solo JavaScript, y la vista previa
// es el escenario con el robot en vez de una página.
// La nave (curso 2 "Crea tu juego") funciona igual, con su propio escenario.
const isNaveLang = (lang?: string) => (lang || "").toLowerCase() === "nave";
// Python (curso "Python con Buddy"): consola con Buddy, Python de verdad (Pyodide).
const isPythonLang = (lang?: string) => ["python", "py"].includes((lang || "").toLowerCase());
// "buddyMode" = ejercicio con escenario propio (Buddy, la nave o la consola de
// Python): un solo editor, sin pestañas HTML/CSS/JS, Comprobar corre la vista previa.
const isBuddyLang = (lang?: string) => (lang || "").toLowerCase() === "buddy" || isNaveLang(lang) || isPythonLang(lang);

type CodeTab = "html" | "css" | "js";

// El editor tiene 3 pestañas fijas (HTML/CSS/JS). Mapea el lenguaje del
// ejercicio a la pestaña correcta para no arrancar siempre en JS.
function langToTab(lang?: string): CodeTab {
  const l = (lang || "").toLowerCase();
  if (l === "html" || l === "markup" || l === "xml" || l === "web") return "html";
  if (l === "css") return "css";
  return "js";
}

// Página web completa (curso Full Stack): el alumno edita HTML, CSS y JS, se
// envían los tres juntos y el servidor los verifica con un DOM real.
const isWebLang = (lang?: string) => (lang || "").toLowerCase() === "web";
// JS puro o página web: las pruebas corren aparte (iframe oculto para quien no
// inició sesión; el servidor para todos). La vista previa queda en vivo.
const usesCheckFrame = (lang?: string, solution?: string) =>
  isWebLang(lang) || ((lang || "").toLowerCase() === "js" && /\bassert\s*\(/.test(solution || ""));

type CodeFiles = { html: string; css: string; js: string };

// Código inicial de cada pestaña. En "web" el starter es JSON {html, css, js}.
function starterFiles(lang: string | undefined, starter: string): CodeFiles {
  if (isWebLang(lang)) {
    try {
      const v = JSON.parse(starter || "{}");
      return { html: String(v?.html ?? ""), css: String(v?.css ?? ""), js: String(v?.js ?? "") };
    } catch {
      return { html: starter || "", css: "", js: "" };
    }
  }
  const tab = langToTab(lang);
  return { html: tab === "html" ? starter : "", css: tab === "css" ? starter : "", js: tab === "js" ? starter : "" };
}

// Ejercicio de JavaScript sin HTML: la vista previa es una consola, no una
// página en blanco con "Tu HTML aquí".
function consoleDoc(js: string, title: string, empty: string) {
  const safe = js.replace(/<\/(script)/gi, "<\\/$1");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
html,body{margin:0;height:100%;background:#11131f;color:#d1fae5;font:15px/1.6 "JetBrains Mono",Consolas,monospace}
header{padding:12px 18px;background:#1e2235;color:#fff;font:800 14px Arial,sans-serif;letter-spacing:.02em}
#out{padding:14px 18px;white-space:pre-wrap;word-break:break-word}
.e{color:#fca5a5}.m{color:#94a3b8}
</style></head><body><header>${title}</header><div id="out"><div class="m">${empty}</div></div>
<script>
(function(){var out=document.getElementById("out"),first=true;
function fmt(a){if(typeof a==="string")return a;if(a===undefined)return"undefined";if(typeof a==="function")return"[Function "+(a.name||"anonymous")+"]";try{var s=JSON.stringify(a);return s===undefined?String(a):s}catch(e){return String(a)}}
function line(t,c){if(first){out.innerHTML="";first=false}var d=document.createElement("div");if(c)d.className=c;d.textContent=t;out.appendChild(d)}
var log=function(){line(Array.prototype.map.call(arguments,fmt).join(" "))};
console.log=console.info=console.debug=console.table=log;console.warn=console.error=function(){line(Array.prototype.map.call(arguments,fmt).join(" "),"e")};
window.addEventListener("error",function(e){line(e.message,"e")});
window.addEventListener("unhandledrejection",function(e){line("Promise: "+fmt(e.reason&&e.reason.message||e.reason),"e")});
})();
</script>
<script>${safe}</script></body></html>`;
}

const panelClass = `
relative
overflow-hidden
rounded-[28px]
border
border-[rgb(var(--border))]
bg-[rgb(var(--card)/0.94)]
backdrop-blur-2xl
shadow-[0_10px_40px_rgba(0,0,0,0.12)]
before:absolute
before:inset-0
before:rounded-[28px]
before:border
before:border-[rgb(var(--border)/0.4)]
before:pointer-events-none
`;

// Un iframe nuevo por cada documento distinto (key = huella del documento):
// Chrome a veces ignora el cambio de srcdoc de un iframe que todavía está
// cargando el anterior, y la vista previa quedaba en blanco o vieja. La consola
// de Python tiene un documento fijo por ejercicio, así que no se recarga.
function docKey(doc: string) {
  let h = 5381;
  for (let i = 0; i < doc.length; i++) h = ((h << 5) + h + doc.charCodeAt(i)) | 0;
  return `${doc.length}-${h}`;
}

const PreviewFrame = memo(({ srcDoc, stage }: { srcDoc: string; stage?: string }) => {
  const t = useTranslation();
  return (
    <iframe
      key={docKey(srcDoc)}
      srcDoc={srcDoc}
      data-stage={stage}
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
    starterTab,
    isMobile,
    onUserEdit,
    buddyMode,
    editorLanguage,
    onEditorMount,
    exerciseLanguage,
  }: any) => {
    const t = useTranslation();
    const { resolvedTheme } = useTheme();
    const handleChange = useCallback(
      (value: string | undefined) => {
        const newValue = value ?? "";

        // onChange de Monaco solo dispara por ediciones reales del usuario
        // (nunca por el prop `value` cambiando desde afuera) -- es la señal
        // correcta para "empezó a escribir", ver code_started en el padre.
        onUserEdit?.();

        if (activeTab === "html") setHtmlCode(newValue);
        else if (activeTab === "css") setCssCode(newValue);
        else setJsCode(newValue);
      },
      [activeTab, onUserEdit],
    );

    const handleReset = useCallback(() => {
      // El starter vuelve a la pestaña del lenguaje del ejercicio, no a JS.
      const files = starterFiles(exerciseLanguage, starterCode);
      setHtmlCode(files.html);
      setCssCode(files.css);
      setJsCode(files.js);
    }, [starterCode, starterTab, exerciseLanguage, setHtmlCode, setCssCode, setJsCode]);

    // Monaco no lee las variables CSS: hay que darle su propio tema.
    const editorTheme = resolvedTheme === "light" || resolvedTheme === "pink" ? "light" : "vs-dark";

    return (
      <div className={`${panelClass} h-full flex flex-col`}>
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgb(var(--border))]">
          <div className="flex items-center gap-2">
            <div className="text-yellow-400">
              <Sparkles size={18} />
            </div>

            <h2 className="text-[rgb(var(--text))] font-semibold tracking-wide text-lg">
              {t("site.codeExerciseYourCodeTitle")}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {buddyMode && (
              // Un solo botón (Comprobar, abajo). Acá se enseña el atajo que
              // usan los programadores para correr el código sin el mouse.
              <span className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[rgb(var(--secondary-text))]" title={t("site.codeShortcutHint")}>
                <kbd className="rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-1.5 py-0.5 font-mono">Ctrl</kbd>+
                <kbd className="rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-1.5 py-0.5 font-mono">Enter</kbd>
                <span className="ml-1">{t("site.codeShortcutLabel")}</span>
              </span>
            )}
            {!buddyMode && (["html", "css", "js"] as const).map((tab) => (
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
                      : "bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--secondary-text))] hover:bg-[rgb(var(--border)/0.5)]"
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
            theme={editorTheme}
            language={editorLanguage || (activeTab === "js" ? "javascript" : activeTab)}
            value={
              activeTab === "html"
                ? htmlCode
                : activeTab === "css"
                  ? cssCode
                  : jsCode
            }
            onChange={handleChange}
            onMount={onEditorMount}
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
        <div className="px-6 py-4 border-t border-[rgb(var(--border))] flex justify-end">
          <button
            onClick={handleReset}
            className="
            h-11
            px-5
            rounded-2xl
            bg-[rgb(var(--background))]
            border
            border-[rgb(var(--border))]
            text-[rgb(var(--text))]
            flex
            items-center
            gap-2
            hover:bg-[rgb(var(--border)/0.5)]
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
  const apiLang = useApiLang();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showReward } = useReward();
  useTrackToolUsed("code_exercise", "learning");

  const { id } = useParams<{ id: string }>();

  const storageKey = `exercise-${id}`;

  const [exercise, setExercise] = useState<any>(null);

  // Instrucciones como doc de bloques (mismo formato/renderer que la teoría
  // de una lección). `normalizeLessonContent` entiende el formato viejo
  // `{ instructionElements }` sin migración.
  const [instructionDoc, setInstructionDoc] = useState<LessonContentDoc>(() =>
    normalizeLessonContent(null),
  );

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

  const [activeTab, setActiveTab] = useState<CodeTab>("js");

  // El botón "Comprobar" se habilita cuando el estudiante editó el código.
  const [dirty, setDirty] = useState(false);

  const [mobileView, setMobileView] = useState<
    "instructions" | "code" | "preview"
  >("code");

  const [htmlCode, setHtmlCode] = useState("");

  const [cssCode, setCssCode] = useState("");

  const [jsCode, setJsCode] = useState("");

  const [previewDoc, setPreviewDoc] = useState("");
  // Iframe oculto que corre las pruebas de JS/web en el navegador (visitantes).
  const [checkDoc, setCheckDoc] = useState("");

  // Profe Buddy: pistas escritas a mano, una a la vez, cuando el código falla.
  const [hints, setHints] = useState<string[]>([]);
  const [hintsShown, setHintsShown] = useState(0);
  // Visitante sin cuenta (primera lección): puede hacer el ejercicio, pero
  // Comprobar no guarda ni da recompensas; se le invita a crear la cuenta.
  const [showGuestSave, setShowGuestSave] = useState(false);
  // Sin cuenta, Comprobar espera el resultado de la vista previa: solo se
  // avanza si el código de verdad está bien.
  const guestPendingRef = useRef<string | null>(null);

  // Buddy: la animación corre al tocar "Ejecutar" (con cada tecla sería un lío).
  const buddyMode = isBuddyLang(exercise?.language);

  // Buddy pinta las líneas del editor mientras corre: amarilla la que está
  // haciendo, verde las hechas, roja la que falló (mensajes "buddy-line" del
  // iframe). Se borra al volver a escribir.
  const editorRef = useRef<any>(null);
  const lineMarks = useRef<Map<number, "run" | "ok" | "bad">>(new Map());
  const decorationIds = useRef<string[]>([]);
  const paintLines = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const decorations = [...lineMarks.current.entries()].map(([line, state]) => ({
      range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
      options: { isWholeLine: true, className: `buddy-line-${state}`, linesDecorationsClassName: `buddy-gutter-${state}` },
    }));
    decorationIds.current = editor.deltaDecorations(decorationIds.current, decorations);
  }, []);
  const clearLines = useCallback(() => {
    lineMarks.current.clear();
    paintLines();
  }, [paintLines]);
  useEffect(() => {
    if (!buddyMode) return;
    const handleLine = (event: MessageEvent) => {
      if (event.data?.type !== "buddy-line") return;
      if (event.data.state === "reset") {
        lineMarks.current.clear();
      } else if (typeof event.data.line === "number") {
        // Una sola línea "corriendo" a la vez.
        if (event.data.state === "run") {
          for (const [line, state] of lineMarks.current) if (state === "run") lineMarks.current.set(line, "ok");
        }
        lineMarks.current.set(event.data.line, event.data.state);
      }
      paintLines();
    };
    window.addEventListener("message", handleLine);
    return () => window.removeEventListener("message", handleLine);
  }, [buddyMode, paintLines]);
  const [buddyRun, setBuddyRun] = useState(0);

  const [isMobile, setIsMobile] = useState(false);

  const startedAtRef = useRef<number>(Date.now());
  const codeStartedRef = useRef(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);

    checkMobile();

    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!id || authLoading) return;

    startedAtRef.current = Date.now();
    // Nueva "sesión" de ejercicio (cambió el id, ej. botón Siguiente) --
    // code_started debe poder volver a dispararse para este ejercicio nuevo,
    // y el estado de comprobación no debe arrastrarse del ejercicio anterior.
    codeStartedRef.current = false;
    setCheckResult("idle");
    setCheckMessage(null);
    setDirty(false);

    const loadExercise = async () => {
      setLoading(true);

      try {
        const lang = apiLang;
        const query = user?.userId
          ? `?lang=${lang}&userId=${user.userId}`
          : `?lang=${lang}`;
        const data = (await api.get(`/exercises/${id}${query}`)) as any;

        setExercise(data);
        setCompleted(Boolean(data.completed));

        let rawContent: unknown = null;

        if (data.translations?.length > 0) {
          const translation =
            data.translations.find((t: any) => t.language?.code === lang) ||
            data.translations.find((t: any) => t.language?.code === "es") ||
            data.translations[0];

          if (translation?.content) {
            try {
              rawContent =
                typeof translation.content === "string"
                  ? JSON.parse(translation.content)
                  : translation.content;
            } catch {}
          }
        }

        setInstructionDoc(normalizeLessonContent(rawContent));
        // Pistas del mentor (Profe Buddy): las escribe quien arma el ejercicio
        // en content.hints, de la más suave a la más clara.
        const rawHints = (rawContent as { hints?: unknown } | null)?.hints;
        setHints(Array.isArray(rawHints) ? rawHints.filter((h): h is string => typeof h === "string" && h.trim().length > 0) : []);
        setHintsShown(0);

        // Pestaña inicial = lenguaje del ejercicio (HTML/CSS/JS), no siempre JS.
        const tab = langToTab(data.language);
        setActiveTab(tab);

        const saved = localStorage.getItem(storageKey);

        if (saved) {
          const parsed = JSON.parse(saved);

          setHtmlCode(parsed.html || "");
          setCssCode(parsed.css || "");
          setJsCode(parsed.js || "");
          setDirty(true);
        } else {
          const files = starterFiles(data.language, data.starterCode || "");
          setHtmlCode(files.html);
          setCssCode(files.css);
          setJsCode(files.js);
        }
      } catch (err: any) {
        setError(err.message || t("site.codeExerciseLoadError"));
      } finally {
        setLoading(false);
      }
    };

    loadExercise();
  }, [id, authLoading, user?.userId, apiLang]);

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

  // Python: la consola se arma UNA vez por ejercicio (Python empieza a cargarse
  // mientras el alumno lee) y cada Comprobar le manda el código por mensaje.
  const pythonMode = isPythonLang(exercise?.language);
  const pythonRunRef = useRef<{ id: string; code: string } | null>(null);
  const postPythonRun = useCallback(() => {
    const run = pythonRunRef.current;
    const frame = document.querySelector<HTMLIFrameElement>('iframe[data-stage="python"]');
    if (run && frame?.contentWindow) frame.contentWindow.postMessage({ type: "python-run", ...run }, "*");
  }, []);
  // Se calcula en el mismo render en que se sabe que es Python: el iframe nace
  // ya con la consola (si llegaba un render después, Chrome podía ignorarlo).
  // La consola se vuelve a armar si cambian los textos (el usuario cambia de idioma).
  const pythonLabels = {
    ready: t("site.pythonStageReady"),
    loading: t("site.pythonStageLoading"),
    running: t("site.pythonStageRunning"),
    error: t("site.pythonStageError"),
    passed: t("site.pythonStagePassed"),
    console: t("site.pythonStageConsole"),
    inputs: t("site.pythonStageInputs"),
    empty: t("site.pythonStageEmpty"),
    offline: t("site.pythonStageOffline"),
  };
  const pythonLabelsKey = JSON.stringify(pythonLabels);
  const pythonDoc = useMemo(() => {
    if (!pythonMode) return "";
    pythonRunRef.current = null;
    return buildPythonStageDoc((exercise?.solutionCode || "").trim(), JSON.parse(pythonLabelsKey), apiLang);
  }, [pythonMode, exercise?.id, exercise?.solutionCode, apiLang, pythonLabelsKey]);
  useEffect(() => {
    if (!pythonMode || buddyRun === 0) return;
    pythonRunRef.current = { id: `${Date.now()}-${buddyRun}`, code: jsCode };
    postPythonRun();
    // Solo al comprobar: no con cada tecla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pythonMode, buddyRun]);
  useEffect(() => {
    if (!pythonMode) return;
    // Si la consola recién arrancó (o se volvió a montar), se le reenvía la última orden.
    const onHello = (event: MessageEvent) => {
      if (event.data?.type === "python-stage-hello") postPythonRun();
    };
    window.addEventListener("message", onHello);
    return () => window.removeEventListener("message", onHello);
  }, [pythonMode, postPythonRun]);

  useEffect(() => {
    if (!buddyMode || pythonMode) return;
    const solution = (exercise?.solutionCode || "").trim();
    if (isNaveLang(exercise?.language)) {
      setPreviewDoc(
        buildNaveStageDoc(buddyRun > 0 ? jsCode : "", buddyRun > 0 && /\bassert\s*\(/.test(solution) ? solution : "", solution, {
          ready: t("site.naveStageReady"),
          error: t("site.naveStageError"),
          passed: t("site.naveStagePassed"),
          play: t("site.naveStagePlay"),
          over: t("site.naveStageOver"),
        }, apiLang),
      );
      return;
    }
    setPreviewDoc(
      buildBuddyStageDoc(buddyRun > 0 ? jsCode : "", buddyRun > 0 && /\bassert\s*\(/.test(solution) ? solution : "", {
        ready: t("site.buddyStageReady"),
        error: t("site.buddyStageError"),
        passed: t("site.buddyStagePassed"),
      }, apiLang),
    );
    // Solo al ejecutar (o al cargar el ejercicio): no con cada tecla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buddyMode, pythonMode, buddyRun, exercise?.solutionCode, exercise?.language, apiLang]);

  useEffect(() => {
    // Hasta saber el lenguaje del ejercicio no se arma nada: si se cargaba la
    // vista previa de HTML y enseguida llegaba otro documento (Python), Chrome
    // podía quedarse mostrando el primero.
    if (!exercise || buddyMode) return;
    const timeout = setTimeout(() => {
      const solution = (exercise?.solutionCode || "").trim();
      // solutionCode puede ser verificaciones assert(...) o la respuesta
      // modelo (HTML/CSS/JS). Ejecutar la respuesta modelo como JS era lo que
      // mostraba "Unexpected token '<'". El servidor valida ambos casos.
      // JS y páginas web: las pruebas corren aparte (ver checkDoc), así la
      // vista previa queda en vivo y con temporizadores de verdad.
      const assertions = /\bassert\s*\(/.test(solution) && !usesCheckFrame(exercise?.language, solution) ? solution : "";
      if (isWebLang(exercise?.language)) {
        setPreviewDoc(buildWebPreviewDoc({ html: htmlCode, css: cssCode, js: jsCode }));
        return;
      }
      if ((exercise?.language || "").toLowerCase() === "js" && !htmlCode.trim() && !cssCode.trim()) {
        setPreviewDoc(consoleDoc(jsCode, t("site.jsConsoleTitle"), t("site.jsConsoleEmpty")));
        return;
      }

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
  }, [htmlCode, cssCode, jsCode, exercise?.id, exercise?.solutionCode, buddyMode]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type !== "exercise-result") return;

      if (event.data.passed) {
        setCheckResult("pass");
        setCheckMessage(null);
        if (guestPendingRef.current) {
          markGuestDone(guestPendingRef.current);
          guestPendingRef.current = null;
          setShowGuestSave(true);
        }
      } else {
        setCheckResult("fail");
        setCheckMessage(event.data.message || null);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleUserEdit = useCallback(() => {
    setDirty(true);
    if (codeStartedRef.current || !exercise?.id) return;
    codeStartedRef.current = true;
    trackCodeStarted(exercise.id);
  }, [exercise?.id]);

  const submitCompletion = async () => {
    if (!exercise || completed || submitting) return;
    if (!user?.userId) {
      if (usesCheckFrame(exercise.language, exercise.solutionCode)) {
        guestPendingRef.current = exercise.id;
        setCheckDoc(buildWebCheckDoc({ html: htmlCode, css: cssCode, js: jsCode }, String(exercise.solutionCode || "")) + `<!-- ${Date.now()} -->`);
        return;
      }
      if (!buddyMode && checkResult === "pass") {
        markGuestDone(exercise.id);
        setShowGuestSave(true);
      } else {
        // La vista previa vuelve a correr; si aprueba, se muestra el aviso.
        guestPendingRef.current = exercise.id;
      }
      return;
    }

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
      // Enviar el buffer del lenguaje del ejercicio (antes iba siempre `jsCode`,
      // así un ejercicio de HTML nunca podía completarse).
      const langTab = langToTab(exercise?.language);
      const primaryCode =
        langTab === "html" ? htmlCode : langTab === "css" ? cssCode : jsCode;
      const submittedCode = isWebLang(exercise?.language)
        ? JSON.stringify({ html: htmlCode, css: cssCode, js: jsCode })
        : primaryCode.trim() ||
        jsCode.trim() ||
        htmlCode.trim() ||
        cssCode.trim() ||
        "";
      const res = (await api.post(`/exercises/${exercise.id}/code/submit`, {
        code: submittedCode,
        lang: apiLang,
        timeSpentSeconds,
      })) as any;

      // Éxito = el backend proceso el envío y devolvió un resultado válido
      // (correcto o no) -- un intento incorrecto no es un fallo de la
      // acción "submit" en sí, solo del resultado del ejercicio.
      trackToolAction("code_exercise", "learning", "submit");
      // result sale 1:1 de res.correct (el backend), nunca del chequeo
      // client-side del iframe.
      trackCodeResult(exercise.id, res.correct ? "success" : "failed");

      if (!res.correct) {
        setCheckResult("fail");
        setCheckMessage(res.results?.[0]?.error ?? null);
        return;
      }

      const xp = res.xpAdded ?? exercise.experience ?? 0;
      const coins = res.coinsAdded ?? exercise.coins ?? 0;
      if (!completed) {
        trackEvent("exercise_complete", {
          exercise_id: exercise.id,
          exercise_type: "CODE",
          course_id: exercise.courseId,
        });
      }
      setCompleted(true);
      setXpGained(xp);
      setCoinsGained(coins);
      if (xp > 0 || coins > 0) showReward({ xp, coins });
    } catch (err) {
      console.error("[CodeExercise] Error guardando progreso:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // El servidor es la autoridad: re-corre las assertions (o acepta código no
  // vacío si el ejercicio no tiene). El check del iframe queda como feedback
  // en vivo, no como candado del botón.
  // En Buddy y la nave, Comprobar también anima la vista previa (antes había
  // un botón Ejecutar aparte: dos botones para lo mismo). Ya completado, solo
  // vuelve a mostrar la animación.
  const handleCheckSolution = () => {
    if (buddyMode) setBuddyRun((n) => n + 1);
    // En celular se ve una vista a la vez: Comprobar muestra el resultado
    // (también en web/JS, donde antes se quedaba en el código sin respuesta).
    if (isMobile) setMobileView("preview");
    if (completed) return;
    void submitCompletion();
  };
  // Ctrl/Cmd + Enter comprueba (también con el foco dentro del editor).
  const checkRef = useRef(handleCheckSolution);
  checkRef.current = handleCheckSolution;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        checkRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[rgb(var(--background))] flex items-center justify-center text-yellow-400 text-2xl font-semibold">
        <Cpu className="animate-pulse mr-4" />
        {t("site.codeExerciseLoadingCore")}
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div className="fixed inset-0 bg-[rgb(var(--background))] flex items-center justify-center text-red-400">
        {t("site.codeExerciseLoadError")}
      </div>
    );
  }

  if (exercise.locked && !user?.userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--background))] p-4">
        <div className="w-full max-w-lg">
          <SignupToSave variant="continue" />
        </div>
      </div>
    );
  }

  if (exercise.locked) {
    return (
      <div className="min-h-screen bg-[rgb(var(--background))]">
        <ExerciseLockedState
          courseId={exercise.courseId}
          lockedReason={exercise.lockedReason}
          lockedStep={exercise.lockedStep}
        />
      </div>
    );
  }

  // Aviso para el visitante sin cuenta que acaba de resolver el ejercicio.
  const guestSave =
    showGuestSave && !user?.userId ? (
      <SignupToSave
        compact={isMobile}
        next={
          exercise.nextExerciseId && exercise.nextExerciseType
            ? { href: exercisePath(exercise.nextExerciseId, exercise.nextExerciseType), kind: "exercise" }
            : exercise.courseId && exercise.nextLessonId
              ? { href: lessonPath(exercise.courseId, exercise.nextLessonId), kind: "lesson" }
              : null
        }
      />
    ) : null;

  const InstructionsContent = () => (
    <div className={`${panelClass} h-full overflow-y-auto`}>
      <div className={`px-6 py-5 border-b border-[rgb(var(--border))] ${isMobile ? "hidden" : ""}`}>
        <div className="flex items-center gap-3">
          <BookOpen className="text-yellow-400" size={20} />

          <h2 className="text-[rgb(var(--text))] font-semibold text-lg">{t("site.codeExerciseInstructionsTitle")}</h2>
        </div>
      </div>

      <div className="p-6">
        {exercise.description && (
          <div className="mb-6 rounded-2xl border border-[rgb(var(--primary)/0.2)] bg-[rgb(var(--primary)/0.04)] p-5">
            <p className="text-[15px] leading-8 text-[rgb(var(--secondary-text))]">
              {exercise.description}
            </p>
          </div>
        )}

        {/* Mismo renderer que la teoría de una lección: encabezados, callouts
            con iconos, bloques de código con "copiar", listas, etc. */}
        {instructionDoc.blocks.length > 0 && buddyMode ? (
          <MissionPanel doc={instructionDoc} />
        ) : instructionDoc.blocks.length > 0 ? (
          <LessonContentRenderer doc={instructionDoc} />
        ) : (
          <p className="text-sm italic text-[rgb(var(--secondary-text))]">
            {t("site.academyLesson.noContentYet")}
          </p>
        )}
        {guestSave && !isMobile && <div className="mb-6">{guestSave}</div>}
        {hints.length > 0 && !completed && (checkResult === "fail" || hintsShown > 0) && (
          <div className="mt-6 rounded-2xl border-2 border-emerald-400/60 bg-emerald-400/10 p-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0" dangerouslySetInnerHTML={{ __html: buddySvg(hintsShown > 0 ? "feliz" : "normal", 52) }} />
              <div>
                <p className="font-extrabold text-[rgb(var(--text))]">{t("site.mentorTitle")}</p>
                <p className="text-sm text-[rgb(var(--secondary-text))]">
                  {hintsShown === 0 ? t("site.mentorOffer") : t("site.mentorCount", { shown: hintsShown, total: hints.length })}
                </p>
              </div>
            </div>
            {hints.slice(0, hintsShown).map((hint, index) => (
              <div key={index} className="mt-3 flex gap-2 rounded-xl bg-[rgb(var(--card))] p-3 text-[15px] leading-7 text-[rgb(var(--text))]">
                <Lightbulb size={18} className="mt-1 shrink-0 text-amber-500" />
                <div className="min-w-0">
                  <LessonContentRenderer doc={normalizeLessonContent({ markdown: hint })} />
                </div>
              </div>
            ))}
            {hintsShown < hints.length && (
              <button
                type="button"
                onClick={() => setHintsShown((n) => n + 1)}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-600"
              >
                <Lightbulb size={16} />
                {hintsShown === 0 ? t("site.mentorFirstHint") : t("site.mentorNextHint")}
              </button>
            )}
          </div>
        )}
        {completed && <PracticeInCodeStudio className="mt-6" />}
      </div>
    </div>
  );

  const PreviewContent = () => (
    <div className={`${panelClass} h-full flex flex-col`}>
      {/* En celular la pestaña ya dice "Resultado": sin este encabezado el
          escenario gana alto (el globo de Buddy se cortaba arriba). */}
      <div className={`px-6 py-5 border-b border-[rgb(var(--border))] items-center gap-3 ${isMobile ? "hidden" : "flex"}`}>
        <Eye className="text-yellow-400" size={18} />

        <h2 className="text-[rgb(var(--text))] font-semibold text-lg">{t("site.codeExerciseResultTitle")}</h2>
      </div>

      <div className={`flex-1 overflow-hidden bg-white ${isMobile ? "rounded-[28px]" : "rounded-b-[28px]"}`}>
        {/* La consola de Python es un iframe propio por ejercicio (key): nunca reusa uno que esté cargando otro documento. */}
        <PreviewFrame key={pythonMode ? `python-${exercise?.id}` : "preview"} srcDoc={pythonMode ? pythonDoc : previewDoc} stage={pythonMode ? "python" : undefined} />
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-110px)] overflow-hidden bg-[rgb(var(--background))] text-[rgb(var(--text))] rounded-[32px] relative">
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
            <div className="h-full flex flex-col gap-3">
              {/* En celular se ve una vista a la vez: sin estas pestañas no había
                  forma de leer la consigna ni de volver al código tras Comprobar. */}
              <div role="tablist" className="shrink-0 grid grid-cols-3 gap-1 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.85)] p-1">
                {(
                  [
                    ["instructions", t("site.codeExerciseInstructionsTitle")],
                    ["code", t("site.codeExerciseYourCodeTitle")],
                    ["preview", t("site.codeExerciseResultTitle")],
                  ] as const
                ).map(([view, label]) => (
                  <button
                    key={view}
                    role="tab"
                    aria-selected={mobileView === view}
                    onClick={() => setMobileView(view)}
                    className={`rounded-xl px-1.5 py-2 text-[10.5px] font-black uppercase truncate transition-colors ${
                      mobileView === view
                        ? "bg-yellow-400 text-black"
                        : "text-[rgb(var(--secondary-text))] hover:text-[rgb(var(--text))]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-h-0">
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
                  starterTab={langToTab(exercise?.language)}
                  exerciseLanguage={exercise?.language}
                  isMobile={isMobile}
                  onUserEdit={handleUserEdit}
                  buddyMode={buddyMode}
                  editorLanguage={isPythonLang(exercise?.language) ? "python" : undefined}
                  onEditorMount={(editor: any) => {
                    editorRef.current = editor;
                    editor.onDidChangeModelContent(() => clearLines());
                    // Monaco usa Ctrl+Enter para "insertar línea": acá es Comprobar.
                    editor.addCommand(2048 | 3, () => checkRef.current());
                  }}
                />
              )}

              {/* Montada siempre (solo se oculta): así Python/Buddy no se vuelven
                  a cargar cada vez que se cambia de pestaña o se comprueba. */}
              <div className={mobileView === "preview" ? "h-full" : "hidden"}>{PreviewContent()}</div>
              </div>
            </div>
          ) : (
            <Group orientation="horizontal" className="h-full min-h-0 gap-5">
              <Panel defaultSize={30} minSize={20} className="min-h-0">
                <InstructionsContent />
              </Panel>

              <Separator className="w-[1px] bg-[rgb(var(--border))]" />

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
                  starterTab={langToTab(exercise?.language)}
                  exerciseLanguage={exercise?.language}
                  isMobile={isMobile}
                  onUserEdit={handleUserEdit}
                  buddyMode={buddyMode}
                  editorLanguage={isPythonLang(exercise?.language) ? "python" : undefined}
                  onEditorMount={(editor: any) => {
                    editorRef.current = editor;
                    editor.onDidChangeModelContent(() => clearLines());
                    // Monaco usa Ctrl+Enter para "insertar línea": acá es Comprobar.
                    editor.addCommand(2048 | 3, () => checkRef.current());
                  }}
                />
              </Panel>

              <Separator className="w-[1px] bg-[rgb(var(--border))]" />

              <Panel defaultSize={30} minSize={20}>
                {PreviewContent()}
              </Panel>
            </Group>
          )}
        </main>

        {/* Corrección de visitante (web): fuera de la vista previa para que corra
            aunque en celular se esté mirando el código o la consigna. */}
        {checkDoc && (
          <iframe key={docKey(checkDoc)} srcDoc={checkDoc} sandbox="allow-scripts" aria-hidden="true" tabIndex={-1} className="hidden" title="check" />
        )}

        {/* En celular el panel de instrucciones queda oculto al ver el
            resultado: el aviso de crear cuenta va acá, siempre a la vista
            (antes el visitante resolvía y nunca veía cómo registrarse). */}
        {guestSave && isMobile && (
          <div className="shrink-0">{guestSave}</div>
        )}

        {/* FOOTER */}
        {/* En celular: el mensaje arriba y los botones abajo, a todo el ancho
            (en una sola fila no entran y se salían por la derecha). */}
        <footer className="shrink-0 rounded-[28px] border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.85)] backdrop-blur-xl flex flex-col items-stretch gap-3 px-4 py-3 md:h-24 md:flex-row md:items-center md:justify-between md:px-8 md:py-0 md:gap-6">
          <div className="min-w-0 text-sm font-medium truncate">
            {completed ? (
              <span className="text-emerald-500 flex items-center gap-2">
                <CheckCircle size={18} />
                {t("site.exerciseCompletedMessage")} (+{xpGained} XP, +
                {coinsGained} coins)
              </span>
            ) : checkResult === "pass" ? (
              <span className="text-emerald-500 flex items-center gap-2">
                <CheckCircle size={18} />
                {t("site.codeExerciseCoreActivatedAlert")}
              </span>
            ) : checkResult === "fail" ? (
              <span className="text-red-500 line-clamp-2">
                {checkMessage || t("site.codeExerciseReviewCodeAlert")}
              </span>
            ) : (
              <span className="text-[rgb(var(--secondary-text))]">
                {t("site.codeExerciseYourCodeTitle")}
              </span>
            )}
          </div>

          <div className="flex w-full items-center gap-2 shrink-0 md:w-auto md:gap-5">
            <button
              aria-label={t("common.previous")}
              onClick={() => {
                if (exercise.prevExerciseId && exercise.prevExerciseType) {
                  router.push(
                    exercisePath(exercise.prevExerciseId, exercise.prevExerciseType),
                  );
                } else if (exercise.courseId && exercise.lessonId) {
                  // Primer ejercicio: "atrás" es la teoría de la lección.
                  router.push(lessonPath(exercise.courseId, exercise.lessonId));
                }
              }}
              disabled={!exercise.prevExerciseId && !exercise.courseId}
              className="
                h-12
                px-4
                md:px-6
                shrink-0
                rounded-2xl
                bg-[rgb(var(--background))]
                border
                border-[rgb(var(--border))]
                text-[rgb(var(--text))]
                flex
                items-center
                justify-center
                gap-2
                hover:bg-[rgb(var(--border)/0.5)]
                transition-all
                disabled:opacity-40
                disabled:text-[rgb(var(--secondary-text))]
                disabled:hover:bg-[rgb(var(--background))]
              "
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">{t("common.previous")}</span>
            </button>

            <button
              onClick={handleCheckSolution}
              disabled={submitting || (!buddyMode && (completed || !dirty))}
              title={t("site.codeShortcutHint")}
              aria-label={
                completed
                  ? buddyMode
                    ? t("site.buddyRunAgain")
                    : t("site.exerciseCompletedMessage")
                  : t("site.codeExerciseCheckButton")
              }
              className={`
                ${completed ? "shrink-0" : "flex-1 min-w-0"}
                md:flex-none
                h-12
                px-4
                md:px-8
                rounded-2xl
                bg-yellow-400
                text-black
                font-semibold
                flex
                items-center
                justify-center
                gap-2
                hover:scale-[1.02]
                transition-all
                disabled:opacity-40
                disabled:hover:scale-100
              `}
            >
              <CheckCircle size={18} className="shrink-0" />
              {/* En celular entra un solo texto largo: antes de resolver se ve
                  "Comprobar"; después, "Siguiente" (acá queda solo el ícono). */}
              <span className={completed ? "hidden sm:inline truncate" : "truncate"}>
                {completed
                  ? buddyMode
                    ? t("site.buddyRunAgain")
                    : t("site.exerciseCompletedMessage")
                  : t("site.codeExerciseCheckButton")}
              </span>
            </button>

            <button
              onClick={() => {
                if (!completed) return;
                router.push(
                  nextStepPath(exercise) ??
                    (exercise.courseId ? `/courses/${exercise.courseId}` : "/courses"),
                );
              }}
              disabled={!completed}
              aria-label={
                completed && !exercise.nextExerciseId
                  ? exercise.nextLessonId
                    ? t("site.academyLesson.nextLesson")
                    : t("site.courseCompleteButton")
                  : t("common.next")
              }
              className={`
                ${completed ? "flex-1 min-w-0" : "shrink-0"}
                md:flex-none
                h-12
                px-4
                md:px-6
                rounded-2xl
                bg-yellow-400
                text-black
                font-semibold
                flex
                items-center
                justify-center
                gap-2
                hover:scale-[1.02]
                transition-all
                disabled:opacity-40
                disabled:bg-[rgb(var(--background))]
                disabled:text-[rgb(var(--secondary-text))]
                disabled:hover:scale-100
              `}
            >
              <span className={completed ? "truncate" : "hidden sm:inline"}>
                {completed && !exercise.nextExerciseId
                  ? exercise.nextLessonId
                    ? t("site.academyLesson.nextLesson")
                    : t("site.courseCompleteButton")
                  : t("common.next")}
              </span>
              <ChevronRight size={16} className="shrink-0" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
