// La nave de Buddy (curso 2 "Crea tu juego"): el mismo esquema que buddy.ts.
//   - NAVE_RUNTIME es TEXTO: corre igual en el iframe de la vista previa
//     (anima cada paso) y en la API con node:vm (corrige el ejercicio con
//     `assert(nave.enemigos === 0, "...")` sobre cómo quedó todo).
//   - El tablero es una cuadrícula por turnos, determinística: 7 columnas, la
//     nave abajo y los aliens arriba (fila 0 = la de más arriba).
//   - El nivel de cada ejercicio va como comentario en las verificaciones:
//     `// nivel: {"nave":3,"enemigos":[[3,1],[5,0,2]]}` ([columna, fila, vida]).
//     Así lo leen igual la API y la vista previa, sin columnas nuevas en la base.

export const NAVE_LANGUAGE = 'nave';
export const NAVE_COLUMNS = 7;
export const NAVE_ROWS = 5;
export const NAVE_MAX_STEPS = 300;
export const NAVE_KEYS = ['izquierda', 'derecha', 'espacio', 'arriba', 'abajo'] as const;

export type NaveLevel = { nave?: number; enemigos?: Array<[number, number] | [number, number, number]> };

export type NaveStep =
  | { accion: 'mover'; columna: number }
  | { accion: 'borde'; columna: number }
  | { accion: 'disparar'; columna: number; impacto: { fila: number; destruido: boolean } | null }
  | { accion: 'decir'; texto: string }
  | { accion: 'pintar'; color: string };

/** Lee el nivel del comentario `// nivel: {...}` (o null si no hay). */
export function naveLevelFrom(source: string | null | undefined): NaveLevel | null {
  const match = String(source ?? '').match(/\/\/\s*nivel:\s*(\{.*\})/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as NaveLevel;
  } catch {
    return null;
  }
}

/**
 * Define `nave`, `juego` y `repetir` como globales que no se pueden
 * reemplazar, más funciones para quien muestra el juego:
 *   __naveReport(desde)  → { state, steps } (pasos desde el índice dado)
 *   __naveModoJuego()    → sin tope de órdenes (cuando se juega con teclas)
 *   __naveTick(columna)  → los aliens bajan una fila y aparece uno nuevo
 * Lee el nivel de `__NAVE_NIVEL` si existe (lo define quien lo corre).
 */
export const NAVE_RUNTIME = String.raw`
(function (root) {
  var ANCHO = ${NAVE_COLUMNS}, ALTO = ${NAVE_ROWS};
  var nivel = (typeof __NAVE_NIVEL !== "undefined" && __NAVE_NIVEL) || {};
  var COLORES = { rojo: "#ef4444", azul: "#3b82f6", verde: "#22c55e", amarillo: "#facc15", morado: "#a855f7", naranja: "#f97316", rosa: "#ec4899", blanco: "#f8fafc" };
  var st = { columna: Math.max(0, Math.min(ANCHO - 1, nivel.nave === undefined ? 3 : Number(nivel.nave) || 0)), puntos: 0, disparos: 0, fallados: 0, destruidos: 0, vidas: 3, color: "#3b82f6", dicho: [], lista: [] };
  (nivel.enemigos || []).forEach(function (e) { st.lista.push({ col: Number(e[0]) || 0, fila: Number(e[1]) || 0, vida: Number(e[2]) || 1 }); });
  var steps = [], teclas = {}, alDestruir = null, enJuego = false, profundidad = 0;
  function linea() {
    var m = String(new Error().stack || "").match(/alumno\.js:(\d+)/);
    return m ? Math.max(1, Number(m[1]) - 2) : null;
  }
  function push(step) {
    if (!enJuego && steps.length >= ${NAVE_MAX_STEPS}) throw new Error("¡Demasiadas órdenes! Revisa que tu repetir termine.");
    var l = linea();
    if (l) step.linea = l;
    steps.push(step);
  }
  function vivos() { return st.lista.filter(function (e) { return e.vida > 0; }); }
  function mover(dir, pasos) {
    var n = pasos === undefined ? 1 : Math.trunc(Number(pasos)) || 0;
    for (var i = 0; i < Math.abs(n); i++) {
      var dest = st.columna + (n < 0 ? -dir : dir);
      if (dest < 0 || dest >= ANCHO) { push({ accion: "borde", columna: st.columna }); return; }
      st.columna = dest;
      push({ accion: "mover", columna: dest });
    }
  }
  var nave = {
    derecha: function (pasos) { mover(1, pasos); },
    izquierda: function (pasos) { mover(-1, pasos); },
    disparar: function () {
      st.disparos += 1;
      var blanco = null;
      vivos().forEach(function (e) { if (e.col === st.columna && (!blanco || e.fila > blanco.fila)) blanco = e; });
      if (!blanco) { st.fallados += 1; push({ accion: "disparar", columna: st.columna, impacto: null }); return; }
      blanco.vida -= 1;
      var destruido = blanco.vida <= 0;
      if (destruido) { st.puntos += 10; st.destruidos += 1; }
      push({ accion: "disparar", columna: st.columna, impacto: { fila: blanco.fila, destruido: destruido } });
      if (destruido && alDestruir && profundidad < 3) { profundidad += 1; try { alDestruir(); } finally { profundidad -= 1; } }
    },
    hayEnemigo: function () { return vivos().some(function (e) { return e.col === st.columna; }); },
    decir: function (texto) { var t = String(texto); st.dicho.push(t); push({ accion: "decir", texto: t }); },
    pintar: function (color) {
      var c = String(color).toLowerCase();
      var valor = COLORES[c] || (/^#[0-9a-f]{3,6}$/.test(c) ? c : null);
      if (!valor) throw new Error("No conozco el color \"" + color + "\". Prueba con: " + Object.keys(COLORES).join(", "));
      st.color = valor;
      push({ accion: "pintar", color: valor });
    }
  };
  ["columna", "puntos", "disparos", "fallados", "destruidos", "vidas", "color"].forEach(function (key) {
    Object.defineProperty(nave, key, { get: function () { return st[key]; }, enumerable: true });
  });
  Object.defineProperty(nave, "enemigos", { get: function () { return vivos().length; }, enumerable: true });
  Object.defineProperty(nave, "dicho", { get: function () { return st.dicho.slice(); }, enumerable: true });
  Object.freeze(nave);
  var TECLAS = ${JSON.stringify(NAVE_KEYS)};
  var juego = {
    alTocar: function (tecla, accion) {
      var k = String(tecla).toLowerCase();
      if (TECLAS.indexOf(k) < 0) throw new Error("La tecla \"" + tecla + "\" no existe. Usa: " + TECLAS.join(", "));
      if (typeof accion !== "function") throw new Error("Después de la tecla va una función: function () { ... }");
      teclas[k] = accion;
    },
    alDestruir: function (accion) {
      if (typeof accion !== "function") throw new Error("juego.alDestruir necesita una función: function () { ... }");
      alDestruir = accion;
    },
    tocar: function (tecla) { var f = teclas[String(tecla).toLowerCase()]; if (f) f(); return !!f; }
  };
  Object.defineProperty(juego, "teclas", { get: function () { return Object.keys(teclas); }, enumerable: true });
  Object.freeze(juego);
  function repetir(veces, accion) {
    if (typeof accion !== "function") throw new Error("repetir necesita cuántas veces y una función: repetir(3, function () { ... });");
    var n = Math.min(100, Math.max(0, Math.trunc(Number(veces)) || 0));
    for (var i = 1; i <= n; i++) accion(i);
  }
  var __console = { log: function () { nave.decir(Array.prototype.slice.call(arguments).join(" ")); }, error: function () {}, warn: function () {}, info: function () {} };
  function report(desde) {
    return { state: JSON.parse(JSON.stringify({ columna: st.columna, puntos: st.puntos, disparos: st.disparos, fallados: st.fallados, destruidos: st.destruidos, vidas: st.vidas, color: st.color, lista: vivos() })), steps: steps.slice(desde || 0) };
  }
  // Modo juego: los aliens bajan; si uno llega abajo, se pierde una vida.
  function tick(columnaNueva) {
    var perdidas = 0;
    st.lista.forEach(function (e) { if (e.vida > 0) { e.fila += 1; if (e.fila >= ALTO) { e.vida = 0; perdidas += 1; } } });
    st.lista = vivos();
    st.vidas = Math.max(0, st.vidas - perdidas);
    if (columnaNueva !== undefined && columnaNueva !== null) st.lista.push({ col: Math.max(0, Math.min(ANCHO - 1, columnaNueva)), fila: 0, vida: 1 });
    return perdidas;
  }
  var fijo = function (name, value) { Object.defineProperty(root, name, { value: value, writable: false, configurable: false }); };
  fijo("nave", nave);
  fijo("juego", juego);
  fijo("repetir", repetir);
  fijo("console", __console);
  fijo("__naveReport", report);
  fijo("__naveModoJuego", function () { enJuego = true; });
  fijo("__naveTick", tick);
})(typeof globalThis !== "undefined" ? globalThis : this);
`;

// Errores de JavaScript en palabras simples, como en buddy.ts.
export const NAVE_FRIENDLY_ERRORS: Array<{ pattern: string; message: string }> = [
  { pattern: 'Invalid or unexpected token|Unterminated string', message: 'Hay algo raro en tu código: ¿te falta cerrar una comilla "?' },
  { pattern: 'missing \\) after argument list', message: 'Falta cerrar un paréntesis ). Cada ( necesita su ).' },
  { pattern: 'Unexpected end of input', message: 'El código se termina antes de tiempo: ¿falta cerrar un paréntesis ) o una llave }?' },
  { pattern: "Unexpected token '?([^'\\s]+)'?", message: 'Hay un «$1» que sobra o está en un lugar raro. Revisa los paréntesis, las llaves y las comillas.' },
  { pattern: '(?:nave|juego)\\.(\\w+) is not a function', message: 'La nave no sabe hacer «$1». Revisa cómo se escribe la orden.' },
  { pattern: '(\\w+) is not defined', message: 'No conozco «$1». ¿Lo escribiste bien? Las órdenes empiezan con nave.' },
  { pattern: 'Cannot read propert(?:y|ies) of (?:undefined|null)', message: 'Estás usando algo que no existe. Revisa que esté bien escrito.' },
];

export function naveFriendlyError(message: string): string {
  for (const rule of NAVE_FRIENDLY_ERRORS) {
    const match = message.match(new RegExp(rule.pattern, 'i'));
    if (match) return rule.message.replace('$1', match[1] ?? '');
  }
  return message;
}

// ─── Dibujos (SVG en texto, nunca emojis) ────────────────────────────────

/** La nave, con Buddy de piloto en la cabina. */
export function naveSvg(color = '#3b82f6', size = 96): string {
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 6 C62 18 68 34 68 54 L68 74 L32 74 L32 54 C32 34 38 18 50 6 Z" fill="${color}" stroke="#1e2235" stroke-width="4" stroke-linejoin="round"/>
  <path d="M32 56 L14 76 L14 88 L32 78 Z" fill="#f7f5ef" stroke="#1e2235" stroke-width="4" stroke-linejoin="round"/>
  <path d="M68 56 L86 76 L86 88 L68 78 Z" fill="#f7f5ef" stroke="#1e2235" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="50" cy="42" r="13" fill="#232741" stroke="#f7f5ef" stroke-width="4"/>
  <circle cx="45" cy="41" r="2.4" fill="#5fd3a6"/><circle cx="55" cy="41" r="2.4" fill="#5fd3a6"/>
  <path d="M45 47 Q50 50 55 47" fill="none" stroke="#5fd3a6" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M40 76 L44 90 L50 82 L56 90 L60 76 Z" fill="#f97316" stroke="#1e2235" stroke-width="3" stroke-linejoin="round"/>
</svg>`;
}

/** Un alien redondo de un ojo. `vida` > 1 lo dibuja con casco. */
export function alienSvg(size = 72, vida = 1): string {
  const helmet =
    vida > 1
      ? '<path d="M18 40 Q50 4 82 40" fill="none" stroke="#94a3b8" stroke-width="9" stroke-linecap="round"/>'
      : '';
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <path d="M30 22 L22 8 M70 22 L78 8" stroke="#1e2235" stroke-width="4" stroke-linecap="round"/>
  <circle cx="22" cy="8" r="5" fill="#a3e635" stroke="#1e2235" stroke-width="3"/><circle cx="78" cy="8" r="5" fill="#a3e635" stroke="#1e2235" stroke-width="3"/>
  <path d="M14 56 C14 28 30 18 50 18 C70 18 86 28 86 56 C86 78 72 90 50 90 C28 90 14 78 14 56 Z" fill="#84cc16" stroke="#1e2235" stroke-width="4"/>
  ${helmet}
  <circle cx="50" cy="50" r="17" fill="#f8fafc" stroke="#1e2235" stroke-width="4"/>
  <circle cx="52" cy="52" r="8" fill="#1e2235"/><circle cx="55" cy="48" r="3" fill="#f8fafc"/>
  <path d="M38 76 Q50 82 62 76" fill="none" stroke="#1e2235" stroke-width="4" stroke-linecap="round"/>
</svg>`;
}

/** Explosión (estrella de puntas) para cuando un disparo acierta. */
export function boomSvg(size = 90): string {
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 4 L60 32 L90 22 L72 48 L96 62 L64 66 L68 96 L50 74 L32 96 L36 66 L4 62 L28 48 L10 22 L40 32 Z" fill="#facc15" stroke="#f97316" stroke-width="5" stroke-linejoin="round"/>
  <circle cx="50" cy="52" r="13" fill="#fff7ed"/>
</svg>`;
}
