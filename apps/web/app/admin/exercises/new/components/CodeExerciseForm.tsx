"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  GripVertical,
  Image as ImageIcon,
  Plus,
  Trash2,
  Type,
  Video,
} from "lucide-react";
import { toast } from "react-toastify";

import { Button, CodeHighlight, Select, Textarea } from "@/shared/ui";
import { classNames } from "@/shared/utils/class-names";
import { FOCUS_RING } from "@/shared/ui/styles";
import { useTranslation } from "@/i18n/useTranslation";
import { Code, InstructionElement } from "../types";

interface CodeExerciseFormProps {
  codes: Code[];
  instructionElements: InstructionElement[];
  setCodes: React.Dispatch<React.SetStateAction<Code[]>>;
  setInstructionElements: React.Dispatch<
    React.SetStateAction<InstructionElement[]>
  >;
}

const CODE_LANGS = ["javascript", "python", "html", "css"] as const;

const ELEMENT_META: Record<
  InstructionElement["type"],
  { icon: typeof Type; labelKey: string }
> = {
  text: { icon: Type, labelKey: "admin.instructionTypeText" },
  code: { icon: Code2, labelKey: "admin.codeTypeOption" },
  image: { icon: ImageIcon, labelKey: "admin.instructionTypeImage" },
  video: { icon: Video, labelKey: "admin.instructionTypeVideo" },
};

function makeElement(type: InstructionElement["type"]): InstructionElement {
  if (type === "code") return { type: "code", value: "", language: "javascript" };
  return { type, value: "" };
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={classNames(
        "rounded-md p-1 transition disabled:cursor-not-allowed disabled:opacity-30",
        FOCUS_RING,
        danger
          ? "text-[rgb(var(--error-text))] hover:bg-[rgb(var(--error)/0.15)]"
          : "text-[rgb(var(--secondary-text))] hover:bg-[rgb(var(--border)/0.5)] hover:text-[rgb(var(--text))]",
      )}
    >
      {children}
    </button>
  );
}

export default function CodeExerciseForm({
  codes,
  instructionElements,
  setCodes,
  setInstructionElements,
}: CodeExerciseFormProps) {
  const t = useTranslation();
  const [addOpen, setAddOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // ---- Instrucciones dinámicas -------------------------------------------
  const addElement = (type: InstructionElement["type"]) => {
    setInstructionElements([...instructionElements, makeElement(type)]);
    setAddOpen(false);
  };

  const updateElement = (
    index: number,
    field: "value" | "language",
    value: string,
  ) => {
    const updated = [...instructionElements];
    if (field === "language" && updated[index].type === "code") {
      updated[index] = { ...updated[index], language: value };
    } else if (field === "value") {
      updated[index] = { ...updated[index], value };
    }
    setInstructionElements(updated);
  };

  const removeElement = (index: number) => {
    if (instructionElements.length === 1) {
      setInstructionElements([{ type: "text", value: "" }]);
    } else {
      setInstructionElements(instructionElements.filter((_, i) => i !== index));
    }
  };

  const duplicateElement = (index: number) => {
    const next = [...instructionElements];
    next.splice(index + 1, 0, { ...instructionElements[index] });
    setInstructionElements(next);
  };

  const moveElement = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= instructionElements.length) return;
    const next = [...instructionElements];
    [next[index], next[target]] = [next[target], next[index]];
    setInstructionElements(next);
  };

  const reorderElement = (from: number, to: number) => {
    if (from === to) return;
    const next = [...instructionElements];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setInstructionElements(next);
  };

  // ---- Códigos ----------------------------------------------------------
  const addCode = () =>
    setCodes([
      ...codes,
      { language: "javascript", initialCode: "", expectedCode: "" },
    ]);

  const updateCode = (index: number, field: keyof Code, value: string) => {
    const updated = [...codes];
    updated[index] = { ...updated[index], [field]: value };
    setCodes(updated);
  };

  const removeCode = (index: number) => {
    if (codes.length > 1) setCodes(codes.filter((_, i) => i !== index));
  };

  const cardClass =
    "overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]";
  const headerClass =
    "flex items-center gap-2 border-b border-[rgb(var(--border))] bg-[rgb(var(--border)/0.25)] px-3 py-2";

  return (
    <div className="space-y-10">
      {/* Instrucciones dinámicas */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[rgb(var(--text))]">
          {t("admin.instructionsTitle")}
        </h2>

        <div className="space-y-3">
          {instructionElements.map((el, idx) => {
            const meta = ELEMENT_META[el.type];
            const Icon = meta.icon;
            return (
              <div
                key={idx}
                className={classNames(
                  cardClass,
                  overIndex === idx && "ring-2 ring-[rgb(var(--primary))]",
                )}
                onDragOver={(event) => {
                  if (dragIndex === null) return;
                  event.preventDefault();
                  setOverIndex(idx);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragIndex !== null) reorderElement(dragIndex, idx);
                  setDragIndex(null);
                  setOverIndex(null);
                }}
              >
                <div className={headerClass}>
                  <span
                    draggable
                    onDragStart={() => setDragIndex(idx)}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setOverIndex(null);
                    }}
                    className="cursor-grab text-[rgb(var(--secondary-text))] active:cursor-grabbing"
                  >
                    <GripVertical size={16} />
                  </span>
                  <Icon size={15} className="text-[rgb(var(--primary))]" />
                  <span className="text-xs font-bold uppercase tracking-wide text-[rgb(var(--secondary-text))]">
                    {t(meta.labelKey)}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <IconButton
                      label={t("admin.lessonContent.moveUp")}
                      disabled={idx === 0}
                      onClick={() => moveElement(idx, -1)}
                    >
                      <ChevronUp size={15} />
                    </IconButton>
                    <IconButton
                      label={t("admin.lessonContent.moveDown")}
                      disabled={idx === instructionElements.length - 1}
                      onClick={() => moveElement(idx, 1)}
                    >
                      <ChevronDown size={15} />
                    </IconButton>
                    <IconButton
                      label={t("admin.lessonContent.duplicate")}
                      onClick={() => duplicateElement(idx)}
                    >
                      <Copy size={14} />
                    </IconButton>
                    <IconButton
                      label={t("common.delete")}
                      danger
                      onClick={() => removeElement(idx)}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </div>

                <div className="p-4">
                  {el.type === "text" && (
                    <Textarea
                      value={el.value}
                      onChange={(e) => updateElement(idx, "value", e.target.value)}
                      rows={4}
                      className="font-mono"
                      placeholder={t("admin.textPlaceholder")}
                    />
                  )}

                  {el.type === "code" && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Select
                          value={el.language || "javascript"}
                          onChange={(e) =>
                            updateElement(idx, "language", e.target.value)
                          }
                          className="w-full"
                        >
                          {CODE_LANGS.map((lang) => (
                            <option key={lang} value={lang}>
                              {lang}
                            </option>
                          ))}
                        </Select>
                        <Textarea
                          value={el.value}
                          onChange={(e) =>
                            updateElement(idx, "value", e.target.value)
                          }
                          rows={6}
                          className="font-mono"
                          placeholder={t("admin.codePlaceholder")}
                        />
                      </div>
                      {el.value.trim() && (
                        <CodeHighlight
                          code={el.value}
                          language={el.language || "text"}
                          showCopy
                        />
                      )}
                    </div>
                  )}

                  {(el.type === "image" || el.type === "video") && (
                    <div className="space-y-2">
                      <input
                        type="url"
                        value={el.value}
                        onChange={(e) =>
                          updateElement(idx, "value", e.target.value)
                        }
                        placeholder={
                          el.type === "image"
                            ? t("admin.imageUrlPlaceholder")
                            : t("admin.videoUrlPlaceholder")
                        }
                        className={classNames(
                          "w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 text-sm text-[rgb(var(--text))] placeholder:text-[rgb(var(--secondary-text))]",
                          FOCUS_RING,
                        )}
                      />
                      {el.value.trim() && el.type === "image" && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={el.value.trim()}
                          alt={t("items.previewAlt")}
                          className="max-h-48 rounded-lg border border-[rgb(var(--border))] object-contain"
                          onError={(e) => {
                            toast.error(t("admin.invalidUrlToast"));
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                      {el.value.trim() && el.type === "video" && (
                        <iframe
                          src={el.value.trim()}
                          title={t("admin.videoPreviewTitle")}
                          className="h-48 w-full rounded-lg border border-[rgb(var(--border))]"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative mt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setAddOpen((open) => !open)}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            {t("admin.lessonContent.addBlock")}
          </Button>
          {addOpen && (
            <div className="absolute z-20 mt-2 grid w-56 grid-cols-1 gap-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-2 shadow-xl">
              {(Object.keys(ELEMENT_META) as InstructionElement["type"][]).map(
                (type) => {
                  const Icon = ELEMENT_META[type].icon;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addElement(type)}
                      className={classNames(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[rgb(var(--text))] transition hover:bg-[rgb(var(--border)/0.4)]",
                        FOCUS_RING,
                      )}
                    >
                      <Icon size={15} className="text-[rgb(var(--primary))]" />
                      {t(ELEMENT_META[type].labelKey)}
                    </button>
                  );
                },
              )}
            </div>
          )}
        </div>
      </section>

      {/* Códigos múltiples */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[rgb(var(--text))]">
          {t("admin.codesTitle")}
        </h2>

        <div className="space-y-3">
          {codes.map((code, idx) => (
            <div key={idx} className={cardClass}>
              <div className={headerClass}>
                <Code2 size={15} className="text-[rgb(var(--primary))]" />
                <span className="text-xs font-bold uppercase tracking-wide text-[rgb(var(--secondary-text))]">
                  {t("admin.codeNumberLabel", { index: idx + 1 })}
                </span>
                <div className="ml-auto">
                  <IconButton
                    label={t("common.delete")}
                    danger
                    disabled={codes.length <= 1}
                    onClick={() => removeCode(idx)}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <Select
                  value={code.language}
                  onChange={(e) => updateCode(idx, "language", e.target.value)}
                  className="w-full md:w-56"
                >
                  {CODE_LANGS.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </Select>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-xs text-[rgb(var(--secondary-text))]">
                      {t("admin.initialCodeLabel")}
                    </label>
                    <Textarea
                      value={code.initialCode}
                      onChange={(e) =>
                        updateCode(idx, "initialCode", e.target.value)
                      }
                      rows={6}
                      className="font-mono"
                    />
                    {code.initialCode.trim() && (
                      <CodeHighlight
                        code={code.initialCode}
                        language={code.language}
                        showCopy
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs text-[rgb(var(--secondary-text))]">
                      {t("admin.expectedCodeOptionalLabel")}
                    </label>
                    <Textarea
                      value={code.expectedCode || ""}
                      onChange={(e) =>
                        updateCode(idx, "expectedCode", e.target.value)
                      }
                      rows={6}
                      className="font-mono"
                    />
                    {code.expectedCode?.trim() && (
                      <CodeHighlight
                        code={code.expectedCode}
                        language={code.language}
                        showCopy
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          onClick={addCode}
          className="mt-3 flex items-center gap-2"
        >
          <Plus size={16} /> {t("admin.addCodeBlockButton")}
        </Button>
      </section>
    </div>
  );
}
