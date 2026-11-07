import {
  NAVE_COLUMNS,
  NAVE_FRIENDLY_ERRORS_BY_LANG,
  NAVE_NOT_YET,
  friendlyLang,
  NAVE_ROWS,
  NAVE_RUNTIME,
  alienSvg,
  boomSvg,
  naveLevelFrom,
  naveSvg,
} from "@codebuddies/world-objects";

// Documento del iframe para los ejercicios de la nave (curso 2 "Crea tu
// juego"). Como el de Buddy: corre el código con el mismo motor que usa la API
// y después anima cada orden (moverse, disparar, explotar aliens). Si el
// código define teclas con juego.alTocar(...), al terminar el escenario se
// vuelve un juego de verdad: los aliens bajan y se juega con el teclado (o con
// los botones de la pantalla en el celular).

export type NaveStageLabels = {
  ready: string;
  error: string;
  passed: string;
  play: string;
  over: string;
};

const STEP_MS = 420;

const ICONS = {
  star: '<svg viewBox="0 0 24 24" width="16" height="16" fill="#facc15" stroke="#1e2235" stroke-width="1.5" stroke-linejoin="round"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" width="16" height="16" fill="#f43f5e" stroke="#1e2235" stroke-width="1.5" stroke-linejoin="round"><path d="M12 20.5s-8-4.9-8-10.6A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8 2.9c0 5.7-8 10.6-8 10.6z"/></svg>',
  left: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  fire: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>',
};

const asScriptString = (code: string) => JSON.stringify(code).replace(/<\/(script)/gi, "<\\/$1");

// Estrellas fijas del fondo (siempre las mismas).
const STARS = Array.from({ length: 40 }, (_, i) => {
  const x = (i * 37) % 100;
  const y = (i * 53) % 100;
  const r = 1 + (i % 3) * 0.6;
  return `<i style="left:${x}%;top:${y}%;width:${r}px;height:${r}px;opacity:${0.35 + (i % 4) * 0.15}"></i>`;
}).join("");

const PAD = {
  es: { left: "izquierda", fire: "disparar", right: "derecha" },
  en: { left: "left", fire: "shoot", right: "right" },
  de: { left: "links", fire: "schießen", right: "rechts" },
};

export function buildNaveStageDoc(studentCode: string, assertions: string, levelSource: string, labels: NaveStageLabels, lang?: string) {
  const l = friendlyLang(lang);
  const pad = PAD[l];
  const level = naveLevelFrom(levelSource) ?? {};
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; font-family: "Nunito", "Inter", system-ui, sans-serif; overflow: hidden; user-select: none; }
  body { background: radial-gradient(ellipse at 50% 120%, #312e81 0%, #1e1b4b 45%, #0b1020 100%); color: #fff; }
  .stars i { position: absolute; border-radius: 50%; background: #fff; }
  .board { position: absolute; left: 50%; top: 52px; bottom: 64px; transform: translateX(-50%); aspect-ratio: ${NAVE_COLUMNS} / ${NAVE_ROWS + 1.3}; max-width: calc(100% - 24px); }
  .cell { position: absolute; width: calc(100% / ${NAVE_COLUMNS}); height: calc(100% / ${NAVE_ROWS + 1.3}); display: flex; align-items: center; justify-content: center; transition: top .35s linear, opacity .25s; }
  .cell svg { width: 82%; height: 82%; }
  .ship { position: absolute; bottom: 0; width: calc(100% / ${NAVE_COLUMNS}); height: calc(130% / ${NAVE_ROWS + 1.3}); transition: left .3s ease; display: flex; align-items: flex-end; justify-content: center; }
  .ship svg { width: 92%; height: 92%; filter: drop-shadow(0 0 10px rgba(96,165,250,.55)); }
  .laser { position: absolute; width: 6px; margin-left: -3px; border-radius: 3px; background: linear-gradient(#fef08a, #f97316); box-shadow: 0 0 12px #facc15; opacity: 0; }
  .laser.go { animation: laser .28s ease-out; }
  @keyframes laser { 0% { opacity: 1; transform: scaleY(0); transform-origin: bottom; } 60% { opacity: 1; transform: scaleY(1); } 100% { opacity: 0; transform: scaleY(1); } }
  .boom { position: absolute; pointer-events: none; animation: boom .45s ease-out forwards; }
  @keyframes boom { from { transform: scale(.3); opacity: 1; } to { transform: scale(1.3); opacity: 0; } }
  .bump { animation: bump .3s ease; }
  @keyframes bump { 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
  .bubble { position: absolute; bottom: calc(130% / ${NAVE_ROWS + 1.3} + 8px); left: 50%; transform: translateX(-50%); max-width: 240px; padding: 8px 12px; border: 3px solid #1e2235; border-radius: 16px; background: #fff; color: #1e2235; font-weight: 800; font-size: 15px; white-space: nowrap; opacity: 0; transition: opacity .2s; }
  .bubble.show { opacity: 1; }
  .meter { position: absolute; top: 12px; left: 12px; display: flex; gap: 8px; }
  .meter span { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 12px; background: rgba(255,255,255,.9); color: #1e2235; font-weight: 800; font-size: 13px; }
  .status { position: absolute; left: 12px; right: 12px; bottom: 12px; padding: 10px 14px; border-radius: 14px; background: rgba(15,23,42,.9); color: #fff; font-weight: 700; font-size: 14px; }
  .status.ok { background: #16a34a; }
  .status.bad { background: #dc2626; }
  .status.play { background: #7c3aed; }
  .pad { position: absolute; right: 12px; top: 10px; display: none; gap: 8px; }
  .pad.show { display: flex; }
  .pad button { width: 46px; height: 40px; border: 0; border-radius: 12px; background: rgba(255,255,255,.92); color: #1e2235; display: flex; align-items: center; justify-content: center; cursor: pointer; }
  .pad button:active { transform: scale(.92); }
</style>
</head>
<body tabindex="0">
  <div class="stars">${STARS}</div>
  <div class="meter"><span>${ICONS.star}<b id="points">0</b></span><span>${alienSvg(16)}<b id="left">0</b></span><span id="lives" style="display:none">${ICONS.heart}<b id="livesN">3</b></span></div>
  <div class="pad" id="pad"><button data-k="izquierda" aria-label="${pad.left}">${ICONS.left}</button><button data-k="espacio" aria-label="${pad.fire}">${ICONS.fire}</button><button data-k="derecha" aria-label="${pad.right}">${ICONS.right}</button></div>
  <div class="board" id="board">
    <div class="ship" id="ship"><div class="bubble" id="bubble"></div><div id="shipArt"></div></div>
  </div>
  <div class="status" id="status">${escapeHtml(labels.ready)}</div>
<script>
var __CB_LANG = ${JSON.stringify(l)};
var __NAVE_NIVEL = ${JSON.stringify(level)};
${NAVE_RUNTIME}
</script>
<script>
var COLS = ${NAVE_COLUMNS}, ROWS = ${NAVE_ROWS}, H = ROWS + 1.3;
var FRIENDLY = ${JSON.stringify(NAVE_FRIENDLY_ERRORS_BY_LANG[l])};
var ALIEN = ${JSON.stringify(alienSvg(72, 1))}, ALIEN2 = ${JSON.stringify(alienSvg(72, 2))}, BOOM = ${JSON.stringify(boomSvg(90))};
var SHIP = ${JSON.stringify(naveSvg("__COLOR__", 96))};
function friendly(message) {
  for (var k = 0; k < FRIENDLY.length; k++) {
    var m = message.match(new RegExp(FRIENDLY[k].pattern, "i"));
    if (m) return FRIENDLY[k].message.replace("$1", m[1] || "");
  }
  return message;
}
var board = document.getElementById("board"), ship = document.getElementById("ship"), shipArt = document.getElementById("shipArt");
var bubble = document.getElementById("bubble"), statusEl = document.getElementById("status");
var pointsEl = document.getElementById("points"), leftEl = document.getElementById("left");
function paintShip(color) { shipArt.innerHTML = SHIP.replace("__COLOR__", color); }
function placeShip(col) { ship.style.left = (col * 100 / COLS) + "%"; }
function topOf(fila) { return (fila * 100 / H) + "%"; }

// Aliens en pantalla: una celda por alien, por clave "col:fila".
var aliens = {};
function drawAliens(list) {
  Object.keys(aliens).forEach(function (k) { aliens[k].el.remove(); });
  aliens = {};
  list.forEach(function (e) { addAlien(e.col, e.fila, e.vida); });
}
function addAlien(col, fila, vida) {
  var el = document.createElement("div");
  el.className = "cell";
  el.style.left = (col * 100 / COLS) + "%";
  el.style.top = topOf(fila);
  el.innerHTML = vida > 1 ? ALIEN2 : ALIEN;
  board.appendChild(el);
  aliens[col + ":" + fila] = { el: el, vida: vida, col: col, fila: fila };
}
function boomAt(col, fila) {
  var el = document.createElement("div");
  el.className = "boom cell";
  el.style.left = (col * 100 / COLS) + "%";
  el.style.top = topOf(fila);
  el.innerHTML = BOOM;
  board.appendChild(el);
  setTimeout(function () { el.remove(); }, 460);
}
function laser(col, fila) {
  var el = document.createElement("div");
  el.className = "laser go";
  el.style.left = ((col + 0.5) * 100 / COLS) + "%";
  var top = fila === null ? 0 : (fila + 0.8) * 100 / H;
  el.style.top = top + "%";
  el.style.bottom = (130 / H) + "%";
  board.appendChild(el);
  setTimeout(function () { el.remove(); }, 300);
}
var sayTimer = null;
function say(text) { bubble.textContent = text; bubble.classList.add("show"); clearTimeout(sayTimer); sayTimer = setTimeout(function () { bubble.classList.remove("show"); }, 1400); }
function bump() { ship.classList.remove("bump"); void ship.offsetWidth; ship.classList.add("bump"); }

// Una orden en pantalla.
function show(step) {
  switch (step.accion) {
    case "mover": placeShip(step.columna); break;
    case "borde": bump(); break;
    case "disparar":
      laser(step.columna, step.impacto ? step.impacto.fila : null);
      if (step.impacto) {
        var key = step.columna + ":" + step.impacto.fila, a = aliens[key];
        boomAt(step.columna, step.impacto.fila);
        if (a) {
          if (step.impacto.destruido) { a.el.remove(); delete aliens[key]; }
          else { a.vida -= 1; a.el.innerHTML = a.vida > 1 ? ALIEN2 : ALIEN; }
        }
      }
      break;
    case "decir": say(step.texto); break;
    case "pintar": paintShip(step.color); break;
  }
}
function meter(state) {
  pointsEl.textContent = String(state.puntos);
  leftEl.textContent = String(state.lista.length);
  document.getElementById("livesN").textContent = String(state.vidas);
}

function mark(line, state) { if (line) window.parent.postMessage({ type: "buddy-line", line: line, state: state }, "*"); }
window.parent.postMessage({ type: "buddy-line", state: "reset" }, "*");

var start = __naveReport();
paintShip(start.state.color);
placeShip(start.state.columna);
drawAliens(start.state.lista);
meter(start.state);

var error = null, errorLine = null;
try {
  new Function(${asScriptString(`${studentCode}\n//# sourceURL=alumno.js`)})();
} catch (e) {
  error = friendly(e && e.message ? e.message : String(e));
  var where = String((e && e.stack) || "").match(/alumno\\.js:(\\d+)/);
  if (where) errorLine = Math.max(1, Number(where[1]) - 2);
}
// Lo que hizo el código del alumno (las verificaciones pueden tocar teclas
// de prueba después: eso no se anima).
var report = __naveReport();
var result = null;
${
  assertions.trim()
    ? `if (!error) {
  try {
    new Function("assert", ${asScriptString(assertions)})(function (c, m) { if (!c) throw new Error(m || ${JSON.stringify(NAVE_NOT_YET[l])}); });
    result = { passed: true };
  } catch (e) { result = { passed: false, message: friendly(e && e.message ? e.message : String(e)) }; }
} else { result = { passed: false, message: error }; }`
    : ""
}
var hasCode = ${JSON.stringify(studentCode.trim().length > 0)};

var i = 0, points = 0;
function next() {
  if (i >= report.steps.length) return finish();
  var step = report.steps[i++];
  if (i > 1) mark(report.steps[i - 2].linea, "ok");
  mark(step.linea, "run");
  show(step);
  if (step.accion === "disparar" && step.impacto && step.impacto.destruido) points += 10;
  pointsEl.textContent = String(points);
  leftEl.textContent = String(Object.keys(aliens).length);
  setTimeout(next, step.accion === "decir" ? 900 : ${STEP_MS});
}
function finish() {
  if (report.steps.length) mark(report.steps[report.steps.length - 1].linea, "ok");
  if (error) mark(errorLine, "bad");
  meter(report.state);
  if (error) {
    statusEl.className = "status bad";
    statusEl.textContent = ${JSON.stringify(labels.error)} + " " + error;
  } else if (result) {
    statusEl.className = "status " + (result.passed ? "ok" : "bad");
    statusEl.textContent = result.passed ? ${JSON.stringify(labels.passed)} : result.message;
  }
  if (result) window.parent.postMessage({ type: "exercise-result", passed: result.passed, message: result.message }, "*");
  if (!error && juego.teclas.length) setTimeout(play, result ? 1600 : 200);
}

// ─── Modo juego ──────────────────────────────────────────────────────────
var playing = false, seen = 0, timer = null, ticks = 0;
function play() {
  playing = true;
  __naveModoJuego();
  var now = __naveReport();
  seen = now.steps.length;
  paintShip(now.state.color);
  placeShip(now.state.columna);
  drawAliens(now.state.lista);
  document.getElementById("lives").style.display = "";
  document.getElementById("pad").classList.add("show");
  meter(now.state);
  statusEl.className = "status play";
  statusEl.textContent = ${JSON.stringify(labels.play)};
  document.body.focus();
  timer = setInterval(tick, 1300);
}
function press(key) {
  if (!playing) return;
  try { juego.tocar(key); } catch (e) { statusEl.className = "status bad"; statusEl.textContent = friendly(e && e.message ? e.message : String(e)); }
  var r = __naveReport(seen);
  seen += r.steps.length;
  r.steps.forEach(show);
  meter(r.state);
}
function tick() {
  ticks += 1;
  // Cada vez aparecen más aliens (pero nunca dos seguidos en la misma columna).
  var spawn = Math.random() < Math.min(0.85, 0.45 + ticks * 0.02) ? Math.floor(Math.random() * COLS) : null;
  __naveTick(spawn);
  var r = __naveReport(seen);
  drawAliens(r.state.lista);
  meter(r.state);
  if (r.state.vidas <= 0) {
    playing = false;
    clearInterval(timer);
    statusEl.className = "status bad";
    statusEl.textContent = ${JSON.stringify(labels.over)}.replace("{points}", String(r.state.puntos));
  }
}
var KEYS = { ArrowLeft: "izquierda", ArrowRight: "derecha", ArrowUp: "arriba", ArrowDown: "abajo", " ": "espacio", Spacebar: "espacio" };
document.addEventListener("keydown", function (event) {
  var key = KEYS[event.key];
  if (!key || !playing) return;
  event.preventDefault();
  if (!event.repeat || key !== "espacio") press(key);
});
document.addEventListener("pointerdown", function () { document.body.focus(); });
Array.prototype.forEach.call(document.querySelectorAll(".pad button"), function (button) {
  button.addEventListener("click", function () { press(button.getAttribute("data-k")); });
});

if (hasCode) setTimeout(next, 350);
</script>
</body>
</html>`;
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}
