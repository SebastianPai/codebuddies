import type { LessonBlock } from "@/features/academy";
import type { InstructionElement } from "../types";

// Red de seguridad para rollback: junto al doc de bloques nuevo se guarda un
// `instructionElements` legacy sintetizado. Si el frontend vuelve a la versión
// anterior, el ejercicio sigue mostrando algo (texto/código/imagen/video);
// callouts, notas, citas y listas caen a texto/markdown.
export function blocksToInstructionElements(
  blocks: LessonBlock[],
): InstructionElement[] {
  const out: InstructionElement[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "text":
      case "note":
        if (block.markdown.trim())
          out.push({ type: "text", value: block.markdown });
        break;
      case "heading":
        if (block.text.trim())
          out.push({ type: "text", value: `${"#".repeat(block.level)} ${block.text}` });
        break;
      case "code":
        if (block.code.trim())
          out.push({ type: "code", value: block.code, language: block.language });
        break;
      case "callout":
        if (block.markdown.trim() || (block.title ?? "").trim())
          out.push({
            type: "text",
            value: block.title?.trim()
              ? `**${block.title.trim()}**\n\n${block.markdown}`
              : block.markdown,
          });
        break;
      case "quote":
        if (block.text.trim())
          out.push({ type: "text", value: `> ${block.text}` });
        break;
      case "list":
        if (block.items.some((item) => item.trim()))
          out.push({
            type: "text",
            value: block.items
              .filter((item) => item.trim())
              .map((item, index) =>
                block.ordered ? `${index + 1}. ${item}` : `- ${item}`,
              )
              .join("\n"),
          });
        break;
      case "image":
        if (block.url.trim()) out.push({ type: "image", value: block.url });
        break;
      case "video":
        if (block.url.trim()) out.push({ type: "video", value: block.url });
        break;
      case "divider":
        out.push({ type: "text", value: "---" });
        break;
    }
  }
  return out;
}
