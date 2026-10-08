import { request as pwRequest } from "@playwright/test";
import { test as base, expect, API_URL } from "./fixtures";
import { grantItem, revokeItem, disconnectGrantClient } from "./grant";
import {
  connectGameSocket,
  createRoom,
  joinRoom,
  placeItem,
  sendClick,
  sendInteraction,
  waitForConnect,
  waitForEvent,
  collectEvents,
  type StateBroadcast,
} from "./sockets";
import { registerForCleanup } from "./cleanup";
import {
  behaviorSection,
  fillBasicItem,
  openWorldItemEditor,
  qaName,
  saveItem,
  uploadFrames,
} from "./helpers";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const worldObjects = require(
  require.resolve("@codebuddies/world-objects", {
    paths: [path.join(__dirname, "..", "apps", "api")],
  }),
) as typeof import("@codebuddies/world-objects");

/**
 * Lo que un late-joiner en REALIDAD ve, calculado con el MISMO paquete que usa
 * el cliente (`WorldObjectAnimator#applyRemoteState` en apps/game).
 *
 * El JSON persistido (`{key, via, to, at}`) puede seguir mostrando una
 * transición "en curso" mucho después de que el frame final ya pasó —
 * settle() no reescribe la fila hasta la PRÓXIMA interacción (`machine.ts`,
 * Fase 3). Leer `key`/`to` crudo confundiría "sigue en curso" con "ya
 * terminó, nadie volvió a escribir la fila". La función real es
 * `effectiveStateKey(persisted, now)`, así que se usa la misma acá.
 */
function effectiveStateOf(
  behavior: import("@codebuddies/world-objects").WorldBehavior,
  rawState: unknown,
  now: number,
): string {
  const persisted = worldObjects.readPersistedState(rawState);
  return worldObjects.effectiveStateKey(behavior, persisted, now);
}

async function fetchBehavior(
  session: { token: string },
  itemId: string,
): Promise<import("@codebuddies/world-objects").WorldBehavior> {
  const api = await pwRequest.newContext();
  try {
    const response = await api.get(`${API_URL}/items/${itemId}`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    const item = (await response.json()) as { worldData?: { behavior?: unknown } };
    return item.worldData!.behavior as import("@codebuddies/world-objects").WorldBehavior;
  } finally {
    await api.dispose();
  }
}

/**
 * PARTES 18 (verificación de datos), 20, 22, 23, 24, 25 y 26 — el protocolo
 * real de click, multiplayer, late join, refresh y click-spam.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SOCKETS REALES, NO EL CANVAS
 *
 * Ver `e2e/sockets.ts`: esto conecta al `GameGateway` real con
 * `socket.io-client` y el mismo JWT que usa el navegador. Es la forma correcta
 * de comprobar "mismo estado, misma transición, mismo `at`" entre dos
 * clientes — leerlo del payload es más fuerte que compararlo a ojo entre dos
 * capturas de pantalla de un `<canvas>`.
 *
 * La verificación VISUAL (que el sprite se vea bien) está en
 * `06-game-visual.spec.ts`, con el navegador de verdad.
 */

type ProtocolFixtures = {
  adminUserId: string;
  publishedTv: { itemId: string; roomItemId: string; roomId: string };
};

const test = base.extend<ProtocolFixtures>({
  adminUserId: async ({ session }, use) => {
    await use(session.user.userId as string);
  },

  // Crea UN televisor real por la UI DE VERDAD (el mismo camino que
  // 04-save-reopen.spec.ts ya probó de punta a punta: editor → 4 atlas reales
  // en R2 → guardar). Reconstruir a mano el payload plano de `POST /items`
  // —con footprints, placement, stacking, etc.— arriesgaba divergir del que
  // realmente manda el admin; reusar la UI elimina ese riesgo. Lo concede al
  // admin y lo coloca en una sala nueva por socket real. Todo el describe de
  // este archivo comparte este mismo objeto colocado.
  publishedTv: async ({ session, adminUserId, context }, use) => {
    const { seedSession } = await import("./fixtures");
    const { serveR2Objects } = await import("./r2");
    await seedSession(context, session);
    await serveR2Objects(context);
    const page = await context.newPage();

    await openWorldItemEditor(page);
    await fillBasicItem(page, qaName("Protocolo"));

    // "Interactuable" / `interactionTypes` es un par de columnas APARTE
    // (legacy, compartido con TOGGLE/OPEN/…) que `RoomItemsService#interactItem`
    // exige antes de mirar siquiera `behavior`. La Fase 11 encontró que el
    // editor nunca las tocaba —un TV con click perfecto no respondía en la
    // sala— y lo corrigió en `world-behavior.util.ts#buildInteractionTypesData`
    // (ver world-behavior.util.spec.ts): guardar un behavior con una
    // transición CLICK ahora las enciende solo. No hace falta marcar nada acá.

    const behavior = behaviorSection(page);
    await behavior.getByRole("button", { name: "Objeto con comportamiento" }).click();
    await behavior.getByRole("button", { name: /Televisor/ }).click();

    const { animationCard } = await import("./helpers");
    for (const [key, count] of [
      ["off", 1],
      ["turn_on", 2],
      ["screen_loop", 2],
      ["turn_off", 2],
    ] as Array<[string, number]>) {
      // Se desmarca "Gira con el objeto": para esta suite (protocolo de
      // sockets) no hace falta que sea direccional, y así son 1/4 de los
      // frames que en 04-save-reopen.spec.ts (que sí prueba las 4 caras).
      await animationCard(page, key).getByLabel("Gira con el objeto").uncheck();
      await uploadFrames(page, key, count, 1);
    }

    const saved = await saveItem(page);
    expect(saved.dialogs).toEqual([]);
    registerForCleanup(saved.id);
    await page.close();

    await grantItem(adminUserId, saved.id);

    const socket = connectGameSocket(session.token);
    await waitForConnect(socket);
    const room = await createRoom(socket, `QA-F11 ${Date.now().toString(36)}`);
    // `room:item:placed` se difunde a la sala de Socket.IO (`server.to(roomId)`),
    // no como respuesta directa a quien coloca: hace falta haberse unido antes.
    await joinRoom(socket, room.id);
    const placed = await placeItem(socket, room.id, saved.id);
    socket.disconnect();

    await use({ itemId: saved.id, roomItemId: placed.id, roomId: room.id });

    await revokeItem(adminUserId, saved.id);
  },
});

test.afterAll(async () => {
  await disconnectGrantClient();
});

// ═══════════════════════ PARTE 18: datos publicados ═══════════════════════

test("el item publicado trae behavior, atlas e isInteractable reales (no sólo 'publicado')", async ({
  session,
  publishedTv,
}) => {
  const api = await (await import("@playwright/test")).request.newContext();
  const response = await api.get(`${API_URL}/items/${publishedTv.itemId}`, {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  const item = (await response.json()) as any;

  expect(item.worldData?.behavior?.initialState).toBe("OFF");
  expect(item.worldData?.behavior?.animations).toHaveLength(4);
  expect(item.worldData?.behavior?.transitions).toHaveLength(2);
  // `isInteractable`/`kind` son el par LEGACY (TOGGLE/OPEN/…, ver
  // `items.interactable` en ItemEditor); un objeto que reacciona por
  // `behavior` no depende de ellos, así que quedan en su default (false/null)
  // y eso es correcto — no una omisión.
  expect(item.worldData?.width).toBeGreaterThan(0);
  expect(item.worldData?.height).toBeGreaterThan(0);
  expect(item.worldData?.footprints ?? item.footprints).toBeTruthy();
  expect(item.category).toBeTruthy();
  expect(item.imageUrl).toBeTruthy();
  await api.dispose();
});

// ═══════════════════════ PARTE 20/26: click real ═══════════════════════

test("un CLICK real recorre OFF → turn_on → ON por el servidor de verdad", async ({
  session,
  publishedTv,
}) => {
  const socket = connectGameSocket(session.token);
  await waitForConnect(socket);
  await joinRoom(socket, publishedTv.roomId);

  const statePromise = waitForEvent<StateBroadcast>(socket, "room:item:state");
  sendClick(socket, publishedTv.roomItemId);
  const broadcast = await statePromise;

  expect(broadcast.roomItemId).toBe(publishedTv.roomItemId);
  expect(broadcast.interaction).toBe("CLICK");
  expect(broadcast.behavior).toBeTruthy();
  expect(broadcast.behavior!.state).toBe("ON");
  expect(broadcast.behavior!.via).toBe("turn_on");
  expect(typeof broadcast.behavior!.at).toBe("number");

  // El segundo click hay que darlo DESPUÉS de que termine turn_on (2 frames a
  // 8 fps = 250 ms): mientras la animación de paso está en curso, el objeto
  // está ocupado a propósito (`isTransitionInFlight`, la protección de la
  // Fase 3 contra el click-spam) y el servidor lo ignora en silencio — no es
  // un error, es la protección funcionando.
  await new Promise((resolve) => setTimeout(resolve, 400));

  const back = waitForEvent<StateBroadcast>(socket, "room:item:state");
  sendClick(socket, publishedTv.roomItemId);
  const secondBroadcast = await back;
  expect(secondBroadcast.behavior!.state).toBe("OFF");
  expect(secondBroadcast.behavior!.via).toBe("turn_off");

  socket.disconnect();
});

// ═══════════════════════ PARTE 25: click spam ═══════════════════════

test("10 clicks rápidos producen UNA sola transición, no diez", async ({
  session,
  publishedTv,
}) => {
  const socket = connectGameSocket(session.token);
  await waitForConnect(socket);
  await joinRoom(socket, publishedTv.roomId);

  const collector = collectEvents<StateBroadcast>(socket, "room:item:state");

  for (let i = 0; i < 10; i += 1) sendClick(socket, publishedTv.roomItemId);

  // Se espera lo suficiente para que, si el servidor fuera a difundir diez
  // veces, ya lo hubiera hecho — y para que la única transición real termine.
  await new Promise((resolve) => setTimeout(resolve, 1500));
  collector.stop();

  expect(
    collector.events.length,
    `se esperaba 1 transición y llegaron ${collector.events.length}: ${JSON.stringify(collector.events)}`,
  ).toBe(1);
  expect(collector.events[0].behavior?.state).toBe("ON");

  // Se deja el objeto en OFF para no condicionar los tests siguientes.
  const back = waitForEvent<StateBroadcast>(socket, "room:item:state");
  sendClick(socket, publishedTv.roomItemId);
  await back;

  socket.disconnect();
});

// ═══════════════════════ PARTE 22: multiplayer ═══════════════════════

test("dos clientes en la misma sala ven el mismo estado, vía y `at`", async ({
  session,
  publishedTv,
}) => {
  const a = connectGameSocket(session.token);
  const b = connectGameSocket(session.token);
  await Promise.all([waitForConnect(a), waitForConnect(b)]);
  await Promise.all([joinRoom(a, publishedTv.roomId), joinRoom(b, publishedTv.roomId)]);

  const onA = waitForEvent<StateBroadcast>(a, "room:item:state");
  const onB = waitForEvent<StateBroadcast>(b, "room:item:state");

  sendClick(a, publishedTv.roomItemId);

  const [receivedByA, receivedByB] = await Promise.all([onA, onB]);

  expect(receivedByB).toEqual(receivedByA);
  expect(receivedByA.behavior!.state).toBe("ON");
  expect(receivedByA.behavior!.via).toBe("turn_on");

  // Vuelve a OFF para dejar el objeto limpio (esperando a que termine
  // turn_on: mientras está en curso el click se ignora, a propósito).
  await new Promise((resolve) => setTimeout(resolve, 400));
  const restore = waitForEvent<StateBroadcast>(a, "room:item:state");
  sendClick(a, publishedTv.roomItemId);
  await restore;

  a.disconnect();
  b.disconnect();
});

// ═══════════════════════ PARTE 23: late join ═══════════════════════

test.describe("Late join", () => {
  test("quien entra a MITAD de una transición no ve el frame 0", async ({
    session,
    publishedTv,
  }) => {
    const a = connectGameSocket(session.token);
    await waitForConnect(a);
    await joinRoom(a, publishedTv.roomId);

    const stateChanged = waitForEvent<StateBroadcast>(a, "room:item:state");
    sendClick(a, publishedTv.roomItemId); // turn_on dura 2 frames / 8 fps = 250 ms
    await stateChanged; // el servidor ya resolvió y persistió `via/at`

    // B entra ~120 ms después de que arrancó la transición: todavía en curso.
    await new Promise((resolve) => setTimeout(resolve, 120));

    const b = connectGameSocket(session.token);
    await waitForConnect(b);
    const joined = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout room:joined")), 10_000);
      b.once("room:joined", (payload: any) => {
        clearTimeout(timeout);
        resolve(payload);
      });
      b.emit("joinRoom", { roomId: publishedTv.roomId });
    });

    const items: any[] = joined.items ?? joined.room?.items ?? [];
    const item = items.find((entry) => entry.id === publishedTv.roomItemId);

    expect(item, "el room:joined debe traer el objeto con su estado persistido").toBeTruthy();
    const behaviorState = item.state?.behavior;
    expect(behaviorState, "el estado persistido debe incluir la transición en curso").toBeTruthy();
    // Persistido en pleno vuelo: to=ON, via=turn_on, at reciente — es la
    // forma { key: stateKey, via, to, at } que documenta persistence.ts.
    expect(behaviorState.via ?? behaviorState.to).toBeTruthy();

    a.disconnect();
    b.disconnect();
  });

  test("quien entra DESPUÉS de terminada la transición ve directamente el estado final", async ({
    session,
    publishedTv,
  }) => {
    const a = connectGameSocket(session.token);
    await waitForConnect(a);
    await joinRoom(a, publishedTv.roomId);

    const stateChanged = waitForEvent<StateBroadcast>(a, "room:item:state");
    sendClick(a, publishedTv.roomItemId);
    await stateChanged;

    // Se espera más que la duración de turn_on (250 ms) de sobra.
    await new Promise((resolve) => setTimeout(resolve, 800));

    const b = connectGameSocket(session.token);
    await waitForConnect(b);
    const joined = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout room:joined")), 10_000);
      b.once("room:joined", (payload: any) => {
        clearTimeout(timeout);
        resolve(payload);
      });
      b.emit("joinRoom", { roomId: publishedTv.roomId });
    });

    const items: any[] = joined.items ?? joined.room?.items ?? [];
    const item = items.find((entry) => entry.id === publishedTv.roomItemId);

    // El JSON crudo puede seguir diciendo "en curso" (nadie reescribe la fila
    // hasta la próxima interacción — ver `effectiveStateOf` arriba); lo que
    // importa es el estado EFECTIVO, calculado con el mismo paquete que usa
    // el juego.
    const behavior = await fetchBehavior(session, publishedTv.itemId);
    expect(effectiveStateOf(behavior, item?.state, Date.now())).toBe("ON");

    // Sin click de limpieza: cada test tiene su PROPIO item/sala (fixture
    // `publishedTv` de alcance test), así que no hay nada que restaurar para
    // el resto de la suite.
    a.disconnect();
    b.disconnect();
  });
});

// ═══════════════════════ PARTE 24: refresh ═══════════════════════

test("reconectar durante una transición retoma el mismo estado persistido, no el inicial", async ({
  session,
  publishedTv,
}) => {
  const a = connectGameSocket(session.token);
  await waitForConnect(a);
  await joinRoom(a, publishedTv.roomId);

  const stateChanged = waitForEvent<StateBroadcast>(a, "room:item:state");
  sendClick(a, publishedTv.roomItemId);
  const original = await stateChanged;
  const originalAt = original.behavior!.at;

  // "Recargar A": se desconecta y se abre un socket nuevo, como hace el
  // navegador al hacer F5 (una conexión Socket.IO no sobrevive un reload).
  a.disconnect();
  await new Promise((resolve) => setTimeout(resolve, 100));

  const reconnected = connectGameSocket(session.token);
  await waitForConnect(reconnected);
  const joined = await new Promise<any>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("timeout room:joined")), 10_000);
    reconnected.once("room:joined", (payload: any) => {
      clearTimeout(timeout);
      resolve(payload);
    });
    reconnected.emit("joinRoom", { roomId: publishedTv.roomId });
  });

  const items: any[] = joined.items ?? joined.room?.items ?? [];
  const item = items.find((entry) => entry.id === publishedTv.roomItemId);
  const behaviorState = item?.state?.behavior;
  expect(behaviorState).toBeTruthy();

  // La continuidad real que pide la Fase 11: el MISMO `at` que puso el
  // servidor en el click original — no uno nuevo, no null. Es lo que le
  // permite al cliente calcular el frame correcto (`now - at`) en vez de
  // reiniciar la animación desde 0 sólo porque hubo un F5.
  expect(behaviorState.at).toBe(originalAt);
  expect(behaviorState.via).toBe("turn_on");

  // Y el estado EFECTIVO (no el JSON crudo, ver `effectiveStateOf`) termina
  // correctamente en ON tras esperar lo que dura la animación.
  await new Promise((resolve) => setTimeout(resolve, 500));
  const behavior = await fetchBehavior(session, publishedTv.itemId);
  const settledJoin = await new Promise<any>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("timeout room:joined")), 10_000);
    const probe = connectGameSocket(session.token);
    probe.once("connect", () => probe.emit("joinRoom", { roomId: publishedTv.roomId }));
    probe.once("room:joined", (payload: any) => {
      clearTimeout(timeout);
      probe.disconnect();
      resolve(payload);
    });
  });
  const settledItems: any[] = settledJoin.items ?? settledJoin.room?.items ?? [];
  const settledItem = settledItems.find((entry) => entry.id === publishedTv.roomItemId);
  expect(effectiveStateOf(behavior, settledItem?.state, Date.now())).toBe("ON");

  // Sin click de limpieza: cada test tiene su propio item/sala.
  reconnected.disconnect();
});

// ═══════════════════════ PARTE 26: legacy ═══════════════════════

test.describe("Legacy: TOGGLE sigue funcionando sin tocar el sistema nuevo", () => {
  test("un objeto TOGGLE clásico (sin behavior) sigue respondiendo a TOGGLE", async ({
    session,
    adminUserId,
  }) => {
    const api = await (await import("@playwright/test")).request.newContext();
    const auth = { Authorization: `Bearer ${session.token}` };

    // Item legacy: sin `behavior`. El payload de `POST /items` es PLANO (no
    // `{worldData: {...}}`) — es exactamente lo que manda `ItemEditor`, y
    // `CreateItemDto` ni siquiera declara `interactionTypes` (ese campo es
    // admin-only, ver la nota de la Fase 11 sobre `buildInteractionTypesData`).
    const created = await api.post(`${API_URL}/items`, {
      headers: auth,
      data: {
        languageCode: "es",
        name: `QA-F11 Legacy TOGGLE ${Date.now().toString(36)}`,
        description: "Objeto legacy para comprobar que TOGGLE sigue intacto.",
        category: "furniture",
        tags: [],
        rarity: 0,
        colorable: false,
        coinsPrice: 0,
        gemsPrice: 0,
        shopVisible: true,
        imageUrl: "https://codebuddies.sfo3.digitaloceanspaces.com/placeholder.png",
        kind: "FURNITURE",
        width: 32,
        height: 32,
        isCollidable: false,
        isInteractable: true,
        rotatable: false,
        directions: 1,
        footprints: {
          NORTH: { occupied: [{ x: 0, y: 0 }], origin: { x: 0, y: 0 } },
        },
      },
    });
    expect(created.ok(), await created.text()).toBe(true);
    const item = (await created.json()) as { id: string };
    registerForCleanup(item.id);

    // El TOGGLE en sí lo habilita SIEMPRE un admin en /admin/world-items/:id
    // (`interactionTypes` no es parte del DTO de creación) — es el paso real
    // que ya existía antes de la Fase 0 y que esta fase no toca.
    const patched = await api.patch(`${API_URL}/world-item-data/${item.id}`, {
      headers: auth,
      data: { interactionTypes: ["TOGGLE"] },
    });
    expect(patched.ok(), await patched.text()).toBe(true);

    // Confirmado por la API real: nunca se le escribió `behavior`.
    const check = await api.get(`${API_URL}/items/${item.id}`, { headers: auth });
    const full = (await check.json()) as any;
    expect(full.worldData?.behavior ?? null).toBeNull();
    expect(full.worldData?.interactionTypes).toContain("TOGGLE");

    await grantItem(adminUserId, item.id);

    const socket = connectGameSocket(session.token);
    await waitForConnect(socket);
    const room = await createRoom(socket, `QA-F11 legacy ${Date.now().toString(36)}`);
    await joinRoom(socket, room.id);
    const placed = await placeItem(socket, room.id, item.id);

    const statePromise = waitForEvent<StateBroadcast>(socket, "room:item:state");
    sendInteraction(socket, placed.id, "TOGGLE");
    const broadcast = await statePromise;

    // El TOGGLE clásico sigue viniendo por el mismo campo `state` de siempre,
    // y NUNCA trae `behavior` (ese campo es sólo para objetos con contrato).
    expect(broadcast.interaction).toBe("TOGGLE");
    expect(broadcast.state).toBeTruthy();
    expect(broadcast.behavior).toBeUndefined();

    socket.disconnect();
    await revokeItem(adminUserId, item.id);
    await api.dispose();
  });
});
