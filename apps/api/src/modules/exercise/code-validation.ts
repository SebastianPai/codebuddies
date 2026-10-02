import * as vm from 'node:vm';

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
export type CodeLang = 'html' | 'css' | 'js';
type Msg = 'es' | 'en' | 'de';

export function normalizeLang(language?: string | null): CodeLang {
  const value = (language ?? '').toLowerCase();
  if (value === 'html' || value === 'markup' || value === 'xml') return 'html';
  if (value === 'css') return 'css';
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

function runJs(code: string): { logs: string[]; error?: string } {
  const logs: string[] = [];
  const log = (...args: unknown[]) => logs.push(args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '));
  try {
    const context = vm.createContext({ console: { log, error: log, warn: log, info: log } });
    new vm.Script(code).runInContext(context, { timeout: 2000 });
    return { logs };
  } catch (error) {
    return { logs, error: describeSandboxError(error) };
  }
}

export function runAssertionBlock(studentCode: string, expectedCode: string): CodeResult[] {
  try {
    const context = vm.createContext({ console: { log() {}, error() {}, warn() {} } });
    const script = new vm.Script(`
      function assert(condition, message) {
        if (!condition) throw new Error(message || 'Assertion failed');
      }
      ${studentCode}
      ${expectedCode}
    `);
    script.runInContext(context, { timeout: 2000 });
    return [{ description: 'Assertions', passed: true }];
  } catch (error) {
    return [{ description: 'Assertions', passed: false, error: describeSandboxError(error) }];
  }
}

export function runCodeTests(studentCode: string, tests: Array<{ description: string; assertCode: string }>): CodeResult[] {
  return tests.map((test) => {
    try {
      // Contexto nuevo por test: nada de estado compartido, y sin ningún
      // global de Node (require/process/Buffer) al alcance del alumno.
      const context = vm.createContext({ console: { log() {}, error() {}, warn() {} } });
      const result = new vm.Script(`${studentCode}\n;(${test.assertCode})`).runInContext(context, { timeout: 2000 });
      return { description: test.description, passed: Boolean(result) };
    } catch (error) {
      return { description: test.description, passed: false, error: describeSandboxError(error) };
    }
  });
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

export function compareJsOutput(studentCode: string, expectedCode: string, lang: Msg): CodeResult[] {
  const expected = runJs(expectedCode);
  const student = runJs(studentCode);
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

// ─── Punto de entrada ─────────────────────────────────────────────────────

export function validateCode(input: {
  language?: string | null;
  studentCode: string;
  expectedCode?: string | null;
  tests?: Array<{ description: string; assertCode: string }> | null;
  lang?: string | null;
}): CodeResult[] {
  const language = normalizeLang(input.language);
  const lang = messageLang(input.lang);
  const expectedCode = input.expectedCode?.trim() ?? '';

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
