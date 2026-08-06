"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Code2, Eye } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { classNames } from "../utils/class-names";
import { FOCUS_RING_INSET } from "./styles";
import { Textarea } from "./textarea";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

// Reemplaza el <textarea> plano de contenido markdown (HI9) por un editor
// con vista previa en vivo, reusando el mismo stack (react-markdown +
// remark-gfm) que ya renderiza las instrucciones de ejercicios para el
// estudiante — así lo que el admin ve en el preview es lo que el estudiante
// terminará viendo, sin sumar una dependencia nueva.
export function MarkdownEditor({ value, onChange, rows = 8, placeholder }: MarkdownEditorProps) {
  const t = useTranslation();
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

  return (
    <div className="overflow-hidden rounded-lg border border-[rgb(var(--border))]">
      <div className="flex border-b border-[rgb(var(--border))] lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("edit")}
          className={classNames(
            "flex flex-1 items-center justify-center gap-2 px-3 py-2 text-xs font-semibold",
            mobileTab === "edit" ? "bg-[rgb(var(--card))] text-[rgb(var(--primary))]" : "text-[rgb(var(--secondary-text))]",
          )}
        >
          <Code2 size={14} />
          {t("common.markdownEditTab")}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("preview")}
          className={classNames(
            "flex flex-1 items-center justify-center gap-2 px-3 py-2 text-xs font-semibold",
            mobileTab === "preview" ? "bg-[rgb(var(--card))] text-[rgb(var(--primary))]" : "text-[rgb(var(--secondary-text))]",
          )}
        >
          <Eye size={14} />
          {t("common.markdownPreviewTab")}
        </button>
      </div>
      <div className="grid lg:grid-cols-2">
        <div className={classNames(mobileTab === "preview" ? "hidden lg:block" : "block")}>
          <Textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={rows}
            placeholder={placeholder}
            className="rounded-none border-0 font-mono"
          />
        </div>
        <div
          className={classNames(
            "min-h-[8rem] overflow-auto border-t border-[rgb(var(--border))] p-3 lg:border-l lg:border-t-0",
            FOCUS_RING_INSET,
            mobileTab === "edit" ? "hidden lg:block" : "block",
          )}
          style={{ maxHeight: `${Math.max(rows * 1.75, 10)}rem` }}
        >
          {value.trim() ? (
            <div className="markdown-preview text-sm text-[rgb(var(--text))]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-[rgb(var(--secondary-text))]">{t("common.markdownPreviewEmpty")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
