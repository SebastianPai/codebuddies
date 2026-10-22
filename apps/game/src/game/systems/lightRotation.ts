// La luz de un objeto se configura en el admin para su cara frontal
// (rotación 0). Cuando el objeto se gira en la sala, la luz tiene que girar
// con él: el cono apunta hacia otro lado y el punto de origen se mueve.
//
// En isométrico eso NO es sumar 90° en pantalla: un giro del objeto es un
// giro de 90° EN EL PISO. Se pasa el vector de pantalla a coordenadas del
// piso, se gira con la MISMA regla que la huella del mueble
// (iso/footprintRotation.ts: (x, y) → (-y, x) por cada paso) y se vuelve a
// pantalla. Proyección del juego (IsoGrid): sx = (gx - gy)·TW/2,
// sy = (gx + gy)·TH/2 con casillas de 64×32.
//
// Sin Phaser: se prueba en Node.

const HALF_W = 32;
const HALF_H = 16;

/** Gira un vector de PANTALLA `steps` cuartos de vuelta sobre el piso. */
export function rotateScreenVector(sx: number, sy: number, steps: number): { x: number; y: number } {
  const turns = ((Math.trunc(steps) % 4) + 4) % 4;
  // pantalla → piso
  let gx = (sx / HALF_W + sy / HALF_H) / 2;
  let gy = (sy / HALF_H - sx / HALF_W) / 2;
  for (let i = 0; i < turns; i++) {
    const nx = -gy;
    gy = gx;
    gx = nx;
  }
  // piso → pantalla
  return { x: (gx - gy) * HALF_W, y: (gx + gy) * HALF_H };
}

/** Dirección del cono (grados en pantalla) para el objeto girado. */
export function rotateConeDirection(direction: number, steps: number): number {
  const rad = (direction * Math.PI) / 180;
  const v = rotateScreenVector(Math.cos(rad), Math.sin(rad), steps);
  const deg = (Math.atan2(v.y, v.x) * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

/**
 * Punto de origen de la luz para el objeto girado. `originY` es sobre todo
 * ALTURA (qué tan arriba del piso está la bombilla) y no gira; lo que gira
 * es el corrimiento horizontal, que se trata como un vector sobre el piso.
 */
export function rotateLightOrigin(
  originX: number,
  originY: number,
  steps: number,
): { x: number; y: number } {
  const v = rotateScreenVector(originX, 0, steps);
  return { x: v.x, y: originY + v.y };
}
