// Bus de audio único del juego: genera efectos de sonido por código con
// ZzFX (ver ./zzfx.ts), sin ningún archivo .mp3/.wav. Ningún componente debe
// llamar a zzfx() directamente: todo pasa por aquí para que exista un solo
// lugar que decida qué suena, con qué preset y a qué volumen.

import { zzfx, setZzfxVolume, zzfxVolume } from "./zzfx";

export type SfxKey = "click" | "coin" | "place" | "error" | "notify";

// Parámetros posicionales de zzfx(): volume, randomness, frequency, attack,
// sustain, release, shape (0 seno, 1 triángulo, 2 sierra, 3 tan, 4 ruido,
// 5 cuadrada), shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime.
// Editar estos números cambia el sonido sin tocar ningún archivo.
const PRESETS: Record<SfxKey, number[]> = {
  // Tick corto y seco (seno) — clicks de UI, reacciones rápidas.
  click: [0.5, 0, 1200, 0, 0.01, 0.03, 0],
  // Dos tonos ascendentes (triángulo) — compra en la tienda.
  coin: [0.7, 0, 880, 0, 0.05, 0.08, 1, 1, 0, 0, 400, 0.02],
  // Pulso grave y corto (seno) — colocar un mueble.
  place: [0.6, 0, 220, 0, 0.02, 0.08, 0],
  // Tono descendente (sierra) — error del servidor.
  error: [0.8, 0.05, 220, 0, 0.1, 0.15, 2, 1, -40],
  // Campanita suave con salto de tono (seno) — chat/reacción de otro jugador.
  notify: [0.5, 0, 660, 0, 0.04, 0.1, 0, 1, 0, 0, 220, 0.05],
};

const MASTER_VOLUME_KEY = "audio:master";
const DEFAULT_MASTER_VOLUME = 0.3;

class AudioManager {
  /** Aplica el volumen guardado. Llamarlo una vez al montar el juego. */
  init() {
    setZzfxVolume(this.getMasterVolume());
  }

  play(key: SfxKey) {
    zzfx(...PRESETS[key]);
  }

  setMasterVolume(volume: number) {
    const clamped = Math.min(1, Math.max(0, volume));
    if (typeof window !== "undefined") {
      localStorage.setItem(MASTER_VOLUME_KEY, String(clamped));
    }
    setZzfxVolume(clamped);
  }

  getMasterVolume(): number {
    if (typeof window === "undefined") return DEFAULT_MASTER_VOLUME;
    const stored = localStorage.getItem(MASTER_VOLUME_KEY);
    return stored !== null ? Number(stored) : DEFAULT_MASTER_VOLUME;
  }

  get currentVolume() {
    return zzfxVolume;
  }
}

export const audioManager = new AudioManager();
