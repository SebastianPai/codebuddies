"use client";

import { CodeHighlight } from "@/shared/ui";
import { classNames } from "@/shared/utils/class-names";

// Prism (prism-react-renderer, ya usado por shared/ui/CodeHighlight) nombra
// algunos lenguajes distinto. Mapa mínimo de alias; lo que no está cae al
// string tal cual (Prism simplemente no colorea, no rompe).
const LANGUAGE_ALIASES: Record<string, string> = {
  html: "markup",
  xml: "markup",
  js: "javascript",
  ts: "typescript",
  py: "python",
  sh: "bash",
  shell: "bash",
  plain: "text",
  text: "text",
};

const LANGUAGE_LABELS: Record<string, string> = {
  markup: "HTML",
  javascript: "JavaScript",
  typescript: "TypeScript",
  jsx: "JSX",
  tsx: "TSX",
  python: "Python",
  bash: "Bash",
  json: "JSON",
  css: "CSS",
  sql: "SQL",
  markdown: "Markdown",
  text: "Text",
};

interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
  className?: string;
}

/** Ejemplo de código para lecciones — resaltado, con label de lenguaje,
 *  nombre de archivo opcional y botón de copiar. NO es el editor de código
 *  en vivo (eso vive en /learn/exercise). */
export function CodeBlock({
  code,
  language,
  filename,
  className,
}: CodeBlockProps) {
  const normalized = LANGUAGE_ALIASES[language.toLowerCase()] ?? language.toLowerCase();
  const label = LANGUAGE_LABELS[normalized] ?? language.toUpperCase();

  return (
    <div
      className={classNames(
        "cb-code-block overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--code-background))]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-4 py-2">
        <span className="font-mono text-xs font-semibold uppercase tracking-wide text-[rgb(var(--secondary-text))]">
          {filename ? (
            <span className="normal-case tracking-normal text-[rgb(var(--text))]">
              {filename}
            </span>
          ) : (
            label
          )}
        </span>
        {filename && (
          <span className="font-mono text-[0.65rem] uppercase tracking-wide text-[rgb(var(--secondary-text))]">
            {label}
          </span>
        )}
      </div>
      <div className="cb-code-block__body">
        <CodeHighlight code={code} language={normalized} showCopy />
      </div>
    </div>
  );
}
