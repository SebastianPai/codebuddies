import {
  PYODIDE_CDN,
  PYTHON_FRIENDLY_ERRORS,
  PYTHON_HARNESS,
  PYTHON_TIMEOUT_MS,
  buddySvg,
  parsePythonChecks,
} from "@codebuddies/world-objects";

// Documento del iframe de vista previa para los ejercicios de Python: una
// consola donde se ve lo que muestra el programa, con Buddy arriba que
// reacciona. Corre Python de verdad (Pyodide) en un Web Worker dentro del
// iframe aislado (sandbox sin allow-same-origin), con el MISMO arnés que usa la
// API para corregir; si el programa no termina, se corta.
//
// El documento es FIJO durante todo el ejercicio: Python empieza a cargarse
// apenas se abre la página (mientras el alumno lee) y cada Comprobar le manda
// el código por mensaje:
//   padre  -> iframe: { type: "python-run", id, code }
//   iframe -> padre:  { type: "python-stage-hello" } (al arrancar: el padre
//                     reenvía la última orden si se perdió),
//                     "buddy-line" (línea con error) y "exercise-result".

export type PythonStageLabels = {
  ready: string; // antes de comprobar
  loading: string; // cargando Python
  running: string; // corriendo el programa
  error: string; // prefijo de un error
  passed: string;
  console: string; // título de la consola
  inputs: string; // "Datos que escribe el usuario"
  empty: string; // el programa no mostró nada
  offline: string; // no se pudo cargar Python
};

export function buildPythonStageDoc(checks: string, labels: PythonStageLabels) {
  const { entradas } = parsePythonChecks(checks);
  const faces = { normal: buddySvg("normal", 64), feliz: buddySvg("feliz", 64), sorprendido: buddySvg("sorprendido", 64) };
  const inputsHtml = entradas.length
    ? `<div class="inputs"><span>${escapeHtml(labels.inputs)}:</span>${entradas.map((e) => `<code>${escapeHtml(e)}</code>`).join("")}</div>`
    : "";
  const worker = [
    `importScripts(${JSON.stringify(PYODIDE_CDN + "pyodide.js")});`,
    `var ready = loadPyodide({ indexURL: ${JSON.stringify(PYODIDE_CDN)} }).then(function (py) { py.setStdout({ batched: function () {} }); py.runPython(${JSON.stringify(PYTHON_HARNESS)}); return py; });`,
    `ready.then(function () { postMessage({ listo: true }); }, function (e) { postMessage({ fallo: String((e && e.message) || e) }); });`,
    `onmessage = function (ev) { ready.then(function (py) { var f = py.globals.get("__cb_correr"); var r = f(ev.data.codigo, ev.data.pruebas, py.toPy(ev.data.entradas)); postMessage({ id: ev.data.id, out: String(r) }); }); };`,
  ].join("\n");
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; overflow: hidden; font-family: "Nunito", "Inter", system-ui, sans-serif; }
  body { background: #11131f; color: #e5e7eb; display: flex; flex-direction: column; }
  .top { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: #1e2235; border-bottom: 1px solid #2d3250; }
  .face { width: 64px; height: 64px; flex: none; }
  .face svg { display: block; }
  .title { font-weight: 800; font-size: 15px; color: #fff; }
  .sub { font-size: 13px; color: #a5b4cf; margin-top: 2px; }
  .inputs { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 8px 14px; background: #171a2b; border-bottom: 1px solid #2d3250; font-size: 12px; color: #a5b4cf; }
  .inputs code { padding: 2px 8px; border-radius: 8px; background: #2d3250; color: #fde68a; font-family: "JetBrains Mono", ui-monospace, monospace; }
  .out { flex: 1; margin: 0; padding: 14px; overflow: auto; font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 14px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; color: #d1fae5; }
  .out .muted { color: #64748b; font-style: italic; }
  .status { margin: 10px; padding: 10px 14px; border-radius: 14px; background: rgba(148,163,184,.18); color: #fff; font-weight: 700; font-size: 14px; }
  .status.ok { background: #047857; }
  .status.bad { background: #b91c1c; }
  .dots::after { content: ""; animation: dots 1.2s steps(4) infinite; }
  @keyframes dots { 0% { content: ""; } 25% { content: "."; } 50% { content: ".."; } 75% { content: "..."; } }
</style>
</head>
<body>
  <div class="top"><div class="face" id="face"></div><div><div class="title">${escapeHtml(labels.console)}</div><div class="sub" id="sub"></div></div></div>
  ${inputsHtml}
  <pre class="out" id="out"></pre>
  <div class="status" id="status">${escapeHtml(labels.ready)}</div>
<script>
var L = ${js(labels)};
var FACES = ${js(faces)};
var FRIENDLY = ${js(PYTHON_FRIENDLY_ERRORS)};
var CHECKS = ${js(checks)};
var INPUTS = ${js(entradas)};
var HAS_CHECKS = ${checks.trim() ? "true" : "false"};
var WORKER_SRC = ${js(worker)};
var faceEl = document.getElementById("face");
var outEl = document.getElementById("out");
var statusEl = document.getElementById("status");
var subEl = document.getElementById("sub");
function setFace(m) { faceEl.innerHTML = FACES[m] || FACES.normal; }
function setStatus(cls, text, dots) {
  statusEl.className = "status" + (cls ? " " + cls : "");
  statusEl.textContent = "";
  var s = document.createElement("span");
  if (dots) s.className = "dots";
  s.textContent = text;
  statusEl.appendChild(s);
}
setFace("normal");
function friendly(tipo, msg) {
  msg = msg || "";
  for (var k = 0; k < FRIENDLY.length; k++) {
    var f = FRIENDLY[k];
    if (f.tipo && f.tipo !== tipo) continue;
    var m = msg.match(new RegExp(f.pattern));
    if (m) return f.message.replace("$1", m[1] || m[2] || "").replace("$2", m[2] || "");
  }
  return tipo ? tipo + ": " + msg : msg;
}
function toParent(msg) { window.parent.postMessage(msg, "*"); }

function report(res) {
  outEl.textContent = "";
  if (res.salida) outEl.textContent = res.salida;
  else { var e = document.createElement("span"); e.className = "muted"; e.textContent = L.empty; outEl.appendChild(e); }
  var message = null, passed = false;
  if (!res.ok) {
    message = (res.linea ? "Línea " + res.linea + ": " : "") + friendly(res.tipo, res.mensaje);
    if (res.linea) toParent({ type: "buddy-line", line: res.linea, state: "bad" });
    setFace("sorprendido");
    setStatus("bad", L.error + " " + message);
  } else if (HAS_CHECKS && res.paso === false) {
    var motivo = res.motivo || "";
    if (motivo.indexOf("__cb_error_prueba:") === 0) {
      var rest = motivo.slice(18).split(": ");
      message = friendly(rest[0], rest.slice(1).join(": "));
    } else message = motivo || "Todavía no es lo que pide el ejercicio.";
    setFace("normal");
    setStatus("bad", message);
  } else {
    passed = true;
    setFace("feliz");
    setStatus("ok", L.passed);
  }
  if (HAS_CHECKS) toParent({ type: "exercise-result", passed: passed, message: message });
}

// ─── El worker con Python ──────────────────────────────────────────────
var worker = null, listo = false, pendiente = null, corriendo = null, timer = null, ultimo = null;
function nuevoWorker() {
  listo = false;
  subEl.textContent = L.loading + "...";
  try {
    worker = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" })));
  } catch (e) {
    setStatus("bad", L.offline);
    return;
  }
  worker.onmessage = function (ev) {
    var d = ev.data || {};
    if (d.listo) {
      listo = true;
      subEl.textContent = "Python";
      if (pendiente) { var p = pendiente; pendiente = null; correr(p); }
    } else if (d.fallo) {
      setStatus("bad", L.offline);
    } else if (d.out && corriendo && d.id === corriendo.id) {
      clearTimeout(timer);
      corriendo = null;
      try { report(JSON.parse(d.out)); } catch (e) { report({ ok: false, salida: "", tipo: "Error", mensaje: String(e) }); }
    }
  };
  worker.onerror = function () { setStatus("bad", L.offline); };
}
function correr(job) {
  if (!worker) nuevoWorker();
  toParent({ type: "buddy-line", state: "reset" });
  setFace("normal");
  outEl.textContent = "";
  if (!listo) { pendiente = job; setStatus("", L.loading, true); return; }
  corriendo = job;
  setStatus("", L.running, true);
  timer = setTimeout(function () {
    // Un programa que no termina: se corta el worker y se prepara otro.
    worker.terminate();
    worker = null;
    corriendo = null;
    report({ ok: false, salida: "", tipo: "Tiempo", mensaje: "__cb_tiempo" });
    nuevoWorker();
  }, ${PYTHON_TIMEOUT_MS});
  worker.postMessage({ id: job.id, codigo: job.code, pruebas: CHECKS, entradas: INPUTS });
}
window.addEventListener("message", function (ev) {
  var d = ev.data || {};
  if (d.type !== "python-run" || typeof d.code !== "string") return;
  if (ultimo === d.id) return; // ya recibida (el padre puede reenviarla)
  ultimo = d.id;
  correr({ id: d.id, code: d.code });
});
nuevoWorker();
toParent({ type: "python-stage-hello" });
</script>
</body>
</html>`;
}

// JSON seguro dentro de <script>: un "</script>" en un texto no cierra la etiqueta.
function js(value: unknown) {
  const bs = String.fromCharCode(92);
  return JSON.stringify(value).replace(/</g, bs + "u003c").replace(new RegExp(String.fromCharCode(0x2028), "g"), bs + "u2028").replace(new RegExp(String.fromCharCode(0x2029), "g"), bs + "u2029");
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}
