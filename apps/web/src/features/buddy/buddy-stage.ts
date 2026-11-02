import { BUDDY_FRIENDLY_ERRORS, BUDDY_MOODS, BUDDY_RUNTIME, buddySvg } from "@codebuddies/world-objects";

// Documento del iframe de vista previa para los ejercicios de Buddy: corre el
// código del alumno con el mismo motor que usa la API para corregir y después
// reproduce cada orden con una animación (hablar, reírse, saltar, dormir...).
// Al terminar avisa al padre con el resultado de las verificaciones, igual que
// la vista previa de HTML/CSS/JS ("exercise-result").

export type BuddyStageLabels = {
  ready: string;
  error: string;
  passed: string;
};

const STEP_MS = 750;

// El código del alumno viaja como texto JSON dentro de un <script> y se corre
// con new Function: así un error de escritura se atrapa y se le explica, en
// vez de impedir que el navegador lea el escenario. Un "</script>" escrito por
// el alumno cerraría la etiqueta antes de tiempo: se escapa la barra.
const asScriptString = (code: string) => JSON.stringify(code).replace(/<\/(script)/gi, "<\\/$1");

export function buildBuddyStageDoc(studentCode: string, assertions: string, labels: BuddyStageLabels) {
  // Una cara por ánimo, ya dibujadas: la reproducción solo cambia cuál se ve.
  const faces = Object.fromEntries(BUDDY_MOODS.map((mood) => [mood, buddySvg(mood, 150)]));
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; font-family: "Nunito", "Inter", system-ui, sans-serif; overflow: hidden; }
  body { background: linear-gradient(180deg, #bfe3ff 0%, #e8f6ff 62%, #a7e3a1 62%, #86d483 100%); }
  .sun { position: absolute; top: 18px; right: 24px; width: 54px; height: 54px; border-radius: 50%; background: #ffe27a; box-shadow: 0 0 40px #ffe27a; }
  .cloud { position: absolute; height: 22px; border-radius: 20px; background: #fff; opacity: .9; }
  .stage { position: absolute; left: 0; right: 0; bottom: 30%; height: 0; }
  .buddy { position: absolute; bottom: -24px; left: 12%; width: 150px; transition: left .5s ease; }
  .buddy svg { display: block; filter: drop-shadow(0 6px 0 rgba(0,0,0,.12)); }
  .bubble { position: absolute; bottom: 160px; left: 50%; transform: translateX(-30%); min-width: 140px; max-width: 280px; padding: 10px 14px; border: 3px solid #1e2235; border-radius: 18px; background: #fff; color: #1e2235; font-weight: 800; font-size: 16px; text-align: center; opacity: 0; transition: opacity .2s; }
  .bubble.show { opacity: 1; }
  .bubble::after { content: ""; position: absolute; left: 22px; bottom: -12px; border: 10px solid transparent; border-top-color: #1e2235; border-bottom: 0; }
  .fx { position: absolute; font-size: 26px; font-weight: 900; pointer-events: none; animation: rise 1s ease-out forwards; }
  .jump { animation: jump .55s ease; }
  .dance { animation: dance .7s ease; }
  .laugh { animation: laugh .6s ease; }
  .eat { animation: eat .6s ease; }
  @keyframes rise { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-70px); opacity: 0; } }
  @keyframes jump { 40% { transform: translateY(-70px); } 70% { transform: translateY(0) scaleY(.92); } }
  @keyframes dance { 25% { transform: rotate(-12deg); } 50% { transform: rotate(12deg) translateY(-8px); } 75% { transform: rotate(-8deg); } }
  @keyframes laugh { 20%, 60% { transform: translateY(-6px) rotate(-4deg); } 40%, 80% { transform: translateY(0) rotate(4deg); } }
  @keyframes eat { 50% { transform: scale(1.08); } }
  .status { position: absolute; left: 12px; right: 12px; bottom: 12px; padding: 10px 14px; border-radius: 14px; background: rgba(30,34,53,.88); color: #fff; font-weight: 700; font-size: 14px; }
  .status.ok { background: #16a34a; }
  .status.bad { background: #dc2626; }
  .meter { position: absolute; top: 12px; left: 12px; display: flex; gap: 8px; }
  .meter span { padding: 6px 10px; border-radius: 12px; background: rgba(255,255,255,.85); color: #1e2235; font-weight: 800; font-size: 13px; }
</style>
</head>
<body>
  <div class="sun"></div>
  <div class="cloud" style="top:40px;left:18%;width:90px"></div>
  <div class="cloud" style="top:70px;left:55%;width:120px"></div>
  <div class="meter"><span id="energy">⚡ 5</span><span id="laughs">😂 0</span></div>
  <div class="stage"><div class="buddy" id="buddy"><div class="bubble" id="bubble"></div><div id="face"></div></div></div>
  <div class="status" id="status">${escapeHtml(labels.ready)}</div>
<script>
${BUDDY_RUNTIME}
</script>
<script>
var FACES = ${JSON.stringify(faces)};
var FRIENDLY = ${JSON.stringify(BUDDY_FRIENDLY_ERRORS)};
function friendly(message) {
  for (var k = 0; k < FRIENDLY.length; k++) {
    var m = message.match(new RegExp(FRIENDLY[k].pattern, "i"));
    if (m) return FRIENDLY[k].message.replace("$1", m[1] || "");
  }
  return message;
}
var buddyEl = document.getElementById("buddy");
var faceEl = document.getElementById("face");
var bubbleEl = document.getElementById("bubble");
var statusEl = document.getElementById("status");
var energyEl = document.getElementById("energy");
var laughsEl = document.getElementById("laughs");
function setFace(mood) { faceEl.innerHTML = FACES[mood] || FACES.normal; }
function say(text) { bubbleEl.textContent = text; bubbleEl.classList.add("show"); }
function quiet() { bubbleEl.classList.remove("show"); }
function fx(text, color) {
  var el = document.createElement("div");
  el.className = "fx"; el.textContent = text; el.style.color = color || "#1e2235";
  var rect = buddyEl.getBoundingClientRect();
  el.style.left = (rect.left + 40 + Math.random() * 60) + "px";
  el.style.top = (rect.top - 10) + "px";
  document.body.appendChild(el);
  setTimeout(function () { el.remove(); }, 1000);
}
function anim(name) { buddyEl.classList.remove(name); void buddyEl.offsetWidth; buddyEl.classList.add(name); }
function place(pos) { buddyEl.style.left = "calc(12% + " + Math.max(-2, Math.min(8, pos)) * 7 + "%)"; }
setFace("normal");

var error = null;
try {
  new Function(${asScriptString(studentCode)})();
} catch (e) { error = friendly(e && e.message ? e.message : String(e)); }
var report = __buddyReport();
var result = null;
${
  assertions.trim()
    ? `if (!error) {
  try {
    new Function("assert", ${asScriptString(assertions)})(function (c, m) { if (!c) throw new Error(m || "Buddy todavía no está como pide el ejercicio"); });
    result = { passed: true };
  } catch (e) { result = { passed: false, message: e && e.message ? e.message : String(e) }; }
} else { result = { passed: false, message: error }; }`
    : ""
}

var pos = 0, laughs = 0, energy = 5, i = 0;
function next() {
  if (i >= report.steps.length) return finish();
  var step = report.steps[i++];
  quiet();
  setFace(step.animo);
  switch (step.accion) {
    case "decir": say(step.texto); break;
    case "chiste": laughs = step.risas; anim("laugh"); fx("¡JA!", "#d97706"); if (step.risas >= 3) fx("¡JAJAJA!", "#dc2626"); energy = Math.max(0, energy - 1); break;
    case "saltar": anim("jump"); energy = Math.max(0, energy - 1); break;
    case "bailar": anim("dance"); fx("♪", "#7c3aed"); break;
    case "dormir": fx("Zzz", "#475569"); energy = 5; break;
    case "despertar": fx("!", "#f59e0b"); break;
    case "comer": anim("eat"); fx("🍰"); energy = Math.min(10, energy + 2); break;
    case "avanzar": pos += step.pasos; place(pos); break;
    case "zzz": fx("Zzz", "#475569"); say("Zzz…"); break;
  }
  energyEl.textContent = "⚡ " + energy;
  laughsEl.textContent = "😂 " + laughs;
  setTimeout(next, ${STEP_MS});
}
function finish() {
  setFace(report.state.animo);
  energyEl.textContent = "⚡ " + report.state.energia;
  laughsEl.textContent = "😂 " + report.state.risas;
  if (error) {
    setFace("sorprendido");
    say("¡Ups!");
    statusEl.className = "status bad";
    statusEl.textContent = ${JSON.stringify(labels.error)} + " " + error;
  } else if (result) {
    statusEl.className = "status " + (result.passed ? "ok" : "bad");
    statusEl.textContent = result.passed ? ${JSON.stringify(labels.passed)} : result.message;
  }
  if (result) window.parent.postMessage({ type: "exercise-result", passed: result.passed, message: result.message }, "*");
}
setTimeout(next, 400);
</script>
</body>
</html>`;
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}
