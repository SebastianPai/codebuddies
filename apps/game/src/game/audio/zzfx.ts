// ZzFX (Zuper Zmall Zound Zynth) — sintetiza efectos de sonido por código,
// sin ningún archivo .mp3/.wav. Adaptado del "ZzFXMicro" oficial de Frank
// Force (MIT License — https://github.com/KilledByAPixel/ZzFX), con dos
// cambios respecto al original:
//   1. El AudioContext se crea de forma perezosa (lazy) en vez de al cargar
//      el módulo: crearlo a nivel de módulo rompería el SSR de Next.js,
//      donde `AudioContext` no existe.
//   2. El volumen global es una variable mutable (setZzfxVolume) en vez de
//      una constante, para poder exponer un control de volumen maestro.
//
// El algoritmo de síntesis (el cuerpo de zzfx()) es una traducción literal
// del original: mismos 21 parámetros, mismo orden, mismo comportamiento.

let audioCtx: AudioContext | null = null;

/** Volumen global; multiplica a todos los sonidos generados. */
export let zzfxVolume = 0.3;

export function setZzfxVolume(volume: number) {
  zzfxVolume = Math.min(1, Math.max(0, volume));
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!audioCtx) {
    const Ctor =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }

  // Los navegadores suspenden el AudioContext hasta el primer gesto del
  // usuario (política de autoplay); intentar reanudarlo es inofensivo si
  // ya está activo.
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }

  return audioCtx;
}

/**
 * Genera y reproduce un efecto de sonido en el momento, sin ningún asset.
 * Parámetros posicionales (todos opcionales, con los defaults del ZzFX
 * original): volume, randomness, frequency, attack, sustain, release,
 * shape, shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime,
 * repeatTime, noise, modulation, bitCrush, delay, sustainVolume, decay,
 * tremolo, filter.
 */
export function zzfx(
  volume = 1,
  randomness = 0.05,
  frequency = 220,
  attack = 0,
  sustain = 0,
  release = 0.1,
  shape = 0,
  shapeCurve = 1,
  slide = 0,
  deltaSlide = 0,
  pitchJump = 0,
  pitchJumpTime = 0,
  repeatTime = 0,
  noise = 0,
  modulation = 0,
  bitCrush = 0,
  delay = 0,
  sustainVolume = 1,
  decay = 0,
  tremolo = 0,
  filter = 0,
): AudioBufferSourceNode | undefined {
  const ctx = getAudioContext();
  if (!ctx) return undefined;

  const sampleRate = 44100;
  const PI2 = Math.PI * 2;
  const abs = Math.abs;
  const sign = (v: number) => (v < 0 ? -1 : 1);

  const startSlide = (slide *= (500 * PI2) / sampleRate / sampleRate);
  let startFrequency = (frequency *=
    (1 + randomness * 2 * Math.random() - randomness) * (PI2 / sampleRate));
  let modOffset = 0;
  let repeat = 0;
  let crush = 0;
  let jump = 1;
  let length: number;
  const b: number[] = [];
  let t = 0;
  let i = 0;
  let s = 0;
  let f: number;

  const source = ctx.createBufferSource();

  const quality = 2;
  const w = (PI2 * abs(filter) * 2) / sampleRate;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / 2 / quality;
  const a0 = 1 + alpha;
  const a1 = (-2 * cos) / a0;
  const a2 = (1 - alpha) / a0;
  const b0 = (1 + sign(filter) * cos) / 2 / a0;
  const b1 = -(sign(filter) + cos) / a0;
  const b2 = b0;
  let x2 = 0,
    x1 = 0,
    y2 = 0,
    y1 = 0;

  const minAttack = 9; // evita un "pop" si attack es 0
  attack = attack * sampleRate || minAttack;
  decay *= sampleRate;
  sustain *= sampleRate;
  release *= sampleRate;
  delay *= sampleRate;
  deltaSlide *= (500 * PI2) / sampleRate ** 3;
  modulation *= PI2 / sampleRate;
  pitchJump *= PI2 / sampleRate;
  pitchJumpTime *= sampleRate;
  repeatTime = (repeatTime * sampleRate) | 0;
  volume *= zzfxVolume;

  for (
    length = (attack + decay + sustain + release + delay) | 0;
    i < length;
    b[i++] = s * volume
  ) {
    if (!(++crush % ((bitCrush * 100) | 0))) {
      s = shape
        ? shape > 1
          ? shape > 2
            ? shape > 3
              ? shape > 4
                ? (((t / PI2) % 1 < shapeCurve / 2 ? 2 : 0) - 1) // 5: square duty
                : Math.sin(t ** 3) // 4: noise
              : Math.max(Math.min(Math.tan(t), 1), -1) // 3: tan
            : 1 - (((2 * t) / PI2) % 2 + 2) % 2 // 2: saw
          : 1 - 4 * abs(Math.round(t / PI2) - t / PI2) // 1: triangle
        : Math.sin(t); // 0: sin

      s =
        (repeatTime
          ? 1 - tremolo + tremolo * Math.sin((PI2 * i) / repeatTime)
          : 1) *
        (shape > 4 ? s : sign(s) * abs(s) ** shapeCurve) *
        (i < attack
          ? i / attack
          : i < attack + decay
            ? 1 - ((i - attack) / decay) * (1 - sustainVolume)
            : i < attack + decay + sustain
              ? sustainVolume
              : i < length - delay
                ? ((length - i - delay) / release) * sustainVolume
                : 0);

      s = delay
        ? s / 2 +
          (delay > i
            ? 0
            : ((i < length - delay ? 1 : (length - i) / delay) *
                b[(i - delay) | 0]) /
              2 /
              volume)
        : s;

      if (filter) {
        s = y1 =
          b2 * x2 + b1 * (x2 = x1) + b0 * (x1 = s) - a2 * y2 - a1 * (y2 = y1);
      }
    }

    f = (frequency += slide += deltaSlide) * Math.cos(modulation * modOffset++);
    t += f + f * noise * Math.sin(i ** 5);

    if (jump && ++jump > pitchJumpTime) {
      frequency += pitchJump;
      startFrequency += pitchJump;
      jump = 0;
    }

    if (repeatTime && !(++repeat % repeatTime)) {
      frequency = startFrequency;
      slide = startSlide;
      jump ||= 1;
    }
  }

  const buffer = ctx.createBuffer(1, b.length, sampleRate);
  buffer.getChannelData(0).set(b);
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
  return source;
}
