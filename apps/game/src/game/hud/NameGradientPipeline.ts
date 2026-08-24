import Phaser from "phaser";

// Primer shader custom del proyecto -- reemplaza el hack anterior (Rectangle
// en blend ADD + BitmapMask) por un PostFXPipeline real de Phaser, aplicado
// directamente sobre el Text ya renderizado (ver PlayerHUD.applyNameEffect).
//
// Técnica (equivalente nativo de Phaser a background-clip:text + gradiente
// animado en CSS):
//   1. Cuando el efecto tiene animación, el Text se pinta en BLANCO puro
//      (en vez de un color fijo) -- eso hace que la textura ya renderizada
//      por Phaser sirva de máscara: relleno = blanco, contorno = oscuro
//      (mismo #0b0f1a que ya usa DEFAULT_NAMEPLATE_STYLE.outlineColor en
//      TODOS los nameplates, así que hardcodearlo acá no rompe nada).
//   2. Este shader lee esa textura, distingue relleno de contorno por
//      luminosidad (src.r), y solo el relleno recibe el degradado --
//      el contorno se mantiene intacto para no perder legibilidad.
//   3. El color del degradado sale de hasta 8 uniforms vec3 individuales
//      (no un array) para no depender del indexado dinámico de arrays en
//      GLSL ES 1.00, que en hardware WebGL1 viejo/móvil no siempre es
//      portable -- acá cada acceso a "colorAt(i)" es un if-chain con un
//      índice de loop de cota constante, 100% portable.
//   4. El barrido es dot(uv, dirección) + tiempo, en loop (fract) -- en
//      espacio UV (0-1 dentro del propio glyph), no en píxeles de pantalla,
//      así el efecto es invariante al zoom de cámara (1x/2x/3x) sin ningún
//      código extra.
const FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uDirection;
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

  float t = fract(dot(outTexCoord, uDirection) + uTime * uSpeed);
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

  // RGB premultiplicado por alpha -- mismo criterio que espera el
  // pipeline por defecto de Phaser para blend correcto en los bordes
  // antialiaseados del texto.
  gl_FragColor = vec4(finalColor * src.a, src.a);
}
`;

export const NAME_GRADIENT_PIPELINE_KEY = "NameGradientPipeline";
const MAX_COLOR_STOPS = 8;

interface PendingGradient {
  colorsHex: string[];
  speed: number;
  angleDeg: number;
}

// Instancia UNA sola vez por juego (ver ensureRegistered) -- Phaser compila
// el shader una sola vez para el key, y cada Text que lo usa
// (setPostPipeline) obtiene una instancia liviana propia que comparte el
// WebGLProgram compilado, solo con sus propios uniforms (colores/velocidad/
// dirección). Con 30-100 nameplates visibles, el costo por jugador es
// "algunos floats seteados", no "un shader nuevo compilado".
export default class NameGradientPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  // Las Post FX Pipelines de Phaser NO bootean (compilan/bindean su shader)
  // en el constructor -- bootean recién en el primer draw real (ver
  // PostFXPipeline#postBatch -> bootFX). Por eso `currentShader` (y por lo
  // tanto set1f/set2f/set3f/set1i) NO existe todavía justo después de
  // `setPostPipeline()`. Llamar a esos setters de forma síncrona ahí
  // (como hacía la versión anterior de este archivo) revienta con
  // "Cannot read properties of undefined (reading 'set3f')" -- confirmado
  // con un harness Phaser standalone. La solución: guardar los valores
  // pedidos en un campo plano (sin tocar GL) y aplicarlos recién dentro de
  // onPreRender, que Phaser solo invoca después de bootear el pipeline.
  private pending: PendingGradient | null = null;
  private applied: PendingGradient | null = null;

  constructor(game: Phaser.Game) {
    super({
      game,
      name: NAME_GRADIENT_PIPELINE_KEY,
      fragShader: FRAGMENT_SHADER,
    });
  }

  onPreRender() {
    this.set1f("uTime", this.game.loop.time / 1000);

    if (this.pending && this.pending !== this.applied) {
      this.applyGradient(this.pending);
      this.applied = this.pending;
    }
  }

  // Puede llamarse en cualquier momento (incluso antes del primer render) --
  // solo guarda los valores. El push real de uniforms ocurre en onPreRender.
  setGradient(colorsHex: string[], speed: number, angleDeg: number) {
    this.pending = { colorsHex, speed, angleDeg };
  }

  private applyGradient({ colorsHex, speed, angleDeg }: PendingGradient) {
    const stops = colorsHex.slice(0, MAX_COLOR_STOPS);
    for (let i = 0; i < MAX_COLOR_STOPS; i++) {
      const hex = stops[i] ?? stops[stops.length - 1] ?? "#ffffff";
      const color = Phaser.Display.Color.HexStringToColor(hex);
      this.set3f(`uColor${i}`, color.redGL, color.greenGL, color.blueGL);
    }
    this.set1i("uColorCount", Math.max(2, stops.length));
    this.set1f("uSpeed", speed);

    const rad = Phaser.Math.DegToRad(angleDeg);
    this.set2f("uDirection", Math.cos(rad), Math.sin(rad));
  }
}

// Registra el pipeline en el juego si todavía no existe -- idempotente, así
// cada PlayerHUD puede llamar esto sin preocuparse de quién fue el primero.
// Devuelve false (y no registra nada) si el renderer activo no es WebGL --
// PostFX es una feature exclusiva de WebGL; en Canvas, setPostPipeline() es
// un no-op silencioso, así que ni vale la pena intentarlo (ver
// PlayerHUD#applyNameEffect para el fallback a color sólido).
export function ensureNameGradientPipeline(scene: Phaser.Scene): boolean {
  const renderer = scene.game.renderer;
  if (renderer.type !== Phaser.WEBGL) return false;

  const pipelines = (renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines;
  if (!pipelines.has(NAME_GRADIENT_PIPELINE_KEY)) {
    pipelines.addPostPipeline(NAME_GRADIENT_PIPELINE_KEY, NameGradientPipeline);
  }
  return true;
}
