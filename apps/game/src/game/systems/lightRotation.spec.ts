import { rotateConeDirection, rotateLightOrigin, rotateScreenVector } from "./lightRotation";

const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(0.01);

describe("lightRotation (la luz gira con el objeto)", () => {
  it("rotación 0 no cambia nada", () => {
    close(rotateConeDirection(90, 0), 90);
    const o = rotateLightOrigin(12, -40, 0);
    close(o.x, 12);
    close(o.y, -40);
  });

  it("4 giros vuelven al inicio", () => {
    close(rotateConeDirection(37, 4), 37);
    const v = rotateScreenVector(10, 5, 4);
    close(v.x, 10);
    close(v.y, 5);
  });

  it("un giro mueve un eje del piso al siguiente, igual que la huella", () => {
    // Eje +X del piso en pantalla = (32, 16): abajo-derecha. Tras un giro,
    // (x, y) → (-y, x) lo lleva al eje +Y del piso = (-32, 16): abajo-izquierda.
    const v = rotateScreenVector(32, 16, 1);
    close(v.x, -32);
    close(v.y, 16);
  });

  it("dos giros invierten la dirección del cono", () => {
    close(rotateConeDirection(0, 2), 180);
    close(rotateConeDirection(90, 2), 270);
  });

  it("la altura de la bombilla no cambia al girar", () => {
    const o = rotateLightOrigin(0, -60, 1);
    close(o.x, 0);
    close(o.y, -60);
  });
});
