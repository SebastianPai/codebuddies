import { splitJsChecks, BUDDY_NOT_YET, BUDDY_RUNTIME, buddyFriendlyError, friendlyLang, NAVE_NOT_YET, NAVE_RUNTIME, naveFriendlyError, naveLevelFrom, PYTHON_TEXTS, pythonMsgLang, pythonResultMessage } from '@codebuddies/world-objects';
import { runPython } from './python-runner';
import { runJsJob } from './js-runner';

// Validación server-side de los ejercicios de código.
//
// `expectedCode` (codes[0].expectedCode en la base) se usa de DOS formas
// distintas según cómo lo escribió quien creó el ejercicio:
//   1. Verificaciones: un bloque de `assert(condición, mensaje)` (JS).
//   2. Respuesta modelo: el código que resuelve el ejercicio, p.ej.
//      `<h1>Hello, CodeBuddies!</h1>`.
// Antes TODO se ejecutaba como JS, así que cualquier ejercicio de HTML con
// respuesta modelo fallaba siempre con "Unexpected token '<'". Ahora se
// detecta el formato y cada lenguaje se compara como corresponde, con un
// mensaje que dice exactamente qué corregir.

export type CodeResult = { description: string; passed: boolean; error?: string };
export type CodeLang = 'html' | 'css' | 'js' | 'buddy' | 'nave' | 'python' | 'web';
type Msg = 'es' | 'en' | 'de';

export function normalizeLang(language?: string | null): CodeLang {
  const value = (language ?? '').toLowerCase();
  if (value === 'html' || value === 'markup' || value === 'xml') return 'html';
  if (value === 'css') return 'css';
  if (value === 'buddy') return 'buddy';
  if (value === 'nave') return 'nave';
  if (value === 'python' || value === 'py') return 'python';
  if (value === 'web') return 'web';
  return 'js';
}

export function looksLikeAssertions(code: string) {
  return /\bassert\s*\(/.test(code);
}

const t = (lang: Msg, es: string, en: string, de: string) => (lang === 'en' ? en : lang === 'de' ? de : es);

export function messageLang(lang?: string | null): Msg {
  const value = (lang ?? '').toLowerCase();
  if (value.startsWith('en')) return 'en';
  if (value.startsWith('de')) return 'de';
  return 'es';
}

// ─── JS en sandbox ────────────────────────────────────────────────────────

// Los errores de un vm.createContext() son de OTRO realm: `instanceof Error`
// da false aunque tengan `.message`.
export function describeSandboxError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return 'Error de ejecución';
}

// Todo el JavaScript de alumnos corre en un proceso aislado (js-runner.ts).
// Antes corría con node:vm dentro de la API y se podía salir del contexto.

async function runJs(code: string): Promise<{ logs: string[]; error?: string }> {
  const r = await runJsJob({ script: code });
  return { logs: r.logs, ...(r.ok ? {} : { error: r.error ?? 'Error de ejecución' }) };
}

// splitJsChecks: ver @codebuddies/world-objects (webcheck.ts), lo comparte la web.
export { splitJsChecks };

/**
 * JS con verificaciones: el código del alumno corre en SU propio script (un
 * `return` suelto es error, no un atajo para saltear las pruebas), con los
 * prototipos básicos congelados, y después las pruebas con un assert que el
 * alumno no puede tocar. Las pruebas pueden usar await.
 */
export async function runAssertionBlock(studentCode: string, expectedCode: string): Promise<CodeResult[]> {
  const { setup, tests } = splitJsChecks(expectedCode);
  const r = await runJsJob({ setup, student: studentCode, tests, harden: true });
  return r.ok ? [{ description: 'Assertions', passed: true }] : [{ description: 'Assertions', passed: false, error: r.error ?? 'Assertion failed' }];
}

export async function runCodeTests(studentCode: string, tests: Array<{ description: string; assertCode: string }>): Promise<CodeResult[]> {
  const out: CodeResult[] = [];
  for (const test of tests) {
    // Contexto nuevo por test: nada de estado compartido.
    const r = await runJsJob({ script: `${studentCode}\n;(${test.assertCode})`, returnBool: true });
    out.push(r.ok ? { description: test.description, passed: Boolean(r.value) } : { description: test.description, passed: false, error: r.error });
  }
  return out;
}

// ─── Páginas web (HTML + CSS + JS) verificadas en el servidor ─────────────
// El alumno manda sus tres archivos como JSON {html, css, js}. Se arma la
// página con un DOM real (linkedom) dentro del proceso aislado, corre su JS y
// después las pruebas, que pueden hacer clic, escribir en campos, enviar
// formularios y leer el CSS (css(".card", "display")).

export type WebFiles = { html: string; css: string; js: string };

export function parseWebFiles(code: string): WebFiles {
  try {
    const v = JSON.parse(code);
    if (v && typeof v === 'object') {
      return { html: String(v.html ?? ''), css: String(v.css ?? ''), js: String(v.js ?? '') };
    }
  } catch {
    /* no es JSON: se toma como HTML */
  }
  return { html: String(code ?? ''), css: '', js: '' };
}

export function buildWebDocument(files: WebFiles): string {
  const html = files.html;
  const style = files.css.trim() ? `<style>${files.css.replace(/<\/style/gi, '<\\/style')}</style>` : '';
  if (/<html[\s>]/i.test(html)) {
    if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${style}</head>`);
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${style}</head>`);
  }
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${style}</head><body>${html}</body></html>`;
}

export async function runWebExercise(studentCode: string, expectedCode: string, lang: Msg): Promise<CodeResult[]> {
  const files = parseWebFiles(studentCode);
  if (!files.html.trim() && !files.css.trim() && !files.js.trim()) {
    return [{ description: 'Web', passed: false, error: t(lang, 'Escribe tu código en el editor.', 'Write your code in the editor.', 'Schreib deinen Code in den Editor.') }];
  }
  const { setup, tests } = splitJsChecks(expectedCode);
  const r = await runJsJob({ dom: buildWebDocument(files), sources: files, setup, student: files.js, tests, harden: true });
  return r.ok ? [{ description: 'Web', passed: true }] : [{ description: 'Web', passed: false, error: r.error ?? 'Assertion failed' }];
}

// ─── HTML ─────────────────────────────────────────────────────────────────

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

type HtmlNode = { tag: string; text: string };

// Tokenizador chico pero suficiente para HTML de principiantes: devuelve los
// elementos en orden de apertura con el texto DIRECTO que contienen, y si
// alguna etiqueta quedó sin cerrar. Ignora comentarios, doctype, scripts y
// estilos (no son estructura visible).
export function parseHtml(source: string): { nodes: HtmlNode[]; unclosed: string[] } {
  const html = source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const nodes: HtmlNode[] = [];
  const stack: number[] = [];
  const tagPattern = /<\/?([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g;
  let last = 0;
  let match: RegExpExecArray | null;
  const appendText = (text: string) => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean || stack.length === 0) return;
    const node = nodes[stack[stack.length - 1]];
    node.text = node.text ? `${node.text} ${clean}` : clean;
  };
  while ((match = tagPattern.exec(html))) {
    appendText(html.slice(last, match.index));
    last = tagPattern.lastIndex;
    const tag = match[1].toLowerCase();
    const closing = match[0].startsWith('</');
    if (closing) {
      const index = [...stack].reverse().findIndex((position) => nodes[position].tag === tag);
      if (index >= 0) stack.splice(stack.length - 1 - index);
      continue;
    }
    nodes.push({ tag, text: '' });
    if (!VOID_TAGS.has(tag) && match[2] !== '/') stack.push(nodes.length - 1);
  }
  appendText(html.slice(last));
  // html/head/body son opcionales: si el alumno no los escribe no es error.
  const structural = new Set(['html', 'head', 'body']);
  return {
    nodes: nodes.filter((node) => !structural.has(node.tag)),
    unclosed: stack.map((position) => nodes[position].tag).filter((tag) => !structural.has(tag)),
  };
}

// Comparación de texto amable con principiantes: sin importar mayúsculas,
// tildes, signos de puntuación ni espacios repetidos.
export function normalizeText(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function compareHtml(studentCode: string, expectedCode: string, lang: Msg): CodeResult[] {
  const expected = parseHtml(expectedCode);
  const student = parseHtml(studentCode);
  const results: CodeResult[] = [];

  if (!studentCode.trim()) {
    return [{ description: 'HTML', passed: false, error: t(lang, 'Escribe tu código en el editor.', 'Write your code in the editor.', 'Schreib deinen Code in den Editor.') }];
  }

  const studentTags = student.nodes.map((node) => node.tag);
  const expectedTags = expected.nodes.map((node) => node.tag);
  const count = (tags: string[], tag: string) => tags.filter((value) => value === tag).length;
  const missing = [...new Set(expectedTags)].filter((tag) => count(studentTags, tag) < count(expectedTags, tag));
  if (missing.length > 0) {
    const tag = missing[0];
    results.push({
      description: `<${tag}>`,
      passed: false,
      error: t(lang, `Falta el elemento <${tag}>.`, `The <${tag}> element is missing.`, `Das Element <${tag}> fehlt.`),
    });
    return results;
  }

  const unclosed = student.unclosed.filter((tag) => expectedTags.includes(tag));
  if (unclosed.length > 0) {
    const tag = unclosed[0];
    return [
      {
        description: `</${tag}>`,
        passed: false,
        error: t(lang, `Te falta cerrar la etiqueta: agrega </${tag}>.`, `You need to close the tag: add </${tag}>.`, `Du musst das Tag schließen: füge </${tag}> hinzu.`),
      },
    ];
  }

  // El texto de cada elemento esperado (en orden) debe coincidir con el del
  // elemento equivalente del alumno.
  const used = new Set<number>();
  for (const node of expected.nodes) {
    const index = student.nodes.findIndex((candidate, position) => !used.has(position) && candidate.tag === node.tag);
    used.add(index);
    const actual = student.nodes[index];
    if (!node.text) continue;
    if (normalizeText(actual.text) !== normalizeText(node.text)) {
      results.push({
        description: `<${node.tag}>`,
        passed: false,
        error: actual.text
          ? t(
              lang,
              `El texto de <${node.tag}> debe ser «${node.text}» y escribiste «${actual.text}».`,
              `The text of <${node.tag}> must be “${node.text}” and you wrote “${actual.text}”.`,
              `Der Text von <${node.tag}> muss „${node.text}“ sein, du hast „${actual.text}“ geschrieben.`,
            )
          : t(lang, `El elemento <${node.tag}> está vacío: escribe «${node.text}» adentro.`, `The <${node.tag}> element is empty: write “${node.text}” inside.`, `Das Element <${node.tag}> ist leer: schreib „${node.text}“ hinein.`),
      });
      return results;
    }
  }
  return [{ description: 'HTML', passed: true }];
}

// ─── CSS ──────────────────────────────────────────────────────────────────

export function parseCss(source: string): Array<{ selector: string; property: string; value: string }> {
  const rules: Array<{ selector: string; property: string; value: string }> = [];
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = blockPattern.exec(clean))) {
    const selectors = match[1].split(',').map((selector) => selector.trim().replace(/\s+/g, ' ').toLowerCase()).filter(Boolean);
    for (const declaration of match[2].split(';')) {
      const [property, ...rest] = declaration.split(':');
      if (!property || rest.length === 0) continue;
      const value = rest.join(':').trim().replace(/\s+/g, ' ').replace(/\s*!important$/i, '').toLowerCase();
      for (const selector of selectors) rules.push({ selector, property: property.trim().toLowerCase(), value });
    }
  }
  return rules;
}

export function compareCss(studentCode: string, expectedCode: string, lang: Msg): CodeResult[] {
  const student = parseCss(studentCode);
  for (const rule of parseCss(expectedCode)) {
    const found = student.find((candidate) => candidate.selector === rule.selector && candidate.property === rule.property);
    if (!found) {
      return [
        {
          description: rule.selector,
          passed: false,
          error: t(lang, `Falta «${rule.property}» en «${rule.selector}».`, `“${rule.property}” is missing in “${rule.selector}”.`, `„${rule.property}“ fehlt in „${rule.selector}“.`),
        },
      ];
    }
    if (found.value !== rule.value) {
      return [
        {
          description: rule.selector,
          passed: false,
          error: t(
            lang,
            `En «${rule.selector}», «${rule.property}» debe ser «${rule.value}» (tienes «${found.value}»).`,
            `In “${rule.selector}”, “${rule.property}” must be “${rule.value}” (you have “${found.value}”).`,
            `In „${rule.selector}“ muss „${rule.property}“ „${rule.value}“ sein (du hast „${found.value}“).`,
          ),
        },
      ];
    }
  }
  return [{ description: 'CSS', passed: true }];
}

// ─── JS con respuesta modelo: se compara lo que imprime ───────────────────

export async function compareJsOutput(studentCode: string, expectedCode: string, lang: Msg): Promise<CodeResult[]> {
  const expected = await runJs(expectedCode);
  const student = await runJs(studentCode);
  if (student.error) return [{ description: 'JS', passed: false, error: student.error }];
  const normalize = (lines: string[]) => lines.map((line) => line.trim()).join('\n');
  if (expected.logs.length > 0 && normalize(student.logs) !== normalize(expected.logs)) {
    return [
      {
        description: 'console.log',
        passed: false,
        error: t(
          lang,
          `La consola debería mostrar «${normalize(expected.logs)}» y muestra «${normalize(student.logs) || '(nada)'}».`,
          `The console should show “${normalize(expected.logs)}” but shows “${normalize(student.logs) || '(nothing)'}”.`,
          `Die Konsole sollte „${normalize(expected.logs)}“ zeigen, zeigt aber „${normalize(student.logs) || '(nichts)'}“.`,
        ),
      },
    ];
  }
  return [{ description: 'JS', passed: true }];
}

// ─── Buddy (cursos para niños) ────────────────────────────────────────────
// El código del alumno le da órdenes a `buddy` (ver BUDDY_RUNTIME en
// @codebuddies/world-objects, el mismo motor que anima la vista previa) y
// las verificaciones miran cómo quedó: assert(buddy.animo === "riendo", "...").

export async function runBuddy(studentCode: string, expectedCode: string, lang?: string | null): Promise<CodeResult[]> {
  const l = friendlyLang(lang);
  const r = await runJsJob({
    script: `
      var __CB_LANG = ${JSON.stringify(l)};
      function assert(condition, message) {
        if (!condition) throw new Error(message || ${JSON.stringify(BUDDY_NOT_YET[l])});
      }
      ${BUDDY_RUNTIME}
      ;(function () {
        ${studentCode}
      })();
      ${expectedCode}
    `,
  });
  return r.ok ? [{ description: 'Buddy', passed: true }] : [{ description: 'Buddy', passed: false, error: buddyFriendlyError(r.error ?? '', l) }];
}

// ─── La nave (curso 2 "Crea tu juego") ───────────────────────────────────
// Igual que Buddy, con NAVE_RUNTIME. El nivel (aliens y dónde arranca la
// nave) sale del comentario `// nivel: {...}` de las verificaciones.

export async function runNave(studentCode: string, expectedCode: string, lang?: string | null): Promise<CodeResult[]> {
  const l = friendlyLang(lang);
  const r = await runJsJob({
    script: `
      var __CB_LANG = ${JSON.stringify(l)};
      var __NAVE_NIVEL = ${JSON.stringify(naveLevelFrom(expectedCode) ?? {})};
      function assert(condition, message) {
        if (!condition) throw new Error(message || ${JSON.stringify(NAVE_NOT_YET[l])});
      }
      ${NAVE_RUNTIME}
      ;(function () {
        ${studentCode}
      })();
      ${expectedCode}
    `,
  });
  return r.ok ? [{ description: 'Nave', passed: true }] : [{ description: 'Nave', passed: false, error: naveFriendlyError(r.error ?? '', l) }];
}

// ─── Código por idioma ────────────────────────────────────────────────────

/**
 * Un ejercicio puede tener su código (inicial y pruebas) en cada idioma:
 * codes = [{ language: "python", ... }, { language: "python", lang: "en", ... }].
 * La entrada sin `lang` es la original (español). Se elige la del idioma del
 * alumno y, si no hay, la original.
 */
export function pickCodeEntry<T extends { lang?: string | null }>(codes: unknown, lang?: string | null): (T & Record<string, any>) | undefined {
  if (!Array.isArray(codes) || codes.length === 0) return undefined;
  const list = codes as Array<T & Record<string, any>>;
  const want = String(lang ?? '').toLowerCase().slice(0, 2);
  return (want && list.find((c) => c?.lang === want)) || list.find((c) => !c?.lang) || list[0];
}

// ─── Punto de entrada ─────────────────────────────────────────────────────

export async function validateCode(input: {
  language?: string | null;
  studentCode: string;
  expectedCode?: string | null;
  tests?: Array<{ description: string; assertCode: string }> | null;
  lang?: string | null;
}): Promise<CodeResult[]> {
  const language = normalizeLang(input.language);
  const lang = messageLang(input.lang);
  const expectedCode = input.expectedCode?.trim() ?? '';

  if (language === 'buddy') {
    return expectedCode
      ? runBuddy(input.studentCode, expectedCode, input.lang)
      : [{ description: 'Código enviado', passed: input.studentCode.trim().length > 0 }];
  }
  if (language === 'nave') {
    return expectedCode
      ? runNave(input.studentCode, expectedCode, input.lang)
      : [{ description: 'Código enviado', passed: input.studentCode.trim().length > 0 }];
  }
  if (language === 'python') {
    return runPythonExercise(input.studentCode ?? '', expectedCode, input.lang);
  }
  if (language === 'web') {
    return expectedCode
      ? runWebExercise(input.studentCode ?? '', expectedCode, lang)
      : [{ description: 'Código enviado', passed: (input.studentCode ?? '').trim().length > 0 }];
  }
  if (input.tests?.length && language === 'js') return runCodeTests(input.studentCode, input.tests);
  if (!expectedCode) return [{ description: 'Código enviado', passed: input.studentCode.trim().length > 0 }];
  if (looksLikeAssertions(expectedCode)) {
    if (language === 'js') return runAssertionBlock(input.studentCode, expectedCode);
    // Verificaciones de DOM/CSS: necesitan una página real, que solo existe
    // en la vista previa del navegador. Acá se exige que haya código.
    return [{ description: 'Código enviado', passed: input.studentCode.trim().length > 0 }];
  }
  if (language === 'html') return compareHtml(input.studentCode, expectedCode, lang);
  if (language === 'css') return compareCss(input.studentCode, expectedCode, lang);
  return compareJsOutput(input.studentCode, expectedCode, lang);
}

// ─── Python (asíncrono: corre en un proceso aislado, ver python-runner.ts) ──

export async function runPythonExercise(studentCode: string, expectedCode: string, lang?: string | null): Promise<CodeResult[]> {
  const T = PYTHON_TEXTS[pythonMsgLang(lang)];
  if (!studentCode.trim()) return [{ description: 'Python', passed: false, error: T.writeFirst }];
  const run = await runPython(studentCode, expectedCode);
  const message = pythonResultMessage(run, lang);
  if (!expectedCode.trim()) {
    return [{ description: 'Python', passed: run.ok, ...(run.ok ? {} : { error: message ?? undefined }) }];
  }
  const passed = run.ok && run.paso === true;
  return [{ description: 'Python', passed, ...(passed ? {} : { error: message ?? T.notYet }) }];
}

/** Alias de validateCode (antes era la única que corregía Python). */
export const validateCodeAsync = validateCode;
