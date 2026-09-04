"use client";

import { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { useTranslation } from "@/i18n/useTranslation";
import {
  Button,
  Card,
  Input,
  MarkdownEditor,
  Select,
  Switch,
  Textarea,
} from "@/shared/ui";
import { classNames } from "@/shared/utils/class-names";
import { FOCUS_RING } from "@/shared/ui/styles";
import {
  BLOCK_DEFINITIONS,
  CALLOUT_VARIANTS,
  CODE_LANGUAGES,
  getBlockDefinition,
  LessonContentRenderer,
  newBlock,
  type LessonBlock,
  type LessonBlockType,
  type LessonContentDoc,
} from "@/features/academy";

interface LessonContentEditorProps {
  value: LessonContentDoc;
  onChange: (doc: LessonContentDoc) => void;
}

type Mode = "edit" | "preview";

export function LessonContentEditor({
  value,
  onChange,
}: LessonContentEditorProps) {
  const t = useTranslation();
  const [mode, setMode] = useState<Mode>("edit");
  const [addOpen, setAddOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const dragIndex = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const blocks = value.blocks;

  const setBlocks = (next: LessonBlock[]) =>
    onChange({ ...value, blocks: next });

  const updateBlock = (id: string, patch: Partial<LessonBlock>) =>
    setBlocks(
      blocks.map((block) =>
        block.id === id ? ({ ...block, ...patch } as LessonBlock) : block,
      ),
    );

  const addBlock = (type: LessonBlockType) => {
    setBlocks([...blocks, newBlock(type)]);
    setAddOpen(false);
  };

  const removeBlock = (id: string) =>
    setBlocks(blocks.filter((block) => block.id !== id));

  const duplicateBlock = (id: string) => {
    const index = blocks.findIndex((block) => block.id === id);
    if (index === -1) return;
    const clone = { ...blocks[index], id: newBlock(blocks[index].type).id };
    const next = [...blocks];
    next.splice(index + 1, 0, clone as LessonBlock);
    setBlocks(next);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(next);
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setBlocks(next);
  };

  const toggleCollapsed = (id: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const tabClass = (active: boolean) =>
    classNames(
      "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition",
      FOCUS_RING,
      active
        ? "bg-[rgb(var(--primary))] text-[rgb(var(--button-text))]"
        : "text-[rgb(var(--secondary-text))] hover:text-[rgb(var(--text))]",
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--border))] pb-3">
        <div className="flex items-center gap-2 text-[rgb(var(--primary))]">
          <Pencil size={16} />
          <h3 className="text-sm font-semibold">
            {t("admin.lessonContent.title")}
          </h3>
          <span className="text-xs text-[rgb(var(--secondary-text))]">
            {t("admin.lessonContent.blockCount", { count: blocks.length })}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-[rgb(var(--border))] p-1">
          <button
            type="button"
            className={tabClass(mode === "edit")}
            onClick={() => setMode("edit")}
          >
            <Pencil size={14} />
            {t("admin.lessonContent.edit")}
          </button>
          <button
            type="button"
            className={tabClass(mode === "preview")}
            onClick={() => setMode("preview")}
          >
            <Eye size={14} />
            {t("admin.lessonContent.preview")}
          </button>
        </div>
      </div>

      {mode === "preview" ? (
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-6">
          {blocks.length ? (
            <LessonContentRenderer doc={value} />
          ) : (
            <p className="text-sm text-[rgb(var(--secondary-text))]">
              {t("admin.lessonContent.empty")}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {blocks.map((block, index) => {
              const definition = getBlockDefinition(block.type);
              const Icon = definition.icon;
              const isCollapsed = collapsed.has(block.id);
              return (
                <Card
                  key={block.id}
                  className={classNames(
                    "overflow-hidden",
                    overIndex === index && "ring-2 ring-[rgb(var(--primary))]",
                  )}
                  onDragOver={(event) => {
                    if (dragIndex.current === null) return;
                    event.preventDefault();
                    setOverIndex(index);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragIndex.current !== null) {
                      reorder(dragIndex.current, index);
                    }
                    dragIndex.current = null;
                    setOverIndex(null);
                  }}
                >
                  <div className="flex items-center gap-2 border-b border-[rgb(var(--border))] bg-[rgb(var(--border)/0.25)] px-3 py-2">
                    <span
                      draggable
                      onDragStart={() => {
                        dragIndex.current = index;
                      }}
                      onDragEnd={() => {
                        dragIndex.current = null;
                        setOverIndex(null);
                      }}
                      className="cursor-grab text-[rgb(var(--secondary-text))] active:cursor-grabbing"
                      aria-label={t("admin.lessonContent.drag")}
                    >
                      <GripVertical size={16} />
                    </span>
                    <Icon size={15} className="text-[rgb(var(--primary))]" />
                    <span className="text-xs font-bold uppercase tracking-wide text-[rgb(var(--secondary-text))]">
                      {t(`admin.lessonContent.block.${definition.labelKey}`)}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <IconButton
                        label={t("admin.lessonContent.moveUp")}
                        disabled={index === 0}
                        onClick={() => moveBlock(index, -1)}
                      >
                        <ChevronUp size={15} />
                      </IconButton>
                      <IconButton
                        label={t("admin.lessonContent.moveDown")}
                        disabled={index === blocks.length - 1}
                        onClick={() => moveBlock(index, 1)}
                      >
                        <ChevronDown size={15} />
                      </IconButton>
                      <IconButton
                        label={t("admin.lessonContent.duplicate")}
                        onClick={() => duplicateBlock(block.id)}
                      >
                        <Copy size={14} />
                      </IconButton>
                      <IconButton
                        label={t("admin.lessonContent.collapse")}
                        onClick={() => toggleCollapsed(block.id)}
                      >
                        {isCollapsed ? (
                          <ChevronDown size={15} />
                        ) : (
                          <ChevronUp size={15} />
                        )}
                      </IconButton>
                      <IconButton
                        label={t("admin.lessonContent.delete")}
                        danger
                        onClick={() => removeBlock(block.id)}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  </div>
                  {!isCollapsed && (
                    <div className="p-4">
                      <BlockFields
                        block={block}
                        onChange={(patch) => updateBlock(block.id, patch)}
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <div className="relative">
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
              <div className="absolute z-20 mt-2 grid w-64 grid-cols-1 gap-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-2 shadow-xl">
                {BLOCK_DEFINITIONS.map((definition) => {
                  const Icon = definition.icon;
                  return (
                    <button
                      key={definition.type}
                      type="button"
                      onClick={() => addBlock(definition.type)}
                      className={classNames(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[rgb(var(--text))] transition hover:bg-[rgb(var(--border)/0.4)]",
                        FOCUS_RING,
                      )}
                    >
                      <Icon size={15} className="text-[rgb(var(--primary))]" />
                      {t(`admin.lessonContent.block.${definition.labelKey}`)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-xs text-[rgb(var(--secondary-text))]">
      {children}
    </label>
  );
}

function BlockFields({
  block,
  onChange,
}: {
  block: LessonBlock;
  onChange: (patch: Partial<LessonBlock>) => void;
}) {
  const t = useTranslation();
  const p = (patch: Record<string, unknown>) =>
    onChange(patch as Partial<LessonBlock>);

  switch (block.type) {
    case "heading":
      return (
        <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
          <div>
            <FieldLabel>{t("admin.lessonContent.field.level")}</FieldLabel>
            <Select
              value={block.level}
              onChange={(event) => p({ level: Number(event.target.value) })}
              className="w-full"
            >
              <option value={2}>H2</option>
              <option value={3}>H3</option>
              <option value={4}>H4</option>
            </Select>
          </div>
          <div>
            <FieldLabel>{t("admin.lessonContent.field.text")}</FieldLabel>
            <Input
              value={block.text}
              onChange={(event) => p({ text: event.target.value })}
              placeholder={t("admin.lessonContent.field.headingPlaceholder")}
            />
          </div>
        </div>
      );

    case "text":
    case "note":
      return (
        <MarkdownEditor
          value={block.markdown}
          onChange={(markdown) => p({ markdown })}
          rows={6}
        />
      );

    case "code":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>{t("admin.lessonContent.field.language")}</FieldLabel>
              <Select
                value={block.language}
                onChange={(event) => p({ language: event.target.value })}
                className="w-full"
              >
                {CODE_LANGUAGES.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel>{t("admin.lessonContent.field.filename")}</FieldLabel>
              <Input
                value={block.filename ?? ""}
                onChange={(event) => p({ filename: event.target.value })}
                placeholder="index.html"
              />
            </div>
          </div>
          <Textarea
            value={block.code}
            onChange={(event) => p({ code: event.target.value })}
            rows={6}
            className="font-mono"
            placeholder={"<h1>Hello, CodeBuddies!</h1>"}
          />
        </div>
      );

    case "callout":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>{t("admin.lessonContent.field.variant")}</FieldLabel>
              <Select
                value={block.variant}
                onChange={(event) => p({ variant: event.target.value })}
                className="w-full"
              >
                {CALLOUT_VARIANTS.map((variant) => (
                  <option key={variant} value={variant}>
                    {t(`site.academyLesson.callout.${variant}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel>{t("admin.lessonContent.field.title")}</FieldLabel>
              <Input
                value={block.title ?? ""}
                onChange={(event) => p({ title: event.target.value })}
                placeholder={t("admin.lessonContent.field.titleOptional")}
              />
            </div>
          </div>
          <MarkdownEditor
            value={block.markdown}
            onChange={(markdown) => p({ markdown })}
            rows={4}
          />
        </div>
      );

    case "quote":
      return (
        <div className="space-y-3">
          <Textarea
            value={block.text}
            onChange={(event) => p({ text: event.target.value })}
            rows={3}
            placeholder={t("admin.lessonContent.field.quotePlaceholder")}
          />
          <Input
            value={block.cite ?? ""}
            onChange={(event) => p({ cite: event.target.value })}
            placeholder={t("admin.lessonContent.field.citeOptional")}
          />
        </div>
      );

    case "image":
      return (
        <div className="space-y-3">
          <Input
            value={block.url}
            onChange={(event) => p({ url: event.target.value })}
            placeholder="https://..."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={block.alt}
              onChange={(event) => p({ alt: event.target.value })}
              placeholder={t("admin.lessonContent.field.altText")}
            />
            <Input
              value={block.caption ?? ""}
              onChange={(event) => p({ caption: event.target.value })}
              placeholder={t("admin.lessonContent.field.captionOptional")}
            />
          </div>
          {block.url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={block.url}
              alt={block.alt}
              className="max-h-48 rounded-lg border border-[rgb(var(--border))] object-contain"
            />
          )}
        </div>
      );

    case "list":
      return (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs text-[rgb(var(--secondary-text))]">
            <Switch
              checked={block.ordered}
              onChange={(event) => p({ ordered: event.target.checked })}
            />
            {t("admin.lessonContent.field.ordered")}
          </label>
          <div className="space-y-2">
            {block.items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-5 text-right text-xs text-[rgb(var(--secondary-text))]">
                  {block.ordered ? `${index + 1}.` : "•"}
                </span>
                <Input
                  value={item}
                  onChange={(event) => {
                    const items = [...block.items];
                    items[index] = event.target.value;
                    p({ items });
                  }}
                />
                <IconButton
                  label={t("admin.lessonContent.delete")}
                  danger
                  disabled={block.items.length === 1}
                  onClick={() =>
                    p({ items: block.items.filter((_, i) => i !== index) })
                  }
                >
                  <Trash2 size={14} />
                </IconButton>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => p({ items: [...block.items, ""] })}
            className="flex items-center gap-1 text-xs"
          >
            <Plus size={13} />
            {t("admin.lessonContent.field.addItem")}
          </Button>
        </div>
      );

    case "divider":
      return (
        <p className="text-xs italic text-[rgb(var(--secondary-text))]">
          {t("admin.lessonContent.field.dividerHint")}
        </p>
      );

    default:
      return null;
  }
}

export default LessonContentEditor;
