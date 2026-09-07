import { autoTranslate } from "@/shared/lib/translate";
import { normalizeLessonContent } from "./normalize";
import type { LessonBlock, LessonContentDoc } from "./types";

// Traduce el texto de cada bloque a `targetLang`. NO toca bloques de código
// ni URLs de imagen. Secuencial a propósito: el endpoint /translate suele
// tener rate limit y una lección puede tener muchos bloques.
async function translateBlock(
  block: LessonBlock,
  targetLang: string,
): Promise<LessonBlock> {
  switch (block.type) {
    case "text":
    case "note":
      return { ...block, markdown: await autoTranslate(block.markdown, targetLang) };
    case "heading":
      return { ...block, text: await autoTranslate(block.text, targetLang) };
    case "callout":
      return {
        ...block,
        title: block.title
          ? await autoTranslate(block.title, targetLang)
          : block.title,
        markdown: await autoTranslate(block.markdown, targetLang),
      };
    case "quote":
      return { ...block, text: await autoTranslate(block.text, targetLang) };
    case "image":
      return {
        ...block,
        alt: block.alt ? await autoTranslate(block.alt, targetLang) : block.alt,
        caption: block.caption
          ? await autoTranslate(block.caption, targetLang)
          : block.caption,
      };
    case "list": {
      const items: string[] = [];
      for (const item of block.items) {
        items.push(item.trim() ? await autoTranslate(item, targetLang) : item);
      }
      return { ...block, items };
    }
    case "code":
    case "divider":
    default:
      return block;
  }
}

export async function translateLessonContent(
  source: unknown,
  targetLang: string,
): Promise<LessonContentDoc> {
  const doc = normalizeLessonContent(source);
  const blocks: LessonBlock[] = [];
  for (const block of doc.blocks) {
    blocks.push(await translateBlock(block, targetLang));
  }
  return { version: doc.version, blocks };
}
