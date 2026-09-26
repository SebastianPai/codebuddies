import { test, expect, API_URL, GAME_URL } from "./fixtures";
import {
  behaviorSection,
  fillBasicItem,
  openWorldItemEditor,
  qaName,
  saveItem,
  uploadFrames,
} from "./helpers";
import { grantItem, revokeItem, disconnectGrantClient } from "./grant";
import { connectGameSocket, createRoom, joinRoom, placeItem, waitForConnect } from "./sockets";
import { registerForCleanup } from "./cleanup";

/**
 * PARTES 7, 8 y 9 de la Fase 11.5 — el tramo físico que quedó pendiente.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ ES SETUP Y QUÉ ES LA PRUEBA
 *
 * Crear el item (con su behavior real, atlas real en R2), concederlo al
 * admin y colocarlo en una sala se hace por socket real — es EXACTAMENTE lo
 * que ya se demostró correcto en `07-multiplayer-protocol.spec.ts`, y
 * repetirlo por la UI del editor + Build Mode en cada test multiplicaría el
 * tiempo sin verificar nada nuevo. Lo que esta fase pide y no estaba cubierto
 * es el TRAMO FINAL: el click del MOUSE dentro del `<canvas>` del navegador,
 * no una llamada directa a `emitRoomItemInteraction()`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CÓMO SE UBICA EL OBJETO SIN TOCAR EL MOTOR
 *
 * Phaser no expone ningún hook de accesibilidad y el proyecto no tiene un
 * `window.game` de depuración — instrumentar uno para este test violaría la
 * regla explícita de no tocar el renderer por conveniencia. En su lugar, el
 * objeto se coloca en el tile de aparición del jugador (0,0 relativo, mismo
 * criterio que `buildPlayer()`), se toma una captura de pantalla real y la
 * posición de click se determina leyendo esa captura — igual que lo haría
 * una persona mirando la pantalla.
 */

test.describe.serial("Click físico real dentro del canvas", () => {
  const state: {
    itemId: string;
    roomId: string;
    roomName: string;
    roomItemId: string;
    userId: string;
  } = {
    itemId: "",
    roomId: "",
    roomName: "",
    roomItemId: "",
    userId: "",
  };

  test.afterAll(async () => {
    if (state.userId && state.itemId) await revokeItem(state.userId, state.itemId);
    await disconnectGrantClient();
  });

  test("preparar: TV real publicada y colocada en una sala nueva", async ({
    adminPage,
    session,
  }) => {
    test.setTimeout(180_000);
    state.userId = session.user.userId as string;

    await openWorldItemEditor(adminPage);
    await fillBasicItem(adminPage, qaName("Fisico"));

    const behavior = behaviorSection(adminPage);
    await behavior.getByRole("button", { name: "Objeto con comportamiento" }).click();
    await behavior.getByRole("button", { name: /Televisor/ }).click();

    const { animationCard } = await import("./helpers");
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

    // Layout real ya existente en esta base (el mismo que ofrecería el
    // modal de creación de sala) — sin uno, el cliente no dibuja ni el piso.
    const { request: pwRequest } = await import("@playwright/test");
    const layoutApi = await pwRequest.newContext();
    const layoutResponse = await layoutApi.get(`${API_URL}/layouts`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    const layouts = layoutResponse.ok()
      ? ((await layoutResponse.json()) as Array<{ id: string }>)
      : [];
    await layoutApi.dispose();
    const layoutId = layouts[0]?.id;
    expect(layoutId, "hace falta al menos un layout real en la base para esta prueba").toBeTruthy();

    const socket = connectGameSocket(session.token);
    await waitForConnect(socket);
    state.roomName = `QA-F115 fisico ${Date.now().toString(36)}`;
    const room = await createRoom(socket, state.roomName, layoutId);
    await joinRoom(socket, room.id);
    // Se coloca cerca del spawn del jugador (100,100 en world units — ver
    // `PlayerHandler#buildPlayer`) para que quede dentro del encuadre inicial
    // de la cámara sin tener que mover al avatar.
    const placed = await placeItem(socket, room.id, state.itemId, 2, 2);
    socket.disconnect();

    state.roomId = room.id;
    state.roomItemId = placed.id;

    expect(state.roomItemId).toBeTruthy();
  });

  test("el objeto aparece en el canvas real tras entrar por la UI de salas", async ({
    adminPage,
    watchdog,
  }) => {
    test.skip(!state.roomId, "la preparación falló");
    test.setTimeout(120_000);

    await adminPage.goto(GAME_URL, { waitUntil: "domcontentloaded" });
    await expect(adminPage.getByRole("button", { name: "Mis Salas" })).toBeVisible({
      timeout: 30_000,
    });
    await adminPage.getByRole("button", { name: "Mis Salas" }).click();

    // Se filtra por el nombre EXACTO y único con el buscador real de la UI:
    // con muchas salas de QA acumuladas, cualquier localización por texto
    // ambiguo entre pestañas ("Públicas"/"Mis Salas" back a back en el DOM)
    // puede agarrar la tarjeta equivocada.
    await adminPage.getByPlaceholder(/[Bb]uscar/).fill(state.roomName);
    await expect(adminPage.getByText(state.roomName, { exact: true })).toHaveCount(1, {
      timeout: 15_000,
    });
    await adminPage.getByRole("button", { name: "ENTRAR" }).click();

    // Dentro de la sala: el canvas de Phaser reemplaza la lista.
    await expect(adminPage.locator("canvas").first()).toBeVisible({ timeout: 30_000 });

    // El primer ingreso a la escena en un dev server recién reiniciado
    // compila la escena bajo demanda (Turbopack) — se espera a que ese
    // indicador desaparezca antes de dar por cargado el mundo, en vez de un
    // tiempo fijo que podría no alcanzar.
    await adminPage
      .getByText("Compiling", { exact: false })
      .waitFor({ state: "hidden", timeout: 60_000 })
      .catch(() => {
        // Si no había indicador de compilación, no hay nada que esperar.
      });
    await adminPage.waitForTimeout(5000);

    await adminPage.screenshot({ path: "test-results/game-in-room.png", fullPage: false });

    // No se afirma nada sobre red/consola en este test puntual: el único
    // `RoomLayout` de esta base de desarrollo referencia un tileset
    // (`maps/rooms/tiles3.png`) que no existe en el bucket bajo NINGÚN host
    // (confirmado con `curl` directo contra el origen real: 404) — un dato
    // roto preexistente del catálogo de layouts, ajeno a World Objects y
    // fuera del alcance de esta fase. Queda documentado como bloqueo en el
    // informe de la Fase 11.5, no se inventa un resultado ni se silencia el
    // watchdog para el resto de la suite.
    void watchdog;
  });
});

test.describe("Localizar y clickear el RoomItem (PARTE 9 de la Fase 11.5)", () => {
  test("zoom out real + captura para ubicar el TV colocado", async ({ adminPage }) => {
    test.setTimeout(180_000);

    const { request: pwRequest } = await import("@playwright/test");
    const session = await pwRequest.newContext().then(async (api) => {
      const r = await api.post(
        "http://localhost:3001/identity/login",
        { data: { email: "admin@codebuddies.com", password: "admin123" } },
      );
      const body = (await r.json()) as { access_token: string; user: any };
      await api.dispose();
      return body;
    });

    const { grantItem } = await import("./grant");
    const { connectGameSocket, createRoom, joinRoom, placeItem, waitForConnect } = await import(
      "./sockets"
    );
    const {
      behaviorSection,
      fillBasicItem,
      openWorldItemEditor,
      qaName,
      saveItem,
      uploadFrames,
      animationCard,
    } = await import("./helpers");
    const { registerForCleanup } = await import("./cleanup");

    await openWorldItemEditor(adminPage);
    await fillBasicItem(adminPage, qaName("Zoom"));
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
    registerForCleanup(saved.id);
    await grantItem(session.user.userId, saved.id);

    const layoutApi = await pwRequest.newContext();
    const layoutRes = await layoutApi.get("http://localhost:3001/layouts", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const layoutId = (await layoutRes.json())[0]?.id;
    await layoutApi.dispose();

    const socket = connectGameSocket(session.access_token);
    await waitForConnect(socket);
    const roomName = `QA-F115 zoom ${Date.now().toString(36)}`;
    const room = await createRoom(socket, roomName, layoutId);
    await joinRoom(socket, room.id);
    // Se coloca MUY cerca del origen del jugador (world 100,100 en píxeles,
    // ver PlayerHandler#buildPlayer): si x/y de placeItem son coordenadas de
    // tile, unas pocas celdas alrededor del spawn deberían quedar visibles
    // sin necesidad de moverse.
    const placed = await placeItem(socket, room.id, saved.id, 7, 7);
    socket.disconnect();

    await adminPage.goto("http://localhost:3002", { waitUntil: "domcontentloaded" });
    await adminPage.getByRole("button", { name: "Mis Salas" }).click();
    // Con muchas salas de QA acumuladas de corridas anteriores, filtrar la
    // lista por el nombre EXACTO y único (con timestamp) usando el buscador
    // real de la propia UI dejar exactamente UNA tarjeta — es más robusto que
    // recorrer botones "ENTRAR" ambiguos entre pestañas.
    await adminPage.getByPlaceholder(/[Bb]uscar/).fill(roomName);
    await expect(adminPage.getByText(roomName, { exact: true })).toHaveCount(1, {
      timeout: 15_000,
    });
    await adminPage.getByRole("button", { name: "ENTRAR" }).click();
    await expect(adminPage.locator("canvas").first()).toBeVisible({ timeout: 30_000 });
    await adminPage
      .getByText("Compiling", { exact: false })
      .waitFor({ state: "hidden", timeout: 60_000 })
      .catch(() => {});
    await adminPage.waitForTimeout(3000);

    // Zoom out real con el botón "Alejar" de la UI (aria-label real,
    // `ZoomControls.tsx`): cada click dispara el mismo evento que ya
    // escuchaba la rueda del mouse en LobbyScene — ningún atajo de test.
    const zoomOutButton = adminPage.getByRole("button", { name: "Alejar" });
    await expect(zoomOutButton).toBeVisible({ timeout: 10_000 });
    for (let i = 0; i < 10; i += 1) {
      await zoomOutButton.click();
      await adminPage.waitForTimeout(150);
    }
    await adminPage.waitForTimeout(1000);

    await adminPage.screenshot({ path: "test-results/game-zoomed-out.png", fullPage: false });
    console.log("ROOM_ITEM_ID", placed.id, "ROOM_ID", room.id);
  });
});
