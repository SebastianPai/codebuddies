// Proceso hijo que corre el JavaScript de los alumnos (JS, Buddy, la nave y
// páginas web con DOM) para corregir ejercicios.
//
// SEGURIDAD — antes el código del alumno corría con node:vm DENTRO del proceso
// de la API: con `this.constructor.constructor("return process")()` se salía
// del contexto y se leían todas las variables de entorno (base de datos,
// claves). node:vm no es un límite de seguridad. Ahora hay varias capas:
//   1. Este proceso no tiene variables de entorno ni permisos de archivos
//      (modelo de permisos de Node: solo puede leer este archivo), y se habla
//      con él SOLO por IPC. El padre lo mata si tarda demasiado.
//   2. Corre con --disallow-code-generation-from-strings: aunque alguien
//      consiguiera el `Function` de este proceso, no puede compilar código.
//   3. El contexto del alumno se crea sobre Object.create(null) y NO recibe
//      ningún objeto de este proceso: console, assert, temporizadores y hasta
//      el DOM (linkedom, ver dom-bundle.ts) se crean ADENTRO del contexto.
//      Además el contexto no puede generar código desde texto (eval/Function).
//   4. Las pruebas usan un assert guardado antes de que corra el alumno y en
//      el modo "duro" se congelan los prototipos básicos: el alumno no puede
//      redefinir assert ni Array.prototype.includes para aprobar sin resolver.
// El arnés de pruebas (consola, assert, reloj virtual, $, click, css...) es el
// de @codebuddies/world-objects (webcheck.ts), el mismo que usa la web; llega
// por IPC al arrancar porque este proceso no puede leer otros archivos.

import * as vm from 'node:vm';

export type JsJob = {
  id: string;
  /** Se arma una página con este HTML y se exponen window/document. */
  dom?: string | null;
  /** Scripts confiables (del ejercicio) que corren ANTES del alumno. */
  setup?: string;
  /** Código del alumno, en su propio script (un `return` suelto es error). */
  student?: string;
  /** Scripts confiables que corren después, como cuerpo de una función async. */
  tests?: string;
  /** Texto original de cada archivo (para pruebas estáticas: htmlText, cssText, jsText). */
  sources?: { html?: string; css?: string; js?: string };
  /** Modo legado: UN script que ya trae todo (Buddy, la nave). */
  script?: string;
  /** Congelar prototipos básicos antes del alumno. */
  harden?: boolean;
  /** Devuelve Boolean(último valor) del script (tests por expresión). */
  returnBool?: boolean;
  timeoutMs?: number;
};

export type JsReply = { id: string; ok: boolean; error?: string; logs: string[]; value?: boolean };

// El DOM: se crea con linkedom DENTRO del contexto. Helpers para las pruebas.
const DOM_SETUP = String.raw`
(function (G) {
  var w = __cbParseHTML(G.__cb_html);
  G.window = w;
  G.document = w.document;
  ['Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent', 'InputEvent', 'HTMLElement', 'Element', 'Node', 'NodeList',
   'DocumentFragment', 'HTMLInputElement', 'HTMLFormElement', 'HTMLButtonElement', 'HTMLTemplateElement', 'FormData', 'DOMParser']
    .forEach(function (k) { try { if (w[k]) G[k] = w[k]; } catch (e) {} });
  try { if (!G.FormData) G.FormData = undefined; } catch (e) {}
  G.localStorage = G.sessionStorage = (function () {
    var m = new Map();
    return {
      getItem: function (k) { k = String(k); return m.has(k) ? m.get(k) : null; },
      setItem: function (k, v) { m.set(String(k), String(v)); },
      removeItem: function (k) { m.delete(String(k)); },
      clear: function () { m.clear(); },
      key: function (i) { return Array.from(m.keys())[i] ?? null; },
      get length() { return m.size; },
    };
  })();
  w.localStorage = G.localStorage;
  G.alert = function (m) { console.log(String(m)); };
  w.alert = G.alert;
  // linkedom no trae form.reset(): vuelve cada campo a su valor inicial, como el navegador.
  try {
    var FP = Object.getPrototypeOf(w.document.createElement('form'));
    // En linkedom, asignar .value también cambia el atributo: se guardan los
    // valores iniciales al cargar la página para poder volver a ellos.
    var iniciales = new WeakMap();
    var todos = w.document.querySelectorAll('input, textarea');
    for (var j = 0; j < todos.length; j++) {
      var t = todos[j];
      iniciales.set(t, t.localName === 'textarea' ? (t.textContent || '') : (t.getAttribute('value') || ''));
    }
    if (FP && typeof FP.reset !== 'function') {
      FP.reset = function () {
        var campos = this.querySelectorAll('input, textarea, select');
        for (var i = 0; i < campos.length; i++) {
          var c = campos[i], tipo = String(c.getAttribute('type') || '').toLowerCase();
          if (tipo === 'checkbox' || tipo === 'radio') c.checked = c.hasAttribute('checked');
          else if (c.localName === 'select') { var sel = c.querySelector('option[selected]') || c.querySelector('option'); c.value = sel ? (sel.getAttribute('value') ?? sel.textContent) : ''; }
          else c.value = iniciales.has(c) ? iniciales.get(c) : '';
        }
        this.dispatchEvent(new w.Event('reset', { bubbles: true }));
      };
    }
  } catch (e) {}
})(globalThis);
`;

export type JsInit = { dom: string; prelude: string; harden: string; lock: string; helpers: string };

let domScript: vm.Script;
let prelude: vm.Script;
let hardenScript: vm.Script;
let lockScript: vm.Script;
let helpers = '';
const domSetup = new vm.Script(DOM_SETUP, { filename: 'dom.js' });

function msg(e: unknown): string {
  // Para errores del propio vm (sintaxis, tiempo) que se crean en ESTE proceso.
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string' && m) return m;
  }
  return 'Error de ejecución';
}

function readLogs(ctx: vm.Context): string[] {
  try {
    const raw = new vm.Script('JSON.stringify(__cb_log_list.slice(0, 500).map(String))').runInContext(ctx, { timeout: 200 });
    return typeof raw === 'string' ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function run(job: JsJob): Promise<JsReply> {
  const timeout = Math.min(Math.max(job.timeoutMs ?? 2000, 100), 4000);
  const ctx = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
  const reply = (ok: boolean, error?: string, value?: boolean): JsReply => ({ id: job.id, ok, ...(error ? { error: error.slice(0, 600) } : {}), logs: readLogs(ctx), ...(value !== undefined ? { value } : {}) });
  try {
    prelude.runInContext(ctx, { timeout });
    const c0 = ctx as Record<string, unknown>;
    c0.__cb_css = String(job.sources?.css ?? '');
    c0.__cb_html_src = String(job.sources?.html ?? '');
    c0.__cb_js_src = String(job.sources?.js ?? job.student ?? '');
    if (typeof job.dom === 'string') {
      c0.__cb_html = job.dom;
      domScript.runInContext(ctx, { timeout });
      domSetup.runInContext(ctx, { timeout });
    }
    lockScript.runInContext(ctx, { timeout });
    if (job.script !== undefined) {
      // Modo legado (Buddy, nave, JS con respuesta modelo): un solo script.
      const value = new vm.Script(job.script, { filename: 'ejercicio.js' }).runInContext(ctx, { timeout });
      return reply(true, undefined, job.returnBool ? Boolean(value) : undefined);
    }
    if (job.setup?.trim()) new vm.Script(job.setup, { filename: 'preparacion.js' }).runInContext(ctx, { timeout });
    if (job.harden) hardenScript.runInContext(ctx, { timeout });
    if (job.student !== undefined) {
      try {
        new vm.Script(job.student, { filename: 'tu-codigo.js' }).runInContext(ctx, { timeout });
      } catch (e) {
        const text = describeInContext(ctx, e);
        return reply(false, text);
      }
    }
    if (job.tests === undefined) return reply(true);
    // Igual que jsCheckTestsScript() de @codebuddies/world-objects.
    const wrapped = `(async function () {\n${helpers}\nawait flushTimers();\ntry {\n${job.tests}\n;return "OK";\n} catch (e) { return "ERR:" + __cb_msg(e); }\n})()`;
    const promise = new vm.Script(wrapped, { filename: 'pruebas.js' }).runInContext(ctx, { timeout }) as Promise<unknown>;
    const out = await promise;
    if (out === 'OK') return reply(true);
    return reply(false, typeof out === 'string' && out.startsWith('ERR:') ? out.slice(4) : 'Las pruebas no terminaron');
  } catch (e) {
    return reply(false, describeInContext(ctx, e));
  }
}

// Un error lanzado por el alumno es un objeto del contexto: su mensaje se lee
// con la función guardada en el contexto (sin tocar getters del alumno desde acá).
function describeInContext(ctx: vm.Context, e: unknown): string {
  if (e instanceof Error) return msg(e); // error de este proceso (sintaxis, tiempo)
  try {
    (ctx as Record<string, unknown>).__cb_err = e;
    const text = new vm.Script('__cb_msg(__cb_err)').runInContext(ctx, { timeout: 200 });
    return typeof text === 'string' && text ? text : 'Error de ejecución';
  } catch {
    return 'Error de ejecución';
  }
}

function waitInit(): Promise<JsInit> {
  return new Promise((resolve) => {
    const on = (m: any) => {
      if (typeof m?.dom === 'string' && typeof m?.prelude === 'string') {
        process.off('message', on);
        resolve(m as JsInit);
      }
    };
    process.on('message', on);
  });
}

async function main() {
  const send = process.send!.bind(process);
  const init = await waitInit();
  domScript = new vm.Script(init.dom, { filename: 'dom-bundle.js' });
  prelude = new vm.Script(init.prelude, { filename: 'prelude.js' });
  hardenScript = new vm.Script(init.harden, { filename: 'harden.js' });
  lockScript = new vm.Script(init.lock, { filename: 'lock.js' });
  helpers = String(init.helpers);
  const g = globalThis as any;
  for (const k of ['fetch', 'WebSocket', 'XMLHttpRequest', 'EventSource']) {
    try { delete g[k]; } catch { g[k] = undefined; }
  }
  const p = process as any;
  for (const k of ['_linkedBinding', 'dlopen', 'binding', 'env']) {
    try { p[k] = undefined; } catch { /* nada */ }
  }
  let queue: Promise<unknown> = Promise.resolve();
  process.on('message', (job: JsJob) => {
    if (!job || typeof job.id !== 'string') return;
    queue = queue.then(async () => {
      let out: JsReply;
      try {
        out = await run(job);
      } catch (e) {
        out = { id: job.id, ok: false, error: msg(e), logs: [] };
      }
      send(out);
    });
  });
  send({ ready: true });
}

main().catch((e) => {
  process.send?.({ fatal: String((e as Error)?.message || e).slice(0, 300) });
  process.exit(1);
});
