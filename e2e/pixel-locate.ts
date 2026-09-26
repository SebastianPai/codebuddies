import { PNG } from "pngjs";

/**
 * Localizador de RoomItems en el `<canvas>` real, por diferencia de píxeles.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTO Y NO UN HOOK DE DEPURACIÓN
 *
 * La Fase 11.5-B prohíbe explícitamente instrumentar el renderer
 * (`window.game`, `window.__DEBUG__` o equivalentes) para que el test
 * "sepa" dónde cayó el sprite en pantalla. La alternativa sin tocar el motor
 * es la misma que usaría una persona mirando la pantalla: comparar dos
 * capturas reales del canvas — una con el objeto y otra sin él — y mirar qué
 * píxeles cambiaron. Ese conjunto de píxeles ES la silueta visible del
 * objeto, en las mismas coordenadas de pantalla que recibiría un click real.
 *
 * El "sin él" se logra con `room:item:remove` (el mismo evento real que usa
 * "recoger" en Build Mode) entre dos capturas — no es una sustitución del
 * click, es la misma clase de uso de socket que el propio arnés ya usa para
 * COLOCAR el item antes de cualquier prueba física.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ COMPONENTE CONEXO MÁS GRANDE, NO EL CENTROIDE GLOBAL
 *
 * Entre dos capturas puede haber también ruido ajeno al objeto (parpadeo del
 * cursor del sistema, un frame distinto de la animación idle del jugador).
 * Tomar el centroide de TODOS los píxeles que cambiaron mezclaría ese ruido
 * con la silueta real. En cambio, agrupar los píxeles cambiados en
 * componentes conexas (4-vecinos) y quedarse con la más grande asume una
 * sola cosa, verificable a simple vista en las capturas: el objeto colocado
 * es, de lejos, el bloque de píxeles contiguos más grande que cambia entre
 * "con" y "sin".
 */

export type PixelPoint = { x: number; y: number };

export type PixelRegion = { xMin: number; xMax: number; yMin: number; yMax: number };

/**
 * ¿Es esta captura, en esencia, un solo color DENTRO de `region`? Sirve para
 * distinguir un canvas que TODAVÍA no terminó de montar la escena (el
 * viewport 3D en negro/uniforme mientras Phaser carga assets o el socket
 * todavía no mandó `room:joined`) de uno que ya tiene contenido real
 * dibujado — sin asumir NINGÚN color concreto de fondo, que además cambia
 * con el tema.
 *
 * `region` (fracciones 0–1 del ancho/alto) importa: el `<canvas>` que
 * capturamos ocupa TODO el viewport, y encima de la escena 3D hay overlays
 * de la propia UI del juego (barra lateral, insignias, controles de zoom,
 * chat) que son casi siempre coloridos — sin recortar a la zona central
 * donde de verdad se dibuja la sala, la sola presencia de esa UI haría que
 * CUALQUIER captura, incluida una con el viewport de juego totalmente negro,
 * pareciera "no uniforme". El default cubre la franja donde estuvo la sala
 * en las capturas reales de esta suite, dejando fuera la barra lateral
 * izquierda, las insignias superiores y la barra de chat inferior.
 */
export function isMostlyUniform(
  png: Buffer,
  maxDifferingRatio = 0.03,
  // El margen izquierdo se corrió de 0.2 a 0.27: a 0.2 cae justo sobre el
  // borde/sombra difuminada de la barra lateral (verificado con las
  // capturas reales de esta suite — unos pocos píxeles de gris ~28,28,28
  // sobre fondo ~14,14,14 bastaban para superar el ratio con la sala
  // realmente en negro, un falso "sí renderizó").
  region: PixelRegion = { xMin: 0.27, xMax: 0.9, yMin: 0.03, yMax: 0.88 },
): boolean {
  const decoded = PNG.sync.read(png);
  const { width, height, data } = decoded;

  const x0 = Math.floor(width * region.xMin);
  const x1 = Math.floor(width * region.xMax);
  const y0 = Math.floor(height * region.yMin);
  const y1 = Math.floor(height * region.yMax);
  const total = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  if (total === 0) return true;

  const firstIdx = (width * y0 + x0) * 4;
  const r0 = data[firstIdx];
  const g0 = data[firstIdx + 1];
  const b0 = data[firstIdx + 2];
  let differing = 0;

  // Umbral de diferencia por píxel más alto que en `locateLargestChange`
  // (50 en vez de 30): acá no interesa localizar nada, sólo distinguir
  // "hay contenido real" de "sombras/antialiasing sutiles de la UI que
  // envuelve el canvas", que producen diferencias pequeñas pero no cero.
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (width * y + x) * 4;
      const dr = Math.abs(data[i] - r0);
      const dg = Math.abs(data[i + 1] - g0);
      const db = Math.abs(data[i + 2] - b0);
      if (dr + dg + db > 50) differing += 1;
    }
  }

  return differing / total < maxDifferingRatio;
}

export type LocateResult = {
  /** Centroide del componente conexo más grande, en píxeles del canvas. */
  point: PixelPoint;
  /** Caja envolvente del mismo componente. */
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  /** Cantidad de píxeles que forman ese componente. */
  pixelCount: number;
  /** Cuántos componentes conexos se detectaron en total (diagnóstico). */
  componentCount: number;
};

/**
 * Compara dos PNG del MISMO tamaño (p. ej. `locator.screenshot()` del mismo
 * `<canvas>` en dos momentos) y devuelve el componente conexo más grande de
 * píxeles que cambiaron por encima de `channelDeltaThreshold`, restringido a
 * `region` (fracciones 0–1 del ancho/alto).
 *
 * SIN esa restricción, la comparación agarra TODO el `<canvas>` capturado —
 * que incluye la barra lateral, insignias y la barra de chat superpuestas al
 * viewport 3D — y cualquier cosa que cambie ahí entre dos capturas (un
 * contador de "conectados", el foco del campo de chat) puede terminar siendo
 * el componente conexo más grande, tapando la silueta real del objeto. El
 * default es la misma franja central que usa `isMostlyUniform()`.
 */
export function locateLargestChange(
  beforePng: Buffer,
  afterPng: Buffer,
  channelDeltaThreshold = 30,
  region: PixelRegion = { xMin: 0.27, xMax: 0.9, yMin: 0.03, yMax: 0.88 },
): LocateResult | null {
  const before = PNG.sync.read(beforePng);
  const after = PNG.sync.read(afterPng);

  if (before.width !== after.width || before.height !== after.height) {
    throw new Error(
      `Las capturas no tienen el mismo tamaño (${before.width}x${before.height} vs ${after.width}x${after.height}) — no son comparables.`,
    );
  }

  const { width, height } = before;
  const x0 = Math.floor(width * region.xMin);
  const x1 = Math.floor(width * region.xMax);
  const y0 = Math.floor(height * region.yMin);
  const y1 = Math.floor(height * region.yMax);
  const changed = new Uint8Array(width * height);

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (width * y + x) * 4;
      const dr = Math.abs(before.data[i] - after.data[i]);
      const dg = Math.abs(before.data[i + 1] - after.data[i + 1]);
      const db = Math.abs(before.data[i + 2] - after.data[i + 2]);
      const da = Math.abs(before.data[i + 3] - after.data[i + 3]);
      if (dr + dg + db + da > channelDeltaThreshold) {
        changed[width * y + x] = 1;
      }
    }
  }

  const visited = new Uint8Array(width * height);
  let best: { count: number; sumX: number; sumY: number; minX: number; minY: number; maxX: number; maxY: number } | null =
    null;
  let componentCount = 0;
  const stack: number[] = [];

  for (let start = 0; start < changed.length; start += 1) {
    if (!changed[start] || visited[start]) continue;

    componentCount += 1;
    let count = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    stack.length = 0;
    stack.push(start);
    visited[start] = 1;

    while (stack.length) {
      const idx = stack.pop() as number;
      const x = idx % width;
      const y = (idx - x) / width;

      count += 1;
      sumX += x;
      sumY += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      // 4-vecinos
      if (x > 0 && changed[idx - 1] && !visited[idx - 1]) {
        visited[idx - 1] = 1;
        stack.push(idx - 1);
      }
      if (x < width - 1 && changed[idx + 1] && !visited[idx + 1]) {
        visited[idx + 1] = 1;
        stack.push(idx + 1);
      }
      if (y > 0 && changed[idx - width] && !visited[idx - width]) {
        visited[idx - width] = 1;
        stack.push(idx - width);
      }
      if (y < height - 1 && changed[idx + width] && !visited[idx + width]) {
        visited[idx + width] = 1;
        stack.push(idx + width);
      }
    }

    if (!best || count > best.count) {
      best = { count, sumX, sumY, minX, minY, maxX, maxY };
    }
  }

  if (!best) return null;

  return {
    point: { x: Math.round(best.sumX / best.count), y: Math.round(best.sumY / best.count) },
    bbox: { minX: best.minX, minY: best.minY, maxX: best.maxX, maxY: best.maxY },
    pixelCount: best.count,
    componentCount,
  };
}

/**
 * Dentro de un bbox ya localizado (p. ej. el de `locateLargestChange`), busca
 * el píxel de MAYOR contraste entre las dos capturas — no el centroide.
 *
 * Por qué hace falta: el hit area real de un RoomItem es `pixelPerfect`
 * (`alphaTolerance: 1` en `RoomItemsManager.ts`) — sólo píxeles opacos del
 * PNG reciben el click; el resto lo deja pasar al suelo de abajo. El
 * centroide de la silueta puede caer sobre un borde suavizado
 * (antialiasing) casi transparente, sobre todo en assets sintéticos de QA
 * con mucho margen transparente. El píxel de mayor contraste absoluto —el
 * que más cambió al aparecer el objeto— es, por construcción, un píxel
 * sólido del cuerpo del sprite, no de su borde.
 */
export function pickStrongestPixel(
  beforePng: Buffer,
  afterPng: Buffer,
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
): PixelPoint {
  const before = PNG.sync.read(beforePng);
  const after = PNG.sync.read(afterPng);
  const { width } = before;

  let bestX = Math.round((bbox.minX + bbox.maxX) / 2);
  let bestY = Math.round((bbox.minY + bbox.maxY) / 2);
  let bestDelta = -1;

  for (let y = bbox.minY; y <= bbox.maxY; y += 1) {
    for (let x = bbox.minX; x <= bbox.maxX; x += 1) {
      const i = (width * y + x) * 4;
      const dr = Math.abs(before.data[i] - after.data[i]);
      const dg = Math.abs(before.data[i + 1] - after.data[i + 1]);
      const db = Math.abs(before.data[i + 2] - after.data[i + 2]);
      const delta = dr + dg + db;
      if (delta > bestDelta) {
        bestDelta = delta;
        bestX = x;
        bestY = y;
      }
    }
  }

  return { x: bestX, y: bestY };
}
