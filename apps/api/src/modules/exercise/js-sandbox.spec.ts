import { validateCode } from './code-validation';
import { stopJs } from './js-runner';

// Seguridad del corrector de JavaScript (proceso aislado, ver js-child.ts) y
// las páginas web verificadas en el servidor (lenguaje "web").

afterAll(() => stopJs());

const leak = 'assert(false, "ESCAPE " + (typeof p))';
const escapes = [
  'var p = this.constructor.constructor("return process")();',
  'var p = console.log.constructor.constructor("return process")();',
  'var p = (function(){ return this })().constructor.constructor("return process")();',
  'var p = assert.constructor("return process")();',
  'var p = eval("process");',
  'var p = Function("return process")();',
  'var p = (async function(){}).constructor("return process")();',
  'var p = Object.getPrototypeOf(function*(){}).constructor("return process")();',
  'var p = process;',
  'var p = require("child_process");',
  'var p = globalThis.process || this.process;',
];

describe('el JS del alumno no sale del corrector', () => {
  it.each(escapes)('bloquea %p', async (code) => {
    for (const language of ['js', 'buddy', 'nave']) {
      const [r] = await validateCode({ language, studentCode: `${code}\n if (p && p.env) throw new Error("ESCAPE env");`, expectedCode: language === 'js' ? leak : 'assert(true)' });
      if (language === 'js') expect(r.passed).toBe(false);
      expect(String(r.error ?? '')).not.toMatch(/ESCAPE (object|env)/);
    }
  });

  it('bloquea escapes desde la página web (window, document, eventos)', async () => {
    const tries = [
      'var p = window.constructor.constructor("return process")();',
      'var p = document.body.constructor.constructor("return process")();',
      'var p = document.querySelector("h1").addEventListener.constructor("return process")();',
      'var p = window.process || window.require;',
    ];
    for (const js of tries) {
      const [r] = await validateCode({ language: 'web', studentCode: JSON.stringify({ html: '<h1>x</h1>', css: '', js: js + '\nif (p) throw new Error("ESCAPE env")' }), expectedCode: 'assert(true)' });
      expect(String(r.error ?? '')).not.toMatch(/ESCAPE env/);
    }
  });

  it('un bucle infinito async se corta sin colgar la API', async () => {
    const [r] = await validateCode({ language: 'js', studentCode: 'async function f(){ while(true){ await null; } }', expectedCode: 'await f(); assert(true)' });
    expect(r.passed).toBe(false);
    const [ok] = await validateCode({ language: 'js', studentCode: 'const x = 1;', expectedCode: 'assert(x === 1)' });
    expect(ok.passed).toBe(true);
  }, 20_000);
});

describe('no se puede aprobar sin resolver', () => {
  const tests = 'assert(sumar(2, 3) === 5, "sumar(2, 3) debe dar 5"); assert(sumar(-1, 1) === 0, "sumar(-1, 1) debe dar 0");';
  it.each([
    'function assert() {}',
    'assert = function () {};',
    'globalThis.assert = () => {};',
    'Object.defineProperty(globalThis, "__cb_assert", { value: () => {} });',
    'Error = function () { return {}; };',
    'return;',
    '}); (async function () {',
    'Array.prototype.includes = () => true; function sumar() { return 0; }',
    'Number.prototype.valueOf = () => 5; function sumar() { return 0; }',
  ])('no aprueba con %p', async (cheat) => {
    const [r] = await validateCode({ language: 'js', studentCode: cheat, expectedCode: tests });
    expect(r.passed).toBe(false);
  });

  it('la solución real sí aprueba', async () => {
    const [r] = await validateCode({ language: 'js', studentCode: 'function sumar(a, b) { return a + b; }', expectedCode: tests });
    expect(r).toEqual({ description: 'Assertions', passed: true });
  });
});

describe('JS asíncrono con preparación (// @pruebas)', () => {
  const checks = [
    'globalThis.fetch = async (url) => ({ ok: url === "/api/productos", status: 200, json: async () => [{ nombre: "Teclado", precio: 30 }, { nombre: "Mouse", precio: 15 }] });',
    '// @pruebas',
    'const total = await totalInventario();',
    'assert(total === 45, "totalInventario() debe sumar los precios: esperaba 45 y dio " + total);',
  ].join('\n');
  it('el alumno usa fetch + await y las pruebas esperan el resultado', async () => {
    const good = 'async function totalInventario() { const r = await fetch("/api/productos"); const items = await r.json(); return items.reduce((s, p) => s + p.precio, 0); }';
    expect((await validateCode({ language: 'js', studentCode: good, expectedCode: checks }))[0].passed).toBe(true);
    const bad = 'async function totalInventario() { const r = fetch("/api/productos"); return 0; }';
    const [r] = await validateCode({ language: 'js', studentCode: bad, expectedCode: checks });
    expect(r.passed).toBe(false);
    expect(r.error).toContain('esperaba 45');
  });

  it('setTimeout corre con reloj virtual (no espera de verdad)', async () => {
    const t0 = Date.now();
    const [r] = await validateCode({ language: 'js', studentCode: 'let listo = false; setTimeout(() => { listo = true; }, 60000);', expectedCode: 'assert(listo, "debe quedar listo")' });
    expect(r.passed).toBe(true);
    expect(Date.now() - t0).toBeLessThan(3000);
  });

  it('las pruebas ven lo que el alumno mostró con console.log', async () => {
    const [r] = await validateCode({ language: 'js', studentCode: 'console.log("Total:", 45)', expectedCode: 'assert(logs.includes("Total: 45"), "La consola debe mostrar Total: 45")' });
    expect(r.passed).toBe(true);
  });
});

describe('páginas web con DOM (lenguaje web)', () => {
  const files = (html: string, css = '', js = '') => JSON.stringify({ html, css, js });
  const checks = [
    'const input = $("#cantidad"), boton = $("#calcular");',
    'assert(input && boton, "Faltan el campo #cantidad o el botón #calcular");',
    'type(input, "3"); click(boton);',
    'assert(text($("#total")) === "Total: 30", "Con 3 unidades el total debe ser Total: 30 y es " + text($("#total")));',
    'type(input, "5"); click(boton);',
    'assert(text($("#total")) === "Total: 50", "Con 5 unidades el total debe ser Total: 50");',
    'assert(css(".total", "font-weight") === "700", "El total debe ir en negrita (font-weight: 700)");',
  ].join('\n');
  const html = '<label>Cantidad <input id="cantidad" type="number"></label><button id="calcular">Calcular</button><p id="total" class="total"></p>';
  const js = 'document.querySelector("#calcular").addEventListener("click", () => { const n = Number(document.querySelector("#cantidad").value); document.querySelector("#total").textContent = "Total: " + n * 10; });';

  it('aprueba una página que funciona de verdad', async () => {
    const [r] = await validateCode({ language: 'web', studentCode: files(html, '.total { font-weight: 700; }', js), expectedCode: checks });
    expect(r).toEqual({ description: 'Web', passed: true });
  });

  it('no aprueba si el texto está escrito a mano en vez de calcularse', async () => {
    const fake = html.replace('<p id="total" class="total"></p>', '<p id="total" class="total">Total: 30</p>');
    const [r] = await validateCode({ language: 'web', studentCode: files(fake, '.total { font-weight: 700; }', ''), expectedCode: checks });
    expect(r.passed).toBe(false);
    expect(r.error).toContain('Total: 50');
  });

  it('dice qué falta del CSS', async () => {
    const [r] = await validateCode({ language: 'web', studentCode: files(html, '', js), expectedCode: checks });
    expect(r.error).toContain('negrita');
  });

  it('no se puede reemplazar document por uno falso', async () => {
    const cheat = 'try { document = { querySelector: () => ({ textContent: "Total: 50", value: "" }) }; } catch (e) {}';
    const [r] = await validateCode({ language: 'web', studentCode: files(html, '.total { font-weight: 700; }', cheat), expectedCode: checks });
    expect(r.passed).toBe(false);
  });

  it('submit de formularios y preventDefault', async () => {
    const page = '<form id="f"><input name="email" id="email" type="email" required><button>Enviar</button></form><p id="msg"></p>';
    const code = 'document.querySelector("#f").addEventListener("submit", (e) => { e.preventDefault(); const v = document.querySelector("#email").value.trim(); document.querySelector("#msg").textContent = v.includes("@") ? "Gracias" : "Email inválido"; });';
    const test = 'type($("#email"), "ana"); const ev = submit($("#f")); assert(ev.defaultPrevented, "Usa preventDefault"); assert(text($("#msg")) === "Email inválido", "msg"); type($("#email"), "ana@x.com"); submit($("#f")); assert(text($("#msg")) === "Gracias", "gracias"); assert($("#email").hasAttribute("required"), "required");';
    const [r] = await validateCode({ language: 'web', studentCode: files(page, '', code), expectedCode: test });
    expect(r).toEqual({ description: 'Web', passed: true });
  });

  it('lee @media del CSS', async () => {
    const cssCode = '.grid { display: grid; grid-template-columns: 1fr; } @media (min-width: 768px) { .grid { grid-template-columns: repeat(3, 1fr); } }';
    const [r] = await validateCode({ language: 'web', studentCode: files('<div class="grid"></div>', cssCode), expectedCode: 'assert(css(".grid", "grid-template-columns") === "1fr"); assert(css(".grid", "grid-template-columns", "min-width: 768px") === "repeat(3, 1fr)");' });
    expect(r.passed).toBe(true);
  });
});
