import Phaser from "phaser";

// Mide qué parte de un cuadro de spritesheet tiene dibujo (píxeles no
// transparentes). Las hojas suelen traer margen transparente alrededor del
// personaje (p. ej. celdas de 128×224 con el mayordomo ocupando ~75×155):
// para darle a un NPC el tamaño correcto hay que escalar por el DIBUJO, no
// por la celda.

export type OpaqueBox = { top: number; bottom: number; left: number; right: number; height: number; width: number };

const cache = new Map<string, OpaqueBox | null>();

export function measureOpaqueBox(
  scene: Phaser.Scene,
  textureKey: string,
  frameX: number,
  frameY: number,
  frameW: number,
  frameH: number,
): OpaqueBox | null {
  const key = `${textureKey}:${frameX}:${frameY}:${frameW}x${frameH}`;
  if (cache.has(key)) return cache.get(key)!;
  let box: OpaqueBox | null = null;
  try {
    const source = scene.textures.get(textureKey).getSourceImage() as CanvasImageSource;
    const canvas = document.createElement("canvas");
    canvas.width = frameW;
    canvas.height = frameH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(source, frameX, frameY, frameW, frameH, 0, 0, frameW, frameH);
      const { data } = ctx.getImageData(0, 0, frameW, frameH);
      let top = frameH;
      let bottom = -1;
      let left = frameW;
      let right = -1;
      for (let y = 0; y < frameH; y++) {
        for (let x = 0; x < frameW; x++) {
          if (data[(y * frameW + x) * 4 + 3] > 20) {
            if (y < top) top = y;
            if (y > bottom) bottom = y;
            if (x < left) left = x;
            if (x > right) right = x;
          }
        }
      }
      if (bottom >= 0) box = { top, bottom, left, right, height: bottom - top + 1, width: right - left + 1 };
    }
  } catch {
    // Imagen sin CORS (canvas "contaminado"): sin medida, se usa el cuadro.
    box = null;
  }
  cache.set(key, box);
  return box;
}

/** Alto visible del avatar del jugador (sin la placa de nombre, que es HTML). */
export function playerVisualHeight(player: Phaser.GameObjects.Container | undefined, fallback = 96): number {
  if (!player) return fallback;
  try {
    const height = player.getBounds().height;
    return Number.isFinite(height) && height > 24 ? height : fallback;
  } catch {
    return fallback;
  }
}
