import fs from "fs";
import path from "path";
import { PNG } from "pngjs";
import { request as pwRequest } from "@playwright/test";
import { test, expect, API_URL, GAME_URL } from "./fixtures";
import {
  animationCard,
  behaviorSection,
  fillBasicItem,
  openWorldItemEditor,
  qaName,
  saveItem,
  uploadFrames,
} from "./helpers";
import { grantItem, revokeItem, disconnectGrantClient } from "./grant";
import {
  connectGameSocket,
  createRoom,
  joinRoom,
  placeItem,
  waitForConnect,
  type GameSocket,
} from "./sockets";
import { registerForCleanup } from "./cleanup";
import { isMostlyUniform, locateLargestChange } from "./pixel-locate";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const worldObjects = require(
  require.resolve("@codebuddies/world-objects", {
    paths: [path.join(__dirname, "..", "apps", "api")],
  }),
) as typeof import("@codebuddies/world-objects");

/**
 * Fase 11.5-B — resuelve el ÚNICO pendiente que bloqueaba el tramo físico de
 * la Fase 11.5: ubicar un punto de pantalla clickeable de un RoomItem real
 * SIN instrumentar el motor isométrico y SIN sustituir el click por socket.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ DOS ENTRADAS A LA SALA, NO REMOVE/RE-PLACE EN VIVO
 *
 * El servidor sólo permite UNA conexión de socket por usuario a la vez
 * (`PlayerHandler#handleConnection`: `if (oldSocket?.connected)
 * oldSocket.disconnect(true)`) — es la protección real contra sesiones
 * duplicadas, no algo que este test deba evadir. Eso descarta usar un socket
 * de "utilería" en paralelo mientras la página del navegador ya tiene la
 * sala abierta: en cuanto ese socket de utilería se conecta, tira abajo la
 * conexión de la propia página.
 *
 * La solución que respeta esa regla: colocar el objeto ANTES de que la
 * página tenga abierta la sala (con el socket de utilería ya desconectado),
 * y usar DOS entradas reales a la MISMA sala —una sin el objeto, otra con
 * él— para comparar. Cada entrada arranca desde el mismo estado de cámara
 * por defecto (spawn + zoom inicial), así que las dos capturas son
 * comparables píxel a píxel sin haber tocado el motor ni una sola vez.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * EL MÉTODO
 *
 *   1. Colocar el TV real (behavior real, atlas real en R2) en un tile fijo,
 *      por socket, ANTES de que la página entre a la sala.
 *   2. Entrar a la sala vacía por la UI real → capturar el `<canvas>`.
 *   3. Colocar el objeto (socket, página ya no conectada) y volver a entrar
 *      a la MISMA sala por la UI real → capturar el `<canvas>` otra vez.
 *   4. La diferencia de píxeles entre ambas capturas ES la silueta visible
 *      del TV en coordenadas de pantalla reales — el mismo dato que vería
 *      una persona mirando el monitor.
 *   5. `page.mouse.click()` de Playwright, de verdad, sobre esa coordenada.
 *   6. Verificar por DOS vías independientes que el click surtió efecto:
 *      (a) visual — una nueva comparación de píxeles del canvas ANTES/DESPUÉS
 *          del click muestra una silueta cambiada en la MISMA zona;
 *      (b) protocolo — una nueva conexión (después de que la página ya no
 *          la necesita) hace `joinRoom` y lee el `state` persistido del
 *          RoomItem, resuelto con `effectiveStateKey()` del propio paquete
 *          `@codebuddies/world-objects` — el mismo cálculo que usa el
 *          cliente real, no una interpretación propia del test.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ESTADO ACTUAL — BLOQUEADO, NO INVENTADO
 *
 * El mecanismo de arriba (dos entradas reales + diff de píxeles restringido
 * al viewport del juego) quedó construido y VERIFICADO: detecta
 * correctamente cuándo la sala no terminó de renderizar (antes daba falsos
 * positivos con la UI que envuelve el canvas — ya corregido en
 * `pixel-locate.ts`) y no reporta diferencias cuando no las hay.
 *
 * Lo que NO se pudo cerrar todavía es la coordenada de tile que cae dentro
 * del encuadre por defecto de la cámara. Se comprobó, con capturas reales:
 *   - El payload real de `room:joined` SÍ trae el RoomItem con su posición,
 *     `imageUrl` válido y el contrato `behavior` completo (states,
 *     animations con `spriteSheetUrl` reales, transitions) — no es un
 *     problema de datos ni de carga de textura.
 *   - Tile (2,2) y tile (10,10) (centro geométrico del mapa 20x20 real de
 *     "CASA MEDIANA") no produjeron NINGUNA diferencia visible en dos
 *     corridas independientes cada uno.
 *
 * La búsqueda de más coordenadas (una rejilla de varios puntos a la vez,
 * ver el diagnóstico descartable que generó esta nota) quedó bloqueada por
 * el propio entorno: la base de datos bajo la carga sostenida de esta
 * sesión larga tarda >5s en adquirir el lock de `placeItem`
 * (`pg_advisory_xact_lock` + insert), superando el timeout de transacción
 * interactiva de Prisma (5000ms) de forma consistente, y el proceso de
 * `nest start --watch` entró varias veces en un bucle de reinicio
 * (recompilaciones cada 1-7s sin que nadie tocara `apps/api`). Ninguna de
 * las dos cosas es un bug de este código; son síntomas de recursos
 * agotados en la máquina de desarrollo tras una sesión de horas con web +
 * game + api + Postgres + Chromium corriendo a la vez.
 *
 * Próximo paso recomendado (NO ejecutado todavía): en vez de seguir
 * adivinando tiles, usar el propio Modo Construcción (click real sobre un
 * tile de piso VISIBLE para colocar el objeto) — eso delega la conversión
 * pantalla→tile al motor mismo y evita adivinar la fórmula desde afuera.
 * Requiere automatizar por primera vez la UI de Build Mode en Playwright,
 * que hoy no tiene cobertura.
 */

async function fetchLayoutId(token: string): Promise<string> {
  const api = await pwRequest.newContext();
  try {
    const response = await api.get(`${API_URL}/layouts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok()) {
      throw new Error(`GET /layouts -> HTTP ${response.status()}: ${await response.text()}`);
    }
    const layouts = (await response.json()) as Array<{ id: string }>;
    expect(layouts[0]?.id, "hace falta al menos un layout real en la base para esta prueba").toBeTruthy();
    return layouts[0].id;
  } finally {
    await api.dispose();
  }
}

async function fetchBehavior(
  token: string,
  itemId: string,
): Promise<import("@codebuddies/world-objects").WorldBehavior> {
  const api = await pwRequest.newContext();
  try {
    const response = await api.get(`${API_URL}/items/${itemId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const item = (await response.json()) as { worldData?: { behavior?: unknown } };
    return item.worldData!.behavior as import("@codebuddies/world-objects").WorldBehavior;
  } finally {
    await api.dispose();
  }
}

test.describe.serial("Localizar y clickear físicamente un RoomItem (Fase 11.5-B)", () => {
  const state: {
    itemId: string;
    roomId: string;
    roomName: string;
    roomItemId: string;
    userId: string;
    token: string;
  } = { itemId: "", roomId: "", roomName: "", roomItemId: "", userId: "", token: "" };

  test.afterAll(async () => {
    if (state.userId && state.itemId) await revokeItem(state.userId, state.itemId);
    await disconnectGrantClient();
  });

  // Ver "ESTADO ACTUAL — BLOQUEADO, NO INVENTADO" en el docstring de arriba:
  // el mecanismo de localización por diferencia de píxeles está construido y
  // verificado, pero ninguna coordenada de tile probada hasta ahora cayó
  // dentro del encuadre visible de la cámara, y agotar más coordenadas quedó
  // bloqueado por el propio entorno (Postgres/API bajo carga). `fixme` deja
  // esto visible como pendiente real en la suite en vez de borrarlo o
  // dejarlo en rojo sin explicación.
  test.fixme(
    true,
    "Pendiente: encontrar una coordenada de tile visible en cámara para 'CASA MEDIANA' " +
      "(probadas (2,2) y (10,10), ninguna visible) — bloqueado por inestabilidad de la BD/API bajo la carga actual del entorno.",
  );

  test("localizar por diferencia de píxeles y hacer click físico real con el mouse", async ({
    adminPage,
    session,
  }) => {
    test.setTimeout(180_000);
    state.userId = session.user.userId as string;
    state.token = session.token;

    // ── 1. TV real: behavior real + atlas real en R2 ──────────────────────
    await openWorldItemEditor(adminPage);
    await fillBasicItem(adminPage, qaName("Locate"));
    const behavior = behaviorSection(adminPage);
    await behavior.getByRole("button", { name: "Objeto con comportamiento" }).click();
    await behavior.getByRole("button", { name: /Televisor/ }).click();
    for (const [key, count] of [
      ["off", 1],
      ["turn_on", 2],
      ["screen_loop", 2],
      ["turn_off", 2],
    ] as Array<[string, number]>) {
      await animationCard(adminPage, key).getByLabel("Gira con el objeto").uncheck();
      await uploadFrames(adminPage, key, count, 1);
    }
    const saved = await saveItem(adminPage);
    expect(saved.dialogs).toEqual([]);
    state.itemId = saved.id;
    registerForCleanup(state.itemId);
    await grantItem(state.userId, state.itemId);

    const layoutId = await fetchLayoutId(session.token);

    // ── 2. Sala real, TODAVÍA SIN el objeto ────────────────────────────────
    let setupSocket: GameSocket = connectGameSocket(session.token);
    await waitForConnect(setupSocket);
    state.roomName = `QA-F115B locate ${Date.now().toString(36)}`;
    const room = await createRoom(setupSocket, state.roomName, layoutId);
    state.roomId = room.id;
    setupSocket.disconnect();

    // El mapa real de este layout es de 20x20 tiles (confirmado leyendo
    // `layoutJson.width/height` — los metadatos `__codebuddies.safeArea` de
    // la propia sala describen coordenadas de hasta 75, inconsistentes con
    // un mapa de 20x20, así que no son una guía útil acá). (2,2), probado
    // antes, cayó fuera de cámara en las dos capturas (sin diferencia
    // alguna en la región del viewport). El centro geométrico del mapa es
    // la apuesta más razonable para caer dentro del encuadre por defecto
    // sin importar dónde esté exactamente el origen de la rejilla.
    const TILE_X = 10;
    const TILE_Y = 10;

    const enterRoomOnce = async () => {
      await adminPage.goto(GAME_URL, { waitUntil: "domcontentloaded" });
      await expect(adminPage.getByRole("button", { name: "Mis Salas" })).toBeVisible({
        timeout: 30_000,
      });
      await adminPage.getByRole("button", { name: "Mis Salas" }).click();
      await adminPage.getByPlaceholder(/[Bb]uscar/).fill(state.roomName);
      await expect(adminPage.getByText(state.roomName, { exact: true })).toHaveCount(1, {
        timeout: 15_000,
      });
      await adminPage.getByRole("button", { name: "ENTRAR" }).click();
      const canvasLocator = adminPage.locator("canvas").first();
      await expect(canvasLocator).toBeVisible({ timeout: 30_000 });
      await adminPage
        .getByText("Compiling", { exact: false })
        .waitFor({ state: "hidden", timeout: 60_000 })
        .catch(() => {});
      await adminPage.waitForTimeout(2000);

      // Se espera a que el canvas tenga de verdad contenido dibujado, no un
      // tiempo fijo: la escena de Phaser puede tardar variablemente en
      // montar (assets, socket, `room:joined`) y una captura tomada
      // demasiado pronto es indistinguible de una sala rota (negra) — el
      // mismo criterio que usaría una persona mirando la pantalla y
      // esperando a que "aparezca algo".
      const deadline = Date.now() + 15_000;
      let renderedPng = await canvasLocator.screenshot();
      while (isMostlyUniform(renderedPng)) {
        if (Date.now() > deadline) return null;
        await adminPage.waitForTimeout(1000);
        renderedPng = await canvasLocator.screenshot();
      }
      // Una espera corta más para dejar asentar cualquier tween de entrada
      // (fade-in) antes de tomar la captura que se usará para comparar.
      await adminPage.waitForTimeout(1000);
      renderedPng = await canvasLocator.screenshot();
      if (isMostlyUniform(renderedPng)) return null;
      return { canvasLocator, png: renderedPng };
    };

    // El cliente real puede tardar en asentar la escena o, alguna vez, no
    // llegar a pintarla en el primer intento (timing de carga de assets +
    // socket) — igual que haría una persona frente al monitor, se reintenta
    // ENTRANDO DE NUEVO (navegación real completa, no un truco de test) antes
    // de dar la sala por rota.
    const enterRoom = async () => {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const result = await enterRoomOnce();
        if (result) return result;
        // eslint-disable-next-line no-console
        console.log(`enterRoom: intento ${attempt} rindió un canvas sin contenido real, reintentando`);
      }
      throw new Error("El canvas siguió sin contenido real tras 3 intentos completos de entrar a la sala");
    };

    // ── 3. Entrada #1: sala vacía → captura "sin objeto" ───────────────────
    const entry1 = await enterRoom();
    const withoutItemPng = entry1.png;
    fs.mkdirSync("test-results", { recursive: true });
    fs.writeFileSync("test-results/locate-1-without-item.png", withoutItemPng);

    // ── 4. Colocar el objeto (la página YA NO tiene el socket conectado
    //       tras el `goto` de la próxima entrada; se coloca ANTES de
    //       reentrar para no competir con la conexión de la página) ───────
    setupSocket = connectGameSocket(session.token);
    await waitForConnect(setupSocket);
    await joinRoom(setupSocket, state.roomId);
    const placed = await placeItem(setupSocket, state.roomId, state.itemId, TILE_X, TILE_Y);
    state.roomItemId = placed.id;
    setupSocket.disconnect();

    // ── 5. Entrada #2: misma sala, ahora CON el objeto → captura "con objeto"
    const entry2 = await enterRoom();
    const canvas2 = entry2.canvasLocator;
    const withItemPng = entry2.png;
    fs.writeFileSync("test-results/locate-2-with-item.png", withItemPng);

    // ── 6. Componente conexo más grande que cambió = silueta del TV ───────
    const located = locateLargestChange(withoutItemPng, withItemPng);
    expect(
      located,
      "no se detectó ninguna diferencia de píxeles entre las dos capturas — el objeto no se está renderizando en el canvas real",
    ).not.toBeNull();
    // eslint-disable-next-line no-console
    console.log("LOCATE_RESULT", JSON.stringify(located));
    expect(located!.pixelCount).toBeGreaterThan(20);

    // ── 7. Conversión de píxeles del canvas → coordenadas de página ───────
    const box = await canvas2.boundingBox();
    expect(box, "el canvas no tiene bounding box (¿no está visible?)").not.toBeNull();
    const decoded = PNG.sync.read(withItemPng);
    const scaleX = box!.width / decoded.width;
    const scaleY = box!.height / decoded.height;
    const clickX = box!.x + located!.point.x * scaleX;
    const clickY = box!.y + located!.point.y * scaleY;

    // ── 8. CLICK FÍSICO REAL: Playwright mouse → canvas → Phaser hit test
    //        → RoomItemsManager → Socket.IO → servidor → broadcast. Ningún
    //        atajo de test participa en este paso. ────────────────────────
    await adminPage.mouse.click(clickX, clickY);
    await adminPage.waitForTimeout(700);

    // ── 9. Confirmación VISUAL: el frame cambió de verdad en el canvas real,
    //        en la MISMA zona que se clickeó. ─────────────────────────────
    const afterClickPng = await canvas2.screenshot();
    fs.writeFileSync("test-results/locate-3-after-click.png", afterClickPng);
    const visualChange = locateLargestChange(withItemPng, afterClickPng);
    expect(
      visualChange,
      "el click no produjo ningún cambio visual en el canvas — no interactuó con el objeto",
    ).not.toBeNull();
    // eslint-disable-next-line no-console
    console.log("VISUAL_CHANGE_AFTER_CLICK", JSON.stringify(visualChange));

    // ── 10. Confirmación de PROTOCOLO: se lee el estado persistido real con
    //         una conexión nueva (la página ya cumplió su función) y se
    //         resuelve con el mismo paquete que usa el cliente — no una
    //         interpretación propia del test. ────────────────────────────
    const verifySocket = connectGameSocket(session.token);
    await waitForConnect(verifySocket);
    const joined = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout esperando room:joined")), 10_000);
      verifySocket.once("room:joined", (payload: any) => {
        clearTimeout(timeout);
        resolve(payload);
      });
      verifySocket.emit("joinRoom", { roomId: state.roomId });
    });
    verifySocket.disconnect();

    const items: any[] = joined.items ?? joined.room?.items ?? [];
    const item = items.find((entry) => entry.id === state.roomItemId);
    expect(item, "el room:joined debe traer el RoomItem clickeado con su estado persistido").toBeTruthy();

    const behaviorContract = await fetchBehavior(session.token, state.itemId);
    const persisted = worldObjects.readPersistedState(item.state);
    const effective = worldObjects.effectiveStateKey(behaviorContract, persisted, Date.now());
    expect(effective).toBe("ON");

    // eslint-disable-next-line no-console
    console.log(
      "CLICK_POINT",
      JSON.stringify({
        roomId: state.roomId,
        roomName: state.roomName,
        itemId: state.itemId,
        roomItemId: state.roomItemId,
        tileX: TILE_X,
        tileY: TILE_Y,
        canvasPixel: located!.point,
        pagePixel: { x: clickX, y: clickY },
      }),
    );
  });
});
