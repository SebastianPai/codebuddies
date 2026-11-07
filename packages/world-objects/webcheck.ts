/**
 * Arnés de pruebas de los ejercicios de JavaScript y de páginas web
 * (lenguaje "web": HTML + CSS + JS). Es el MISMO texto en los dos lados:
 *   - apps/api: corre dentro del proceso aislado (js-child.ts), con un DOM de
 *     linkedom. Es la corrección que cuenta (XP, certificados).
 *   - apps/web: corre en un iframe sandbox oculto para dar el resultado a
 *     quien todavía no inició sesión (buildWebCheckDoc).
 *
 * Las verificaciones de un ejercicio son JavaScript con assert(...). Si tienen
 * una línea `// @pruebas`, lo de arriba es la PREPARACIÓN (corre antes del
 * código del alumno: datos, un fetch falso) y lo de abajo son las pruebas,
 * que corren dentro de una función async (pueden usar await).
 *
 * Lo que tienen a mano las pruebas:
 *   assert(cond, msg), logs (lo que mostró console.log), flushTimers()
 *   $(sel), $$(sel), text(el), click(el), type(el, valor), submit(form), press(el, tecla)
 *   css(selector, propiedad[, media]), cssRules, htmlText, cssText, jsText
 */

export function splitJsChecks(expectedCode: string): { setup: string; tests: string } {
  const m = /^[ \t]*\/\/[ \t]*@pruebas[ \t]*$/m.exec(expectedCode);
  if (!m) return { setup: '', tests: expectedCode };
  return { setup: expectedCode.slice(0, m.index), tests: expectedCode.slice(m.index + m[0].length) };
}

/** Consola, assert protegido y temporizadores con reloj virtual. */
export const JS_CHECK_PRELUDE = String.raw`
var __cb_logs = [];
(function (G) {
  var E = Error, S = String, J = JSON, push = Array.prototype.push;
  function fmt(a) {
    if (typeof a === 'string') return a;
    if (a === undefined) return 'undefined';
    if (typeof a === 'function') return '[Function ' + (a.name || 'anonymous') + ']';
    try { var s = J.stringify(a); return s === undefined ? S(a) : s; } catch (e) { return S(a); }
  }
  function log() {
    if (__cb_logs.length >= 500) return;
    var parts = [];
    for (var i = 0; i < arguments.length; i++) parts.push(fmt(arguments[i]));
    push.call(__cb_logs, parts.join(' ').slice(0, 2000));
  }
  G.console = { log: log, info: log, warn: log, error: log, debug: log, table: log };
  function assert(condition, message) {
    if (!condition) throw new E(message || 'Assertion failed');
  }
  G.assert = assert;
  Object.defineProperty(G, '__cb_assert', { value: Object.freeze(assert), writable: false, configurable: false });
  Object.defineProperty(G, '__cb_log_list', { value: __cb_logs, writable: false, configurable: false });
  Object.defineProperty(G, '__cb_msg', {
    value: function (e) {
      try { if (e && typeof e === 'object' && typeof e.message === 'string' && e.message) return e.message; } catch (x) {}
      try { return S(e); } catch (x) { return 'Error'; }
    },
    writable: false, configurable: false,
  });
  // Reloj virtual: setTimeout no espera de verdad; flushTimers() (se llama
  // solo antes de las pruebas) corre los pendientes en orden.
  var timers = [], seq = 0, now = 0;
  G.setTimeout = function (fn, ms) {
    var args = Array.prototype.slice.call(arguments, 2);
    var id = ++seq;
    if (typeof fn === 'function') timers.push({ id: id, at: now + Math.max(0, Number(ms) || 0), fn: fn, args: args });
    return id;
  };
  G.setInterval = function (fn, ms) {
    var id = ++seq, every = Math.max(1, Number(ms) || 1);
    function tick() { timers.push({ id: id, at: now + every, fn: wrapped, args: [] }); }
    function wrapped() { tick(); fn(); }
    if (typeof fn === 'function') tick();
    return id;
  };
  G.clearTimeout = G.clearInterval = function (id) {
    for (var i = timers.length - 1; i >= 0; i--) if (timers[i].id === id) timers.splice(i, 1);
  };
  G.queueMicrotask = function (fn) { Promise.resolve().then(fn); };
  Object.defineProperty(G, 'flushTimers', {
    value: async function () {
      for (var k = 0; k < 30; k++) await null;
      for (var n = 0; n < 2000 && timers.length; n++) {
        timers.sort(function (a, b) { return a.at - b.at || a.id - b.id; });
        var t = timers.shift();
        now = t.at;
        t.fn.apply(null, t.args);
        for (var m = 0; m < 30; m++) await null;
      }
    },
    writable: false, configurable: false,
  });
})(globalThis);
`;

/** Congela los prototipos básicos: el alumno no puede "arreglar" las pruebas. */
export const JS_CHECK_HARDEN = String.raw`
(function () {
  var list = [Object, Array, String, Number, Boolean, Function, Promise, Map, Set, WeakMap, WeakSet, RegExp, Error, TypeError, RangeError, SyntaxError, ReferenceError, Symbol];
  for (var i = 0; i < list.length; i++) {
    try { Object.freeze(list[i].prototype); Object.freeze(list[i]); } catch (e) {}
  }
  try { Object.freeze(JSON); Object.freeze(Math); Object.freeze(Reflect); } catch (e) {}
  try { Object.freeze(Object.getPrototypeOf(async function () {}).prototype); } catch (e) {}
})();
`;

/** Lo que leen las pruebas no se puede reemplazar desde el código del alumno. */
export const JS_CHECK_LOCK = String.raw`
['__cb_css', '__cb_html_src', '__cb_js_src'].forEach(function (k) {
  Object.defineProperty(globalThis, k, { value: String(globalThis[k] == null ? '' : globalThis[k]), writable: false, configurable: false });
});
['window', 'document', 'Event', 'CustomEvent'].forEach(function (k) {
  try { if (k in globalThis) Object.defineProperty(globalThis, k, { value: globalThis[k], writable: false, configurable: false }); } catch (e) {}
});
`;

/** Ayudas de las pruebas (van al principio del cuerpo async de las pruebas). */
export const JS_CHECK_HELPERS = String.raw`
const assert = __cb_assert;
const logs = __cb_log_list;
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const text = (el) => (el && el.textContent ? el.textContent : '').replace(/\s+/g, ' ').trim();
const click = (el) => { assert(el, 'No se encontró el elemento para hacer clic'); el.dispatchEvent(new Event('click', { bubbles: true, cancelable: true })); };
const type = (el, value) => { assert(el, 'No se encontró el campo'); el.value = String(value); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
const submit = (form) => { assert(form, 'No se encontró el formulario'); const ev = new Event('submit', { bubbles: true, cancelable: true }); form.dispatchEvent(ev); return ev; };
const press = (el, key) => { const ev = new Event('keydown', { bubbles: true, cancelable: true }); try { Object.defineProperty(ev, 'key', { value: key }); } catch (e) {} (el || document).dispatchEvent(ev); return ev; };
const cssText = String(globalThis.__cb_css || '');
const htmlText = String(globalThis.__cb_html_src || '');
const jsText = String(globalThis.__cb_js_src || '');
const cssRules = (() => {
  const out = [];
  const src = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const walk = (s, media) => {
    let i = 0;
    while (i < s.length) {
      const open = s.indexOf('{', i);
      if (open < 0) break;
      const head = s.slice(i, open).trim();
      let depth = 1, j = open + 1;
      while (j < s.length && depth > 0) { if (s[j] === '{') depth++; else if (s[j] === '}') depth--; j++; }
      const body = s.slice(open + 1, j - 1);
      if (head.startsWith('@media')) walk(body, head.slice(6).trim().replace(/\s+/g, ' ').toLowerCase());
      else if (!head.startsWith('@')) {
        const sels = head.split(',').map((x) => x.trim().replace(/\s+/g, ' ').toLowerCase()).filter(Boolean);
        for (const decl of body.split(';')) {
          const k = decl.indexOf(':');
          if (k < 0) continue;
          const prop = decl.slice(0, k).trim().toLowerCase();
          const value = decl.slice(k + 1).trim().replace(/\s+/g, ' ').replace(/\s*!important$/i, '');
          for (const sel of sels) out.push({ selector: sel, prop, value, media });
        }
      }
      i = j;
    }
  };
  walk(src, null);
  return out;
})();
const css = (selector, prop, media) => {
  const sel = String(selector).trim().replace(/\s+/g, ' ').toLowerCase();
  const p = String(prop).toLowerCase();
  let found = null;
  for (const r of cssRules) {
    if (r.selector !== sel || r.prop !== p) continue;
    if (media === undefined ? r.media !== null : !(r.media && r.media.includes(String(media).toLowerCase()))) continue;
    found = r.value;
  }
  return found;
};
`;

/** Cuerpo del script de pruebas: devuelve "OK" o "ERR:mensaje". */
export function jsCheckTestsScript(tests: string): string {
  return `(async function () {\n${JS_CHECK_HELPERS}\nawait flushTimers();\ntry {\n${tests}\n;return "OK";\n} catch (e) { return "ERR:" + __cb_msg(e); }\n})()`;
}

const scriptSafe = (code: string) => code.replace(/<\/(script)/gi, '<\\/$1');
const styleSafe = (code: string) => code.replace(/<\/(style)/gi, '<\\/$1');

/**
 * Arma una página con el HTML del alumno: si escribió un documento completo
 * (<html>, <head>...) se respeta tal cual y se inyecta `head` al principio del
 * <head> y `end` antes de </body>. Si es un fragmento, se envuelve.
 */
export function composeWebDocument(html: string, head: string, end: string): string {
  if (/<html[\s>]/i.test(html)) {
    let doc = html;
    if (/<head[\s>]/i.test(doc)) doc = doc.replace(/<head(\s[^>]*)?>/i, (m) => m + head);
    else doc = doc.replace(/<html(\s[^>]*)?>/i, (m) => `${m}<head>${head}</head>`);
    if (/<\/body>/i.test(doc)) doc = doc.replace(/<\/body>(?![\s\S]*<\/body>)/i, () => `${end}</body>`);
    else if (/<\/html>/i.test(doc)) doc = doc.replace(/<\/html>(?![\s\S]*<\/html>)/i, () => `${end}</html>`);
    else doc += end;
    return doc;
  }
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${head}</head><body>\n${html}\n${end}</body></html>`;
}

/** Vista previa en vivo de un ejercicio web (sin pruebas). */
export function buildWebPreviewDoc(files: { html: string; css: string; js: string }, extraHead = ''): string {
  const head = `${extraHead}<style>${styleSafe(files.css)}</style>`;
  return composeWebDocument(files.html, head, `<script>${scriptSafe(files.js)}</script>`);
}

/**
 * Página para un iframe sandbox (allow-scripts) que corre el ejercicio web con
 * sus pruebas en el navegador y avisa al padre con
 * postMessage({ type: "exercise-result", passed, message }).
 */
export function buildWebCheckDoc(files: { html: string; css: string; js: string }, checks: string): string {
  const { setup, tests } = splitJsChecks(checks);
  const sources = JSON.stringify({ html: files.html, css: files.css, js: files.js }).replace(/</g, '\\u003c');
  const head = `
<script>
var __cb_src = ${sources};
var __cb_css = __cb_src.css, __cb_html_src = __cb_src.html, __cb_js_src = __cb_src.js, __cb_student_error = null;
window.addEventListener('error', function (e) { if (!__cb_student_error) __cb_student_error = (e && e.message) || 'Error en tu código'; });
${scriptSafe(JS_CHECK_PRELUDE)}
</script>
<style>${styleSafe(files.css)}</style>`;
  const end = `
<script>
try { ${scriptSafe(setup)} } catch (e) { __cb_student_error = 'Error en la preparación del ejercicio: ' + __cb_msg(e); }
${scriptSafe(JS_CHECK_LOCK)}
${scriptSafe(JS_CHECK_HARDEN)}
</script>
<script>${scriptSafe(files.js)}</script>
<script>
(function () {
  var done = function (passed, message) { parent.postMessage({ type: 'exercise-result', passed: passed, message: message || null }, '*'); };
  if (__cb_student_error) { done(false, String(__cb_student_error).replace(/^Uncaught \\w*:? ?/, '')); return; }
  ${scriptSafe(jsCheckTestsScript(tests))}.then(function (out) {
    if (out === 'OK') done(true); else done(false, String(out).slice(4));
  }, function (e) { done(false, String(e && e.message || e)); });
})();
</script>`;
  return composeWebDocument(files.html, head, end);
}
