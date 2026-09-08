import { autoTranslateMany } from "@/shared/lib/translate";
import { normalizeLessonContent } from "./normalize";
import type { LessonBlock, LessonContentDoc } from "./types";

// Traduce el texto de cada bloque a `targetLang`. NO toca bloques de código
// ni URLs de imagen. Junta TODOS los textos del doc y los manda en UNA sola
// request por lote (DeepL los procesa juntos) — antes era una request por
// campo y el rate limit dejaba media lección sin traducir.

// Extrae los strings traducibles de un bloque (en orden estable).
function extractStrings(block: LessonBlock): string[] {
  switch (block.type) {
    case "text":
    case "note":
      return [block.markdown];
    case "heading":
    case "quote":
      return [block.text];
    case "callout":
      return [block.title ?? "", block.markdown];
    case "image":
      return [block.alt ?? "", block.caption ?? ""];
    case "video":
      return [block.caption ?? ""];
    case "list":
      return [...block.items];
    default:
      return [];
  }
}

// Re-inserta los strings traducidos en el bloque, en el mismo orden.
function applyStrings(block: LessonBlock, values: string[]): LessonBlock {
  switch (block.type) {
    case "text":
    case "note":
      return { ...block, markdown: values[0] };
    case "heading":
    case "quote":
      return { ...block, text: values[0] };
    case "callout":
      return {
        ...block,
        title: block.title ? values[0] : block.title,
        markdown: values[1],
      };
    case "image":
      return {
        ...block,
        alt: block.alt ? values[0] : block.alt,
        caption: block.caption ? values[1] : block.caption,
      };
    case "video":
      return { ...block, caption: block.caption ? values[0] : block.caption };
    case "list":
      return { ...block, items: values };
    default:
      return block;
  }
}

export async function translateLessonContent(
  source: unknown,
  targetLang: string,
): Promise<LessonContentDoc> {
  const doc = normalizeLessonContent(source);

  const texts: string[] = [];
  const spans: Array<{ start: number; end: number }> = [];
  for (const block of doc.blocks) {
    const strings = extractStrings(block);
    spans.push({ start: texts.length, end: texts.length + strings.length });
    texts.push(...strings);
  }

  if (texts.length === 0) return { version: doc.version, blocks: doc.blocks };

  const translated = await autoTranslateMany(texts, targetLang);
  const blocks = doc.blocks.map((block, index) => {
    const { start, end } = spans[index];
    return end > start
      ? applyStrings(block, translated.slice(start, end))
      : block;
  });

  return { version: doc.version, blocks };
}
