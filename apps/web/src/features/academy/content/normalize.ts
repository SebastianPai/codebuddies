import {
  LESSON_CONTENT_VERSION,
  type CalloutVariant,
  type HeadingLevel,
  type LessonBlock,
  type LessonBlockType,
  type LessonContentDoc,
} from "./types";

const CALLOUT_VARIANTS: CalloutVariant[] = [
  "tip",
  "info",
  "important",
  "warning",
  "success",
];

const HEADING_LEVELS: HeadingLevel[] = [2, 3, 4];

function randomId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `blk_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/** Bloque nuevo con valores por defecto sensatos para el editor. */
export function newBlock(type: LessonBlockType): LessonBlock {
  const id = randomId();
  switch (type) {
    case "heading":
      return { id, type, level: 2, text: "" };
    case "code":
      return { id, type, language: "html", code: "" };
    case "callout":
      return { id, type, variant: "tip", title: "", markdown: "" };
    case "note":
      return { id, type, markdown: "" };
    case "quote":
      return { id, type, text: "", cite: "" };
    case "image":
      return { id, type, url: "", alt: "", caption: "" };
    case "list":
      return { id, type, ordered: false, items: [""] };
    case "divider":
      return { id, type };
    case "text":
    default:
      return { id, type: "text", markdown: "" };
  }
}

function normalizeBlock(raw: unknown): LessonBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const type = record.type as LessonBlockType;
  const id = asString(record.id) || randomId();

  switch (type) {
    case "heading": {
      const level = HEADING_LEVELS.includes(record.level as HeadingLevel)
        ? (record.level as HeadingLevel)
        : 2;
      return { id, type, level, text: asString(record.text) };
    }
    case "code":
      return {
        id,
        type,
        language: asString(record.language, "plain") || "plain",
        code: asString(record.code),
        filename: asString(record.filename) || undefined,
      };
    case "callout": {
      const variant = CALLOUT_VARIANTS.includes(
        record.variant as CalloutVariant,
      )
        ? (record.variant as CalloutVariant)
        : "tip";
      return {
        id,
        type,
        variant,
        title: asString(record.title) || undefined,
        markdown: asString(record.markdown ?? record.body ?? record.text),
      };
    }
    case "note":
      return { id, type, markdown: asString(record.markdown ?? record.text) };
    case "quote":
      return {
        id,
        type,
        text: asString(record.text ?? record.markdown),
        cite: asString(record.cite) || undefined,
      };
    case "image":
      return {
        id,
        type,
        url: asString(record.url ?? record.src),
        alt: asString(record.alt),
        caption: asString(record.caption) || undefined,
      };
    case "list": {
      const items = Array.isArray(record.items)
        ? record.items.map((item) => asString(item)).filter(Boolean)
        : [];
      return {
        id,
        type,
        ordered: Boolean(record.ordered),
        items: items.length ? items : [""],
      };
    }
    case "divider":
      return { id, type };
    case "text":
      return { id, type, markdown: asString(record.markdown ?? record.text) };
    default:
      return null;
  }
}

/**
 * Acepta el doc nuevo, el formato viejo `{ markdown }`, un string suelto o
 * nada, y siempre devuelve un `LessonContentDoc` válido con ids en cada
 * bloque. El markdown legacy se convierte en un único bloque de texto.
 */
export function normalizeLessonContent(raw: unknown): LessonContentDoc {
  if (typeof raw === "string") {
    return raw.trim()
      ? {
          version: LESSON_CONTENT_VERSION,
          blocks: [{ id: randomId(), type: "text", markdown: raw }],
        }
      : emptyLessonContent();
  }

  if (raw && typeof raw === "object") {
    if (Array.isArray((raw as LessonContentDoc).blocks)) {
      const blocks = (raw as LessonContentDoc).blocks
        .map(normalizeBlock)
        .filter((block): block is LessonBlock => block !== null);
      return { version: LESSON_CONTENT_VERSION, blocks };
    }

    const legacy = (raw as { markdown?: string | null }).markdown;
    if (typeof legacy === "string" && legacy.trim()) {
      return {
        version: LESSON_CONTENT_VERSION,
        blocks: [{ id: randomId(), type: "text", markdown: legacy }],
      };
    }
  }

  return emptyLessonContent();
}

export function emptyLessonContent(): LessonContentDoc {
  return { version: LESSON_CONTENT_VERSION, blocks: [] };
}

function isBlockEmpty(block: LessonBlock): boolean {
  switch (block.type) {
    case "text":
    case "note":
      return !block.markdown.trim();
    case "heading":
      return !block.text.trim();
    case "code":
      return !block.code.trim();
    case "callout":
      return !block.markdown.trim() && !(block.title ?? "").trim();
    case "quote":
      return !block.text.trim();
    case "image":
      return !block.url.trim();
    case "list":
      return block.items.every((item) => !item.trim());
    case "divider":
      return false;
    default:
      return true;
  }
}

export function isEmptyDoc(doc: LessonContentDoc): boolean {
  return doc.blocks.every(isBlockEmpty);
}

/**
 * Limpia el doc para persistir: descarta items de lista vacíos y, si no queda
 * nada con sustancia, devuelve `null` para que la lección sin contenido siga
 * guardándose como `null` (igual que el flujo viejo).
 */
export function serializeLessonContent(
  input: unknown,
): LessonContentDoc | null {
  const doc = normalizeLessonContent(input);
  const blocks = doc.blocks.map((block) =>
    block.type === "list"
      ? {
          ...block,
          items: block.items.filter((item) => item.trim()).length
            ? block.items.filter((item) => item.trim())
            : [""],
        }
      : block,
  );
  const cleaned: LessonContentDoc = { version: LESSON_CONTENT_VERSION, blocks };
  return isEmptyDoc(cleaned) ? null : cleaned;
}
