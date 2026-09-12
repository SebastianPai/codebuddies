import NavGrid, { type NavTile } from "./NavGrid";
import type IsoGrid from "./IsoGrid";

/**
 * Pruebas de navegación y colisión.
 *
 * Se ejecutan con el Jest que ya existe en apps/api (sin dependencias
 * nuevas), apuntándolo a este archivo:
 *
 *   cd apps/api && npx jest --rootDir ../.. \
 *     --testMatch "**\/apps/game/src/game/iso/**\/*.spec.ts"
 *
 * NavGrid sólo necesita de IsoGrid cuatro cosas (width, height, contains,
 * isFloorTile), así que se le pasa un doble mínimo y las pruebas quedan
 * libres de Phaser.
 */

const W = 20;
const H = 20;

/** Sala igual a `pequeño-v1`: suelo macizo en x,y ∈ [6,18]. */
function makeIso(isFloor: (x: number, y: number) => boolean = defaultFloor) {
  return {
    width: W,
    height: H,
    contains: (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H,
    isFloorTile: (x: number, y: number) =>
      x >= 0 && y >= 0 && x < W && y < H && isFloor(x, y),
  } as unknown as IsoGrid;
}

const defaultFloor = (x: number, y: number) =>
  x >= 6 && x <= 18 && y >= 6 && y <= 18;

/** Casillas ocupadas por un mueble de `w`x`h` con esquina en (ox, oy). */
function footprint(ox: number, oy: number, w: number, h: number): Set<string> {
  const tiles = new Set<string>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) tiles.add(`${ox + x},${oy + y}`);
  }
  return tiles;
}

/** Resuelve findPath (el callback de EasyStar es siempre asíncrono). */
function findPath(nav: NavGrid, from: NavTile, to: NavTile) {
  return new Promise<NavTile[] | null>((resolve) => {
    nav.findPath(from, to, resolve);
    // EasyStar entrega vía setTimeout; hay que bombear calculate().
    const pump = setInterval(() => nav.update(), 0);
    setTimeout(() => clearInterval(pump), 500);
  });
}

const key = (t: NavTile) => `${t.x},${t.y}`;

describe("NavGrid · obstáculos y footprints", () => {
  it.each([
    ["1x1", 1, 1],
    ["2x1", 2, 1],
    ["3x1", 3, 1],
    ["1x3", 1, 3],
    ["2x2", 2, 2],
  ])(
    "un mueble %s bloquea TODAS las casillas de su footprint",
    (_label, w, h) => {
      const nav = new NavGrid(makeIso());
      const tiles = footprint(11, 11, w, h);

      nav.setBlockedTiles(tiles);

      for (const k of tiles) {
        const [x, y] = k.split(",").map(Number);
        expect(nav.isWalkable(x, y)).toBe(false);
      }
      // Y sólo ésas: el resto del suelo sigue libre.
      expect(nav.walkableCount()).toBe(169 - tiles.size);
    },
  );

  it("liberar el mueble devuelve las casillas al suelo (diff incremental)", () => {
    const nav = new NavGrid(makeIso());
    const tiles = footprint(11, 11, 2, 2);

    const blocked = nav.setBlockedTiles(tiles);
    expect(blocked).toHaveLength(4);
    expect(nav.walkableCount()).toBe(165);

    const freed = nav.setBlockedTiles(new Set());
    expect(freed).toHaveLength(4);
    expect(nav.walkableCount()).toBe(169);
  });

  it("no reporta cambios si la ocupación no cambió", () => {
    const nav = new NavGrid(makeIso());
    const tiles = footprint(11, 11, 3, 1);

    expect(nav.setBlockedTiles(tiles)).toHaveLength(3);
    expect(nav.setBlockedTiles(new Set(tiles))).toHaveLength(0);
  });

  it("una casilla que no es suelo sigue bloqueada aunque se libere el mueble", () => {
    const nav = new NavGrid(makeIso());
    nav.setBlockedTiles(new Set(["6,6"]));
    nav.setBlockedTiles(new Set());
    expect(nav.isWalkable(6, 6)).toBe(true);
    // fuera del suelo, nunca transitable
    expect(nav.isWalkable(3, 3)).toBe(false);
    expect(nav.isWalkable(-1, 7)).toBe(false);
  });
});

describe("NavGrid · rutas", () => {
  it("ninguna ruta atraviesa el footprint de un mueble 2x2", async () => {
    const nav = new NavGrid(makeIso());
    const tiles = footprint(11, 11, 2, 2);
    nav.setBlockedTiles(tiles);

    const path = await findPath(nav, { x: 9, y: 9 }, { x: 15, y: 15 });

    expect(path).not.toBeNull();
    for (const step of path!) expect(tiles.has(key(step))).toBe(false);
  });

  it("TODO tramo de una ruta es un salto a una casilla vecina", async () => {
    const nav = new NavGrid(makeIso());
    nav.setBlockedTiles(footprint(11, 11, 3, 1));

    const path = await findPath(nav, { x: 7, y: 7 }, { x: 17, y: 17 });
    expect(path!.length).toBeGreaterThan(1);

    for (let i = 1; i < path!.length; i++) {
      expect(NavGrid.isAdjacentOrSame(path![i - 1], path![i])).toBe(true);
    }
  });

  it("bordear una esquina no roza el mueble (corner cutting desactivado)", async () => {
    const nav = new NavGrid(makeIso());
    const tiles = footprint(12, 12, 2, 2);
    nav.setBlockedTiles(tiles);

    const path = await findPath(nav, { x: 11, y: 12 }, { x: 12, y: 11 });
    expect(path).not.toBeNull();

    // El paso directo en diagonal rozaría la esquina de (12,12): la ruta
    // tiene que rodear, así que no puede ser de un solo tramo.
    expect(path!.length).toBeGreaterThan(2);
    for (const step of path!) expect(tiles.has(key(step))).toBe(false);
  });

  it("destino sin ruta devuelve null (no una ruta parcial)", async () => {
    // Mueble que sella por completo la esquina (18,18).
    const nav = new NavGrid(makeIso());
    nav.setBlockedTiles(new Set(["17,18", "18,17", "17,17"]));

    const path = await findPath(nav, { x: 8, y: 8 }, { x: 18, y: 18 });
    expect(path).toBeNull();
  });

  it("destino sobre el propio mueble devuelve null", async () => {
    const nav = new NavGrid(makeIso());
    nav.setBlockedTiles(footprint(11, 11, 2, 2));

    const path = await findPath(nav, { x: 8, y: 8 }, { x: 11, y: 11 });
    expect(path).toBeNull();
  });

  it("origen == destino devuelve una ruta vacía, no null", async () => {
    const nav = new NavGrid(makeIso());
    const path = await findPath(nav, { x: 8, y: 8 }, { x: 8, y: 8 });
    expect(path).toEqual([]);
  });

  it("un mueble colocado sobre la ruta la invalida y permite recalcular", async () => {
    const nav = new NavGrid(makeIso());

    const original = await findPath(nav, { x: 8, y: 12 }, { x: 16, y: 12 });
    expect(original).not.toBeNull();

    // Se coloca un muro justo encima de la ruta.
    const wall = new Set(["12,10", "12,11", "12,12", "12,13", "12,14"]);
    const changed = nav.setBlockedTiles(wall);

    const onRoute = original!.some((s) => wall.has(key(s)));
    expect(onRoute).toBe(true);
    expect(changed.length).toBeGreaterThan(0);

    // La ruta nueva sigue existiendo y evita el muro.
    const replan = await findPath(nav, { x: 8, y: 12 }, { x: 16, y: 12 });
    expect(replan).not.toBeNull();
    for (const step of replan!) expect(wall.has(key(step))).toBe(false);
  });
});

describe("NavGrid · desatasco", () => {
  it("nearestWalkable devuelve la misma casilla si ya es transitable", () => {
    const nav = new NavGrid(makeIso());
    expect(nav.nearestWalkable(10, 10)).toEqual({ x: 10, y: 10 });
  });

  it("encuentra salida desde el centro de un mueble 3x3", () => {
    const nav = new NavGrid(makeIso());
    nav.setBlockedTiles(footprint(10, 10, 3, 3));

    const escape = nav.nearestWalkable(11, 11);
    expect(escape).not.toBeNull();
    expect(nav.isWalkable(escape!.x, escape!.y)).toBe(true);
  });

  it("desde el INTERIOR de un mueble grande, findPath no sirve: todas las vecinas están bloqueadas", async () => {
    const nav = new NavGrid(makeIso());
    nav.setBlockedTiles(footprint(9, 9, 5, 5));

    const stuck = { x: 11, y: 11 };
    const escape = nav.nearestWalkable(stuck.x, stuck.y)!;
    expect(escape).not.toBeNull();
    // La salida está a más de una casilla: meterla directa en currentPath
    // habría sido un tramo recto atravesando el mueble.
    expect(
      Math.max(Math.abs(escape.x - stuck.x), Math.abs(escape.y - stuck.y)),
    ).toBeGreaterThan(1);

    // A* no encuentra ni un primer paso -> el jugador quedaría encerrado.
    expect(await findPath(nav, stuck, escape)).toBeNull();
  });

  it("escapeRoute SÍ saca al jugador, y lo hace casilla a casilla", () => {
    const nav = new NavGrid(makeIso());
    nav.setBlockedTiles(footprint(9, 9, 5, 5));

    const stuck = { x: 11, y: 11 };
    const route = nav.escapeRoute(stuck);

    expect(route).not.toBeNull();
    expect(route!.length).toBeGreaterThan(1);

    // Cada tramo es un salto a una vecina: nunca se atraviesa nada de largo.
    let prev = stuck;
    for (const step of route!) {
      expect(NavGrid.isAdjacentOrSame(prev, step)).toBe(true);
      prev = step;
    }

    // Termina en suelo libre, y sólo el último paso lo es.
    const last = route![route!.length - 1];
    expect(nav.isWalkable(last.x, last.y)).toBe(true);
    for (const step of route!.slice(0, -1)) {
      expect(nav.isWalkable(step.x, step.y)).toBe(false);
    }
  });

  it("escapeRoute no atraviesa el terreno: no se sale por una pared", () => {
    const nav = new NavGrid(makeIso());
    // Esquina del suelo bloqueada por un mueble; fuera sólo hay vacío.
    nav.setBlockedTiles(new Set(["6,6"]));

    const route = nav.escapeRoute({ x: 6, y: 6 });
    expect(route).not.toBeNull();
    for (const step of route!) {
      expect(nav.isTerrainWalkable(step.x, step.y)).toBe(true);
    }
  });

  it("escapeRoute devuelve [] si la casilla ya es transitable", () => {
    const nav = new NavGrid(makeIso());
    expect(nav.escapeRoute({ x: 10, y: 10 })).toEqual([]);
  });

  it("escapeRoute devuelve null si no hay salida posible", () => {
    const nav = new NavGrid(makeIso());
    // Toda la sala ocupada: no queda ni una casilla libre.
    const everything = new Set<string>();
    for (let y = 6; y <= 18; y++) {
      for (let x = 6; x <= 18; x++) everything.add(`${x},${y}`);
    }
    nav.setBlockedTiles(everything);

    expect(nav.escapeRoute({ x: 10, y: 10 })).toBeNull();
  });

  it("devuelve null si no hay ninguna casilla transitable cerca", () => {
    const nav = new NavGrid(makeIso(() => false));
    expect(nav.nearestWalkable(10, 10)).toBeNull();
  });
});

describe("NavGrid.isAdjacentOrSame · invariante de un solo tile", () => {
  it("acepta la misma casilla y las 8 vecinas", () => {
    const c = { x: 10, y: 10 };
    expect(NavGrid.isAdjacentOrSame(c, c)).toBe(true);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        expect(NavGrid.isAdjacentOrSame(c, { x: 10 + dx, y: 10 + dy })).toBe(true);
      }
    }
  });

  it("rechaza cualquier salto de 2 o más casillas", () => {
    const c = { x: 10, y: 10 };
    for (const t of [
      { x: 12, y: 10 },
      { x: 10, y: 12 },
      { x: 12, y: 12 },
      { x: 8, y: 10 },
      { x: 16, y: 16 },
      { x: 10, y: 7 },
    ]) {
      expect(NavGrid.isAdjacentOrSame(c, t)).toBe(false);
    }
  });
});

describe("carga de muebles · un asset caído no tumba al resto", () => {
  // Reproduce el patrón exacto de LobbyScene.createWorld: .catch() POR ITEM
  // dentro del Promise.all. Sin él, un solo rechazo hacía que el .then()
  // final —donde vivía la ÚNICA sincronización de colisión de la sala— no
  // corriera jamás, dejando la sala sin obstáculos.
  const loadItem = (id: number) =>
    id === 3
      ? Promise.reject(new Error("404 textura"))
      : Promise.resolve(id);

  it("SIN catch por item, el then() global nunca corre (comportamiento roto)", async () => {
    const registered: number[] = [];
    let synced = false;

    await Promise.all(
      [1, 2, 3, 4, 5].map((id) => loadItem(id).then((v) => registered.push(v))),
    )
      .then(() => {
        synced = true;
      })
      .catch(() => {});

    // Los otros items SÍ se resuelven; lo que se pierde es el .then()
    // final, que es justamente donde vivía la sincronización de colisión.
    expect(synced).toBe(false);
  });

  it("CON catch por item, todos los demás se registran y la sincronización ocurre", async () => {
    const registered: number[] = [];
    let synced = false;

    await Promise.all(
      [1, 2, 3, 4, 5].map((id) =>
        loadItem(id)
          .then((v) => registered.push(v))
          .catch(() => undefined),
      ),
    ).then(() => {
      synced = true;
    });

    expect(synced).toBe(true);
    expect(registered.sort()).toEqual([1, 2, 4, 5]);
  });

  it("los muebles que sí cargaron siguen bloqueando aunque uno falle", () => {
    const nav = new NavGrid(makeIso());
    // 4 de 5 muebles registrados; el que falló simplemente no aporta tiles.
    const occupancy = new Set([
      ...footprint(8, 8, 1, 1),
      ...footprint(10, 10, 2, 2),
      ...footprint(14, 8, 3, 1),
      ...footprint(16, 14, 1, 3),
    ]);

    nav.setBlockedTiles(occupancy);

    expect(nav.walkableCount()).toBe(169 - occupancy.size);
    expect(nav.isWalkable(8, 8)).toBe(false);
    expect(nav.isWalkable(10, 10)).toBe(false);
    expect(nav.isWalkable(15, 8)).toBe(false);
    expect(nav.isWalkable(16, 16)).toBe(false);
  });
});
