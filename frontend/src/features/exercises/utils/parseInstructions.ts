import { InstructionElement } from "@/types/exercise";

export const parseInstructions = (
  instructions: string
): InstructionElement[] => {
  const elements: InstructionElement[] = [];
  let inCodeBlock = false;
  let codeBlockLanguage = "";
  let codeBlockContent: string[] = [];

  const lines = instructions.split("\n");

  lines.forEach((line, index) => {
    // Misma lógica de parseo que en el original
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push({
          type: "code",
          language: codeBlockLanguage || "text",
          value: codeBlockContent.join("\n"),
        });
        inCodeBlock = false;
        codeBlockLanguage = "";
        codeBlockContent = [];
      } else {
        inCodeBlock = true;
        codeBlockLanguage = line.trim().slice(3).trim() || "text";
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      return;
    }

    if (!line.trim()) {
      elements.push({ type: "paragraph-break" });
      return;
    }

    const subLines = line.split("\\n").filter((subLine) => subLine.trim());

    subLines.forEach((subLine, subIndex) => {
      const imageMatch =
        subLine.match(/!\[.*?\]\((.*?)\)/) ||
        subLine.match(/(https?:\/\/.*\.(?:png|jpg|jpeg|gif))/i);
      if (imageMatch) {
        elements.push({
          type: "image",
          value: imageMatch[1] || imageMatch[0],
        });
        if (subIndex < subLines.length - 1) {
          elements.push({ type: "paragraph-break" });
        }
        return;
      }

      if (subLine.trim().startsWith("- ") || subLine.trim().startsWith("* ")) {
        const content = subLine.slice(subLine.indexOf(subLine.trim()[0]) + 2);
        if (content) {
          const parts: InstructionElement[] = [];
          let currentText = "";
          const regex =
            /(\*\*[^\*]+\*\*)|(__[^_]+__)|(_[^_]+_)|(`[^`]+`)|(##[^#]+##)|(<[a-zA-Z0-9]+>)/g;
          let lastIndex = 0;
          let match;

          while ((match = regex.exec(content)) !== null) {
            const matchStart = match.index;
            const matchEnd = matchStart + match[0].length;

            if (lastIndex < matchStart) {
              currentText = content.slice(lastIndex, matchStart);
              if (currentText) {
                parts.push({ type: "text", value: currentText });
              }
            }

            const matchedText = match[0];
            if (matchedText.startsWith("**") && matchedText.endsWith("**")) {
              parts.push({
                type: "highlight",
                value: matchedText.slice(2, -2),
              });
            } else if (
              matchedText.startsWith("__") &&
              matchedText.endsWith("__")
            ) {
              parts.push({
                type: "highlight-secondary",
                value: matchedText.slice(2, -2),
              });
            } else if (
              matchedText.startsWith("_") &&
              matchedText.endsWith("_")
            ) {
              parts.push({
                type: "underline",
                value: matchedText.slice(1, -1),
              });
            } else if (
              matchedText.startsWith("`") &&
              matchedText.endsWith("`")
            ) {
              parts.push({
                type: "inline-code",
                value: matchedText.slice(1, -1),
              });
            } else if (
              matchedText.startsWith("##") &&
              matchedText.endsWith("##")
            ) {
              parts.push({
                type: "title",
                value: matchedText.slice(2, -2),
              });
            } else if (matchedText.match(/^<[a-zA-Z0-9]+>$/)) {
              parts.push({
                type: "inline-code",
                value: matchedText.slice(1, -1),
              });
            }

            lastIndex = matchEnd;
          }

          if (lastIndex < content.length) {
            currentText = content.slice(lastIndex);
            if (currentText) {
              parts.push({ type: "text", value: currentText });
            }
          }

          elements.push({
            type: "list-item",
            value: JSON.stringify(parts),
          });
        }
        if (subIndex < subLines.length - 1) {
          elements.push({ type: "paragraph-break" });
        }
        return;
      }

      let currentText = "";
      const regex =
        /(\*\*[^\*]+\*\*)|(__[^_]+__)|(_[^_]+_)|(`[^`]+`)|(##[^#]+##)|(<[a-zA-Z0-9]+>)/g;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(subLine)) !== null) {
        const matchStart = match.index;
        const matchEnd = matchStart + match[0].length;

        if (lastIndex < matchStart) {
          currentText = subLine.slice(lastIndex, matchStart);
          if (currentText) {
            elements.push({ type: "text", value: currentText });
          }
        }

        const matchedText = match[0];
        if (matchedText.startsWith("**") && matchedText.endsWith("**")) {
          elements.push({
            type: "highlight",
            value: matchedText.slice(2, -2),
          });
        } else if (matchedText.startsWith("__") && matchedText.endsWith("__")) {
          elements.push({
            type: "highlight-secondary",
            value: matchedText.slice(2, -2),
          });
        } else if (matchedText.startsWith("_") && matchedText.endsWith("_")) {
          elements.push({
            type: "underline",
            value: matchedText.slice(1, -1),
          });
        } else if (matchedText.startsWith("`") && matchedText.endsWith("`")) {
          elements.push({
            type: "inline-code",
            value: matchedText.slice(1, -1),
          });
        } else if (matchedText.startsWith("##") && matchedText.endsWith("##")) {
          elements.push({
            type: "title",
            value: matchedText.slice(2, -2),
          });
        } else if (matchedText.match(/^<[a-zA-Z0-9]+>$/)) {
          elements.push({
            type: "inline-code",
            value: matchedText.slice(1, -1),
          });
        }

        lastIndex = matchEnd;
      }

      if (lastIndex < subLine.length) {
        currentText = subLine.slice(lastIndex);
        if (currentText) {
          elements.push({ type: "text", value: currentText });
        }
      }

      if (subIndex < subLines.length - 1) {
        elements.push({ type: "paragraph-break" });
      }
    });
  });

  if (inCodeBlock && codeBlockContent.length > 0) {
    elements.push({
      type: "code",
      language: codeBlockLanguage || "text",
      value: codeBlockContent.join("\n"),
    });
  }

  return elements;
};
