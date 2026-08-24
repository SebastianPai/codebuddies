import Phaser from "phaser";

// Reproduce EXACTAMENTE (no "parecido") el degradado animado que
// packages/visual-effects/effects.css pinta sobre `.cb-fx-text-*` con
// `background-clip: text` + `background-image: linear-gradient(...)` +
// `background-size` + `animation: ... background-position`. Ver
// VisualEffectDefinition.gradientAnimation -- ese objeto (colors, angleDeg,
// sizeX/Y, durationMs) es la ÚNICA fuente de verdad; este archivo no
// hardcodea el ángulo/tamaño/velocidad de ningún efecto, solo sabe cómo
// convertir esos parámetros en la matemática que un shader necesita.
//
// Arquitectura (texto como máscara, igual que antes):
//   1. Con animación, usernameText se pinta en BLANCO puro -- la textura ya
//      renderizada por Phaser sirve de máscara: relleno = blanco, contorno
//      = oscuro (mismo #0b0f1a de siempre).
//   2. Este shader distingue relleno de contorno por luminosidad (src.r) y
//      solo el relleno recibe el degradado.
//   3. La posición dentro del degradado ("gradT", 0-1) es una función
//      AFINE de la UV del fragmento: gradT = Ku*u + Kv*v + Kconst. Ku/Kv
//      salen del ángulo+aspect-ratio+background-size del efecto (constantes
//      mientras no cambie el texto/efecto); Kconst es lo único que depende
//      del tiempo (posición animada, background-position), y se recalcula
//      en la CPU (TS) una vez por frame -- no en el shader. Ver
//      `computeStaticCoeffs`/`computeKconst` más abajo para la derivación.
const FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uKu;
uniform float uKv;
uniform float uKconst;
uniform int uColorCount;
uniform vec3 uColor0;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform vec3 uColor5;
uniform vec3 uColor6;
uniform vec3 uColor7;

varying vec2 outTexCoord;

const vec3 OUTLINE_COLOR = vec3(0.0431, 0.0588, 0.1020);
const float FILL_LOW = 0.35;
const float FILL_HIGH = 0.75;

vec3 colorAt(int index) {
  if (index <= 0) return uColor0;
  if (index == 1) return uColor1;
  if (index == 2) return uColor2;
  if (index == 3) return uColor3;
  if (index == 4) return uColor4;
  if (index == 5) return uColor5;
  if (index == 6) return uColor6;
  return uColor7;
}

void main() {
  vec4 src = texture2D(uMainSampler, outTexCoord);

  if (src.a <= 0.001) {
    discard;
  }

  int count = uColorCount;
  if (count < 2) count = 2;

  // CSS linear-gradient() clampea (no envuelve) más allá del primer/último
  // stop -- por eso clamp(), no fract() como en la versión anterior.
  float t = clamp(uKu * outTexCoord.x + uKv * outTexCoord.y + uKconst, 0.0, 1.0);
  float segF = t * float(count - 1);

  vec3 gradColor = uColor0;
  for (int i = 0; i < 7; i++) {
    if (i + 1 >= count) break;
    float segStart = float(i);
    if (segF >= segStart && segF <= segStart + 1.0) {
      float localT = clamp(segF - segStart, 0.0, 1.0);
      gradColor = mix(colorAt(i), colorAt(i + 1), localT);
    }
  }

  // Blanco (relleno) -> degradado; oscuro (contorno) -> se mantiene tal
  // cual. smoothstep sobre el mismo rango que ya suaviza el antialiasing
  // del propio Canvas-Text de Phaser, para que la transición no se vea
  // como un borde duro/artificial.
  float fillness = smoothstep(FILL_LOW, FILL_HIGH, src.r);
  vec3 finalColor = mix(OUTLINE_COLOR, gradColor, fillness);

  // RGB premultiplicado por alpha -- mismo criterio que espera el pipeline
  // por defecto de Phaser para blend correcto en los bordes antialiaseados.
  // Los colores en sí NO se linealizan/gamma-corrigen antes del mix() de
  // arriba -- CSS tampoco lo hace por defecto con linear-gradient(#hex...),
  // interpola directo en sRGB codificado, así que este mix() ya coincide.
  gl_FragColor = vec4(finalColor * src.a, src.a);
}
`;

export const NAME_GRADIENT_PIPELINE_KEY = "NameGradientPipeline";
const MAX_COLOR_STOPS = 8;

export type GradientAnimationKind = "shimmer" | "holo";

export interface GradientAnimationParams {
  /** Ángulo de linear-gradient(), grados, convención CSS (ver VisualEffectDefinition.gradientAnimation). */
  angleDeg: number;
  /** background-size en fracción del propio elemento (250% -> 2.5). */
  sizeX: number;
  sizeY: number;
  /** Duración de un ciclo completo, ms. */
  durationMs: number;
  /** Qué @keyframes de effects.css reproducir: shimmer-sweep (barrido lineal, 1 eje) u holo-sweep (diagonal, ease-in-out, ida y vuelta). */
  kind: GradientAnimationKind;
}

interface PendingGradient {
  colorsHex: string[];
  anim: GradientAnimationParams;
  /** Ancho/alto del propio usernameText (px) -- mismo rol que el "box" del elemento DOM en el cálculo del ángulo del gradiente CSS. */
  aspect: number;
}

interface StaticCoeffs {
  ku: number;
  kv: number;
  rg: number;
  sinT: number;
  cosT: number;
  L: number;
  sizeX: number;
  sizeY: number;
}

// Solver estándar de cubic-bezier (algoritmo de WebKit/UnitBezier, dominio
// público, el mismo usado por los navegadores para `animation-timing-
// function`). Necesario porque `cb-fx-holo-sweep` usa `ease-in-out` ==
// cubic-bezier(0.42, 0, 0.58, 1) -- sin esto, el barrido diagonal de
// galaxy/holographic/etc. se movería a velocidad constante en vez de
// acelerar/desacelerar como en CSS.
//
// Se resuelve en TypeScript (no GLSL): la curva solo depende del tiempo,
// no de la posición del fragmento, así que evaluarla una vez por frame en
// la CPU (dentro de onPreRender) es exacto y evita iteración Newton-
// Raphson dentro del shader (más simple, más portable a WebGL1/móvil).
class UnitBezier {
  private readonly ax: number;
  private readonly bx: number;
  private readonly cx: number;
  private readonly ay: number;
  private readonly by: number;
  private readonly cy: number;

  constructor(p1x: number, p1y: number, p2x: number, p2y: number) {
    this.cx = 3 * p1x;
    this.bx = 3 * (p2x - p1x) - this.cx;
    this.ax = 1 - this.cx - this.bx;
    this.cy = 3 * p1y;
    this.by = 3 * (p2y - p1y) - this.cy;
    this.ay = 1 - this.cy - this.by;
  }

  private sampleCurveX(t: number) {
    return ((this.ax * t + this.bx) * t + this.cx) * t;
  }

  private sampleCurveY(t: number) {
    return ((this.ay * t + this.by) * t + this.cy) * t;
  }

  private sampleCurveDerivativeX(t: number) {
    return (3 * this.ax * t + 2 * this.bx) * t + this.cx;
  }

  private solveCurveX(x: number, epsilon = 1e-6) {
    let t2 = x;
    for (let i = 0; i < 8; i++) {
      const x2 = this.sampleCurveX(t2) - x;
      if (Math.abs(x2) < epsilon) return t2;
      const d2 = this.sampleCurveDerivativeX(t2);
      if (Math.abs(d2) < 1e-6) break;
      t2 = t2 - x2 / d2;
    }
    let t0 = 0;
    let t1 = 1;
    t2 = x;
    if (t2 < t0) return t0;
    if (t2 > t1) return t1;
    while (t0 < t1) {
      const x2 = this.sampleCurveX(t2);
      if (Math.abs(x2 - x) < epsilon) return t2;
      if (x > x2) t0 = t2;
      else t1 = t2;
      t2 = (t1 - t0) * 0.5 + t0;
    }
    return t2;
  }

  solve(x: number) {
    return this.sampleCurveY(this.solveCurveX(x));
  }
}

// CSS `ease-in-out` == cubic-bezier(0.42, 0, 0.58, 1) (valor estándar del
// spec, no un ajuste nuestro).
const EASE_IN_OUT = new UnitBezier(0.42, 0, 0.58, 1);

// Constantes de las DOS @keyframes reales de effects.css -- son globales y
// compartidas por todos los efectos de esa familia (no escalan con el
// background-size de cada efecto individual, effects.css las define una
// sola vez arriba del archivo):
//   @keyframes cb-fx-shimmer-sweep { 0% { background-position: 0% 50%; } 100% { background-position: -250% 50%; } }
//   @keyframes cb-fx-holo-sweep    { 0%,100% { background-position: 0% 0%; } 50% { background-position: 100% 100%; } }
const SHIMMER_TARGET_X = -2.5;
const SHIMMER_FIXED_Y = 0.5;
const HOLO_PEAK = 1;

function bgPositionFraction(kind: GradientAnimationKind, progress: number): { bx: number; by: number } {
  if (kind === "shimmer") {
    // linear infinite, un solo tramo 0->100%.
    return { bx: SHIMMER_TARGET_X * progress, by: SHIMMER_FIXED_Y };
  }

  // holo-sweep: ease-in-out infinite, triangular (0,0) -> (1,1) -> (0,0).
  // El timing-function de CSS se aplica dentro de cada tramo de keyframes
  // por separado (mismo cubic-bezier en ambos, acá).
  const inFirstHalf = progress < 0.5;
  const local = inFirstHalf ? progress / 0.5 : (progress - 0.5) / 0.5;
  const eased = EASE_IN_OUT.solve(local);
  const v = (inFirstHalf ? eased : 1 - eased) * HOLO_PEAK;
  return { bx: v, by: v };
}

function computeStaticCoeffs(anim: GradientAnimationParams, aspect: number): StaticCoeffs {
  const rad = Phaser.Math.DegToRad(anim.angleDeg);
  const sinT = Math.sin(rad);
  const cosT = Math.cos(rad);
  // "Generation box" del gradiente = el tamaño real que ocupa el
  // background-image ya escalado por background-size, en px -- lo único
  // que importa de eso para el ángulo es su aspect ratio (Rg).
  const rg = (anim.sizeX / anim.sizeY) * aspect;
  const L = Math.abs(rg * sinT) + Math.abs(cosT);
  const ku = (rg * sinT) / (anim.sizeX * L);
  const kv = -cosT / (anim.sizeY * L);
  return { ku, kv, rg, sinT, cosT, L, sizeX: anim.sizeX, sizeY: anim.sizeY };
}

function computeKconst(coeffs: StaticCoeffs, bx: number, by: number): number {
  const imgOriginU = bx * (1 - coeffs.sizeX);
  const imgOriginV = by * (1 - coeffs.sizeY);
  return (
    0.5 -
    ((coeffs.rg * coeffs.sinT) / coeffs.L) * (imgOriginU / coeffs.sizeX + 0.5) +
    (coeffs.cosT / coeffs.L) * (imgOriginV / coeffs.sizeY + 0.5)
  );
}

// Instancia UNA sola vez por Text (ver PlayerHUD#applyNameEffectVisuals).
// Las Post FX Pipelines de Phaser NO bootean (compilan/bindean su shader)
// en el constructor -- bootean recién en el primer draw real (ver
// PostFXPipeline#postBatch -> bootFX). Por eso `setGradient` NUNCA escribe
// uniforms directamente (revienta con "Cannot read properties of
// undefined (reading 'set3f')" si se llama antes del primer draw) -- solo
// guarda los parámetros; el push real ocurre en onPreRender, que Phaser
// solo invoca después de bootear el pipeline.
export default class NameGradientPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private pending: PendingGradient | null = null;
  private coeffs: StaticCoeffs | null = null;
  private appliedFor: PendingGradient | null = null;

  constructor(game: Phaser.Game) {
    super({
      game,
      name: NAME_GRADIENT_PIPELINE_KEY,
      fragShader: FRAGMENT_SHADER,
    });
  }

  onPreRender() {
    const pending = this.pending;
    if (!pending) return;

    // Ku/Kv (y los colores) solo dependen del efecto+aspect del texto, no
    // del tiempo -- se recalculan/reenvían solo si `pending` cambió desde
    // el último frame (cambio de efecto o de username), nunca en cada
    // frame. Todo esto vive acá (no en `setGradient`) porque Phaser recién
    // garantiza `currentShader` listo dentro de onPreRender -- ver nota de
    // clase.
    if (this.appliedFor !== pending) {
      this.coeffs = computeStaticCoeffs(pending.anim, pending.aspect);
      this.applyColors(pending.colorsHex);
      this.appliedFor = pending;
    }
    const coeffs = this.coeffs!;

    const progress = (this.game.loop.time % pending.anim.durationMs) / pending.anim.durationMs;
    const { bx, by } = bgPositionFraction(pending.anim.kind, progress);
    const kconst = computeKconst(coeffs, bx, by);

    this.set1f("uKu", coeffs.ku);
    this.set1f("uKv", coeffs.kv);
    this.set1f("uKconst", kconst);
  }

  // Llamado por PlayerHUD cada vez que cambia el efecto/username (nunca
  // por frame): guarda los parámetros pedidos, sin tocar GL todavía.
  setGradient(colorsHex: string[], anim: GradientAnimationParams, aspect: number) {
    this.pending = { colorsHex, anim, aspect };
  }

  private applyColors(colorsHex: string[]) {
    const stops = colorsHex.slice(0, MAX_COLOR_STOPS);
    for (let i = 0; i < MAX_COLOR_STOPS; i++) {
      const hex = stops[i] ?? stops[stops.length - 1] ?? "#ffffff";
      const color = Phaser.Display.Color.HexStringToColor(hex);
      this.set3f(`uColor${i}`, color.redGL, color.greenGL, color.blueGL);
    }
    this.set1i("uColorCount", Math.max(2, stops.length));
  }
}

// Registra el pipeline en el juego si todavía no existe -- idempotente, así
// cada PlayerHUD puede llamar esto sin preocuparse de quién fue el primero.
// Devuelve false (y no registra nada) si el renderer activo no es WebGL --
// PostFX es una feature exclusiva de WebGL; en Canvas, setPostPipeline() es
// un no-op silencioso, así que ni vale la pena intentarlo (ver
// PlayerHUD#applyNameEffectVisuals para el fallback a color sólido).
export function ensureNameGradientPipeline(scene: Phaser.Scene): boolean {
  const renderer = scene.game.renderer;
  if (renderer.type !== Phaser.WEBGL) return false;

  const pipelines = (renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines;
  if (!pipelines.has(NAME_GRADIENT_PIPELINE_KEY)) {
    pipelines.addPostPipeline(NAME_GRADIENT_PIPELINE_KEY, NameGradientPipeline);
  }
  return true;
}
