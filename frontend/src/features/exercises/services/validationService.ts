export const normalizeCSS = (code: string) =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/; /g, ";")
    .replace(/ *{ */g, "{")
    .replace(/ *} */g, "}");

export const normalizeCode = (code: string) =>
  code
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\r\n]+/g, "")
    .toLowerCase();
