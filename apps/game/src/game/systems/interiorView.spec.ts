import { ghostedItemIds } from "./interiorView";

// Sala 10x10: la diagonal central es x + y = 9.
const ROOM = 10;

function column(prefix: string, tileX: number, tileY: number, levels: number) {
  return Array.from({ length: levels }, (_, i) => ({
    id: `${prefix}-${i}`,
    tileX,
    tileY,
    isSurface: false,
  }));
}

describe("ghostedItemIds (modo ver interior)", () => {
  it("una pared de 3+ cubos ADELANTE se vuelve fantasma entera, desde el piso", () => {
    const ghosted = ghostedItemIds(column("pared", 7, 7, 3), ROOM, ROOM);
    expect([...ghosted].sort()).toEqual(["pared-0", "pared-1", "pared-2"]);
  });

  it("lo de atrás no se toca aunque sea una pared alta", () => {
    expect(ghostedItemIds(column("fondo", 1, 2, 6), ROOM, ROOM).size).toBe(0);
  });

  it("1-2 niveles adelante (mesa con lámpara) no cuenta como pared", () => {
    expect(ghostedItemIds(column("mesa", 8, 8, 2), ROOM, ROOM).size).toBe(0);
  });

  it("las superficies pintadas no cuentan ni se ocultan", () => {
    const items = [
      ...column("cubo", 8, 6, 2),
      { id: "suelo", tileX: 8, tileY: 6, isSurface: true },
    ];
    expect(ghostedItemIds(items, ROOM, ROOM).size).toBe(0);
  });

  it("solo afecta la columna que es pared, no las vecinas bajas", () => {
    const items = [...column("pared", 6, 6, 4), ...column("silla", 6, 7, 1)];
    const ghosted = ghostedItemIds(items, ROOM, ROOM);
    expect(ghosted.has("pared-3")).toBe(true);
    expect(ghosted.has("silla-0")).toBe(false);
  });
});
