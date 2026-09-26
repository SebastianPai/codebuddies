import fs from "fs";
import path from "path";
import { PNG } from "pngjs";
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
import { connectGameSocket, createRoom, waitForConnect } from "./sockets";
import { registerForCleanup } from "./cleanup";
import { isMostlyUniform, locateLargestChange } from "./pixel-locate";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const worldObjects = require(
  require.resolve("@codebuddies/world-objects", {
    paths: [path.join(__dirname, "..", "apps", "api")],
  }),
) as typeof import("@codebuddies/world-objects");

/**
 * Fase 11.5-B (continuación) — coloca el fixture físico usando el Modo
 * Construcción REAL de la UI, en vez de seguir adivinando coordenadas de
 * tile desde afuera.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTO SÍ FUNCIONA DONDE ADIVINAR TILES NO FUNCIONABA
 *
 * `BuildSystem` (apps/game/src/game/systems/BuildSystem.ts) dibuja un
 * "fantasma" semitransparente que seguía el mouse ANTES de confirmar la
 * colocación, y `FurniturePlacementSystem` convierte el punto de click real
 * a tile con la MISMA función que usa el motor
 * (`grid.pointerToTile(camera, pointer)`). No hace falta saber a qué tile
 * corresponde una coordenada de pantalla: basta con mover el mouse a un
 * punto de la pantalla donde YA se ve el piso (confirmado con capturas
 * reales en la Fase 11.5-B anterior) y dejar que Phaser resuelva el resto —
 * exactamente lo que haría una persona.
 *
 * Nada de esto modifica el motor isométrico ni el propio Build Mode: es
 * pura automatización de la UI ya existente (botón "Construir", pestaña
 * "Inventario", click de colocación, botón "Salir del modo construccion").
 */

test.describe.serial("Fixture físico vía Build Mode real (Fase 11.5-B)", () => {
  const state: {
    itemId: string;
    roomId: string;
    roomName: string;
    roomItemId: string;
    userId: string;
    token: string;
    itemName: string;
  } = { itemId: "", roomId: "", roomName: "", roomItemId: "", userId: "", token: "", itemName: "" };

  test.afterAll(async () => {
    if (state.userId && state.itemId) await revokeItem(state.userId, state.itemId);
    await disconnectGrantClient();
  });

  test("colocar el TV con el Modo Construcción real y clickearlo físicamente", async ({
    adminPage,
    session,
  }) => {
    test.setTimeout(600_000);
    state.userId = session.user.userId as string;
    state.token = session.token;

    // ── 1. TV real: behavior real + atlas real en R2 (mismo patrón que el
    //       resto de la suite — no es una herramienta nueva, es el mismo
    //       item de siempre) ────────────────────────────────────────────
    state.itemName = qaName("BuildFixture");
    await openWorldItemEditor(adminPage);
    await fillBasicItem(adminPage, state.itemName);
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

    // ── 2. Sala real ─────────────────────────────────────────────────────
    const { request: pwRequest } = await import("@playwright/test");
    const layoutApi = await pwRequest.newContext();
    const layoutResponse = await layoutApi.get(`${API_URL}/layouts`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    const layouts = (await layoutResponse.json()) as Array<{ id: string }>;
    await layoutApi.dispose();
    const layoutId = layouts[0]?.id;
    expect(layoutId, "hace falta al menos un layout real en la base").toBeTruthy();

    const setupSocket = connectGameSocket(session.token);
    await waitForConnect(setupSocket);
    state.roomName = `QA-F115B build ${Date.now().toString(36)}`;
    const room = await createRoom(setupSocket, state.roomName, layoutId);
    state.roomId = room.id;
    setupSocket.disconnect();

    // ── 3. Entrar a la sala por la UI real, esperar render de verdad ──────
    await adminPage.goto(GAME_URL, { waitUntil: "domcontentloaded" });
    await expect(adminPage.getByRole("button", { name: "Mis Salas" })).toBeVisible({ timeout: 30_000 });
    await adminPage.getByRole("button", { name: "Mis Salas" }).click();
    await adminPage.getByPlaceholder(/[Bb]uscar/).fill(state.roomName);
    await expect(adminPage.getByText(state.roomName, { exact: true })).toHaveCount(1, { timeout: 15_000 });
    await adminPage.getByRole("button", { name: "ENTRAR" }).click();

    const canvas = adminPage.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 30_000 });
    await adminPage
      .getByText("Compiling", { exact: false })
      .waitFor({ state: "hidden", timeout: 60_000 })
      .catch(() => {});
    await adminPage.waitForTimeout(2000);

    const waitForRealRender = async (): Promise<Buffer> => {
      const deadline = Date.now() + 25_000;
      let png = await canvas.screenshot();
      while (isMostlyUniform(png)) {
        if (Date.now() > deadline) throw new Error("El canvas no renderizó contenido real tras 25s");
        await adminPage.waitForTimeout(1000);
        png = await canvas.screenshot();
      }
      await adminPage.waitForTimeout(1000);
      return canvas.screenshot();
    };

    fs.mkdirSync("test-results", { recursive: true });
    const beforeBuildPng = await waitForRealRender();
    fs.writeFileSync("test-results/build-0-room-empty.png", beforeBuildPng);

    // NOTA IMPORTANTE: la verificación del RoomItem y de su `state` se hace
    // por BASE DE DATOS DIRECTA, no por socket. El servidor sólo permite UNA
    // conexión de socket por usuario (`PlayerHandler#handleConnection`
    // desconecta la anterior) — un socket "observador" abierto DESPUÉS de
    // colocar el objeto tira abajo la conexión de la PÁGINA justo antes del
    // click físico. Sospecha en investigación: en las corridas anteriores
    // (con un observador por socket) el click nunca abría el menú de
    // selección NI cambiaba el estado — evitar tocar la conexión de la
    // página por completo es la forma de descartar esa sospecha sin
    // adivinar más.

    // Ruido conocido y ajeno a esta prueba: bajo la carga sostenida de esta
    // sesión de QA, un fetch de fondos/HUD en segundo plano puede fallar
    // ("Acción crítica — No se pudieron obtener los fondos") y ese modal
    // genérico bloquea clicks posteriores hasta cerrarse — se descarta si
    // aparece, en vez de dejar que tape la UI real que sí estamos probando.
    const dismissUnrelatedErrorDialog = async () => {
      const dismissButton = adminPage.getByRole("button", { name: "Entendido" });
      if (await dismissButton.isVisible().catch(() => false)) {
        // eslint-disable-next-line no-console
        console.log("DISMISSING_UNRELATED_ERROR_DIALOG");
        await dismissButton.click();
        await adminPage.waitForTimeout(300);
      }
    };

    // ── 4. Abrir Modo Construcción por la UI real ──────────────────────────
    await dismissUnrelatedErrorDialog();
    await adminPage.getByRole("button", { name: "Construir" }).click();
    await expect(
      adminPage.getByRole("button", { name: /Salir del modo construcci/i }),
    ).toBeVisible({ timeout: 15_000 });
    await adminPage.waitForTimeout(500);
    const buildModePng = await canvas.screenshot();
    fs.writeFileSync("test-results/build-1-buildmode-open.png", buildModePng);

    // Lectura DIRECTA a la base (sin socket de por medio), para verificar
    // sin ambigüedad si la colocación realmente persistió.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = require(
      require.resolve("@prisma/client", { paths: [path.join(__dirname, "..", "apps", "api")] }),
    );
    const diagPrisma = new PrismaClient();
    // Se conecta explícitamente ANTES de la primera consulta real: un
    // cliente recién construido a veces pierde la primera query por una
    // carrera de arranque del motor de Prisma bajo la carga general de esta
    // sesión — reintentar sólo la conexión (no el resultado) alcanza.
    const connectDiagPrisma = async () => {
      for (let attempt = 1; attempt <= 15; attempt += 1) {
        try {
          await diagPrisma.$connect();
          return;
        } catch (err) {
          if (attempt === 15) throw err;
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    };
    await connectDiagPrisma();
    const countPlacedRows = async () => {
      for (let attempt = 1; attempt <= 10; attempt += 1) {
        try {
          return await diagPrisma.roomItem.findMany({ where: { roomId: state.roomId } });
        } catch (err) {
          if (attempt === 10) throw err;
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
      return [];
    };

    // Reemplaza al viejo `fetchRoomItems()` por socket (ver nota de arriba):
    // trae el RoomItem con la MISMA forma que traía `room:joined.items`
    // (`.item.imageUrl`, `.item.worldData.behavior`, `.state`, `.x`/`.y`)
    // sin tocar la conexión de la página en ningún momento.
    const fetchPlacedItemFromDb = async (): Promise<any> => {
      for (let attempt = 1; attempt <= 10; attempt += 1) {
        try {
          return await diagPrisma.roomItem.findUnique({
            where: { id: state.roomItemId },
            include: { item: { include: { worldData: true } } },
          });
        } catch (err) {
          if (attempt === 10) throw err;
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
      return null;
    };

    const box = await canvas.boundingBox();
    expect(box, "el canvas no tiene bounding box").not.toBeNull();

    // ── 5-10. Colocar con el Modo Construcción real, con reintento
    //          verificado contra la base: bajo la carga de esta sesión de
    //          QA, un mismo punto de piso no siempre resulta en una
    //          colocación válida a la primera (footprint/validador puede
    //          rechazarla en silencio) — se reintenta con la MISMA UI real,
    //          nunca con un socket, variando apenas el punto de piso. ─────
    let afterExitPng: Buffer = beforeBuildPng;
    let finalLocate: ReturnType<typeof locateLargestChange> = null;
    let dbRows: any[] = [];

    const candidateYRatios = [0.72, 0.68, 0.78];
    for (let attempt = 0; attempt < candidateYRatios.length; attempt += 1) {
      await dismissUnrelatedErrorDialog();
      const inventoryTab = adminPage.getByRole("button", { name: "Inventario" });
      await expect(inventoryTab).toBeVisible({ timeout: 10_000 });
      await inventoryTab.click();
      // La tarjeta trae también un botón de "zoom" y otro de "favorito" con
      // el nombre del item en su accessible name — se filtra por el hint
      // real de colocación ("Colocar") para quedarse con la tarjeta en sí.
      const itemCard = adminPage
        .getByRole("button", { name: new RegExp(state.itemName) })
        .filter({ hasText: "Colocar" });
      await expect(itemCard).toBeVisible({ timeout: 15_000 });
      await dismissUnrelatedErrorDialog();
      await itemCard.click();
      await adminPage.waitForTimeout(500);
      await dismissUnrelatedErrorDialog();

      const candidateX = box!.x + box!.width * 0.5;
      const candidateY = box!.y + box!.height * candidateYRatios[attempt];
      await adminPage.mouse.move(candidateX, candidateY, { steps: 10 });
      await adminPage.waitForTimeout(300);
      const ghostPng = await canvas.screenshot();
      fs.writeFileSync(`test-results/build-2-ghost-hover-attempt${attempt}.png`, ghostPng);
      // eslint-disable-next-line no-console
      console.log("HOVER_CANDIDATE", JSON.stringify({ attempt, candidateX, candidateY, box }));

      await adminPage.mouse.click(candidateX, candidateY);
      await adminPage.waitForTimeout(1500);
      const placedPng = await canvas.screenshot();
      const placementDiff = locateLargestChange(ghostPng, placedPng);
      // eslint-disable-next-line no-console
      console.log("PLACEMENT_DIFF", JSON.stringify({ attempt, placementDiff }));

      // Salir del Modo Construcción por la UI real.
      await dismissUnrelatedErrorDialog();
      await adminPage.getByRole("button", { name: /Salir del modo construcci/i }).click();
      await adminPage.waitForTimeout(1000);
      afterExitPng = await canvas.screenshot();
      fs.writeFileSync(`test-results/build-4-after-exit-attempt${attempt}.png`, afterExitPng);

      dbRows = await countPlacedRows();
      // eslint-disable-next-line no-console
      console.log("DB_ROOMITEMS_DIRECT", JSON.stringify({ attempt, roomId: state.roomId, count: dbRows.length }));

      if (dbRows.length > 0) {
        finalLocate = locateLargestChange(beforeBuildPng, afterExitPng);
        break;
      }

      // No se colocó: reabrir Modo Construcción para el siguiente intento
      // (el item sigue en inventario — una colocación rechazada por el
      // validador no llega a consumirlo).
      if (attempt < candidateYRatios.length - 1) {
        await dismissUnrelatedErrorDialog();
        await adminPage.getByRole("button", { name: "Construir" }).click();
        await expect(
          adminPage.getByRole("button", { name: /Salir del modo construcci/i }),
        ).toBeVisible({ timeout: 15_000 });
      }
    }

    expect(dbRows.length, "el objeto nunca llegó a existir en la base tras varios intentos reales de colocación").toBe(1);
    // eslint-disable-next-line no-console
    console.log("FINAL_LOCATE", JSON.stringify(finalLocate));
    expect(
      finalLocate,
      "la fila existe en la base pero no se detectó diferencia visual — posible desfase entre servidor y render",
    ).not.toBeNull();
    expect(finalLocate!.pixelCount).toBeGreaterThan(20);

    // El roomItemId sale de la MISMA lectura de base que ya confirmó la
    // colocación (`dbRows`, del bucle de arriba) — hay un solo RoomItem en
    // esta sala, así que es inequívoco.
    state.roomItemId = dbRows[0].id;
    const placedItem = await fetchPlacedItemFromDb();
    expect(placedItem, "no se pudo releer el RoomItem recién colocado por base de datos").toBeTruthy();

    // El click físico anterior (centroide/máximo contraste del diff de
    // render) cayó dentro del bbox visible pero nunca disparó la interacción
    // NI abrió el menú de selección. Estaba analizando la imagen EQUIVOCADA:
    // `item.imageUrl` es sólo la miniatura/preview genérica que usa
    // `RoomItemsManager.addItem` como textura base ANTES de que el animator
    // la reemplace — lo que de verdad se dibuja, para un objeto con
    // `behavior`, es el frame de la animación del estado actual
    // (`behavior.animations[].spriteSheetUrl` de la animación asociada al
    // estado "OFF", el estado inicial). Se lee ESE PNG en cambio, y ahí se
    // busca un píxel genuinamente opaco, mapeado a pantalla con el bbox ya
    // confirmado — el ancla real es `setOrigin(0.5, 1)` (centro-abajo).
    const behaviorRaw = placedItem.item?.worldData?.behavior;
    const offStateAnimationKey = behaviorRaw?.states?.find((s: any) => s.key === (behaviorRaw?.initialState ?? "OFF"))?.animation;
    const offAnimation = behaviorRaw?.animations?.find((a: any) => a.key === offStateAnimationKey);
    const realSpriteUrl: string = offAnimation?.spriteSheetUrl ?? placedItem.item.imageUrl;
    // eslint-disable-next-line no-console
    console.log("REAL_SPRITE_URL", JSON.stringify({ offStateAnimationKey, realSpriteUrl, fallbackImageUrl: placedItem.item.imageUrl }));

    const spriteApi = await pwRequest.newContext();
    const spriteResponse = await spriteApi.get(realSpriteUrl);
    if (!spriteResponse.ok()) {
      throw new Error(`No se pudo descargar el sprite real (${realSpriteUrl}): HTTP ${spriteResponse.status()}`);
    }
    const spritePngBuffer = await spriteResponse.body();
    await spriteApi.dispose();
    const spritePng = PNG.sync.read(spritePngBuffer);

    // Centroide de los píxeles SÓLIDAMENTE opacos (alpha >= 250), no el
    // primero que aparezca en el recorrido: un pixel de esquina amplifica
    // cualquier imprecisión del mapeo afín de abajo, mientras que el centro
    // de masa de la zona opaca es robusto a esa imprecisión y, por
    // construcción, cae bien adentro de la silueta real.
    let sumOpaqueX = 0;
    let sumOpaqueY = 0;
    let opaqueCount = 0;
    let maxAlphaSeen = -1;
    for (let y = 0; y < spritePng.height; y += 1) {
      for (let x = 0; x < spritePng.width; x += 1) {
        const alpha = spritePng.data[(spritePng.width * y + x) * 4 + 3];
        if (alpha > maxAlphaSeen) maxAlphaSeen = alpha;
        if (alpha >= 250) {
          sumOpaqueX += x;
          sumOpaqueY += y;
          opaqueCount += 1;
        }
      }
    }
    const bestSrcX = opaqueCount > 0 ? sumOpaqueX / opaqueCount : Math.floor(spritePng.width / 2);
    const bestSrcY = opaqueCount > 0 ? sumOpaqueY / opaqueCount : Math.floor(spritePng.height / 2);
    // eslint-disable-next-line no-console
    console.log(
      "SPRITE_OPAQUE_PIXEL",
      JSON.stringify({
        imageUrl: realSpriteUrl,
        width: spritePng.width,
        height: spritePng.height,
        opaqueCount,
        maxAlphaSeen,
        bestSrcX,
        bestSrcY,
      }),
    );

    const bboxWidth = finalLocate!.bbox.maxX - finalLocate!.bbox.minX;
    const bboxHeight = finalLocate!.bbox.maxY - finalLocate!.bbox.minY;
    const bboxCenterX = (finalLocate!.bbox.minX + finalLocate!.bbox.maxX) / 2;
    const canvasClickX = bboxCenterX + (bestSrcX / spritePng.width - 0.5) * bboxWidth;
    const canvasClickY = finalLocate!.bbox.minY + (bestSrcY / spritePng.height) * bboxHeight;

    const decodedFinal = PNG.sync.read(afterExitPng);
    const clickX = box!.x + (canvasClickX / decodedFinal.width) * box!.width;
    const clickY = box!.y + (canvasClickY / decodedFinal.height) * box!.height;
    // eslint-disable-next-line no-console
    console.log("MAPPED_CLICK_POINT", JSON.stringify({ canvasClickX, canvasClickY, clickX, clickY }));

    // eslint-disable-next-line no-console
    console.log(
      "FIXTURE_FISICO",
      JSON.stringify({
        roomId: state.roomId,
        roomName: state.roomName,
        itemId: state.itemId,
        roomItemId: state.roomItemId,
        tileX: placedItem.x,
        tileY: placedItem.y,
        canvasPixel: { x: canvasClickX, y: canvasClickY },
        diffCentroid: finalLocate!.point,
        pagePixel: { x: clickX, y: clickY },
      }),
    );

    // ── 11. Contrato de behavior real, para resolver el estado EFECTIVO con
    //        el mismo paquete que usa el cliente (no una interpretación
    //        propia del test) ─────────────────────────────────────────────
    const behaviorApi = await pwRequest.newContext();
    const behaviorResponse = await behaviorApi.get(`${API_URL}/items/${state.itemId}`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    if (!behaviorResponse.ok()) {
      throw new Error(
        `GET /items/${state.itemId} -> HTTP ${behaviorResponse.status()}: ${await behaviorResponse.text()}`,
      );
    }
    const behaviorItemBody = (await behaviorResponse.json()) as { worldData?: { behavior?: unknown } };
    await behaviorApi.dispose();
    expect(
      behaviorItemBody.worldData?.behavior,
      `GET /items/${state.itemId} no trajo worldData.behavior: ${JSON.stringify(behaviorItemBody).slice(0, 500)}`,
    ).toBeTruthy();
    const behaviorContract = behaviorItemBody.worldData!.behavior as import("@codebuddies/world-objects").WorldBehavior;

    // ── 12. Estabilizar la UI tras salir de Build Mode (el HUD normal
    //        reaparece con su propio fade-in) ANTES de tomar la línea base
    //        del click físico — si no, el "cambio" detectado es el HUD
    //        asentándose, no el objeto. ──────────────────────────────────
    await adminPage.waitForTimeout(1500);
    await dismissUnrelatedErrorDialog();
    const beforeClickPng = await canvas.screenshot();
    fs.writeFileSync("test-results/build-5-before-click.png", beforeClickPng);

    // ── 13. CLICK FÍSICO REAL sobre el sprite ya visible, en GAME MODE
    //        (fuera de Build Mode desde el paso 9) — Playwright mouse →
    //        canvas → Phaser hit test → RoomItemsManager → Socket.IO →
    //        servidor → broadcast. Ningún atajo participa acá. ────────────
    await adminPage.mouse.click(clickX, clickY);
    await adminPage.waitForTimeout(700);
    const afterClickPng = await canvas.screenshot();
    fs.writeFileSync("test-results/build-6-after-click-1.png", afterClickPng);

    const visualChange1 = locateLargestChange(beforeClickPng, afterClickPng);
    // eslint-disable-next-line no-console
    console.log("VISUAL_CHANGE_CLICK_1", JSON.stringify(visualChange1));

    // Diagnóstico: ¿el click abrió el popover de selección (Mover/Rotar/
    // Recoger/Duplicar/Copiar, o el mensaje "sin permisos") en vez de
    // interactuar? Eso confirmaría que el click SÍ dio en el sprite
    // (pixel-perfect) pero `canInteractByClick()` decidió "seleccionar" en
    // vez de "interactuar" — con CUALQUIER contenido del popover, no sólo
    // Mover/Rotar/Recoger (que están ocultos si faltan permisos).
    const contextMenuVisible = await adminPage
      .getByText(/Mover|Rotar|Recoger|Duplicar|Copiar|permisos/i)
      .first()
      .isVisible()
      .catch(() => false);
    // eslint-disable-next-line no-console
    console.log("CONTEXT_MENU_OPENED_AFTER_CLICK", contextMenuVisible);
    // Se guarda SIEMPRE (no sólo si el chequeo de arriba dio positivo) para
    // poder inspeccionar visualmente qué pasó de verdad tras el click.
    const fullPageAfterClick1 = await adminPage.screenshot({ fullPage: false });
    fs.writeFileSync("test-results/build-6b-fullpage-after-click.png", fullPageAfterClick1);
    if (contextMenuVisible) {
      // Cierra el popover para no ensuciar el segundo click.
      await adminPage.keyboard.press("Escape").catch(() => {});
    }

    const itemAfterClick1 = await fetchPlacedItemFromDb();
    expect(itemAfterClick1, "no se pudo releer el RoomItem clickeado por base de datos").toBeTruthy();
    const persisted1 = worldObjects.readPersistedState(itemAfterClick1.state);
    const effective1 = worldObjects.effectiveStateKey(behaviorContract, persisted1, Date.now());
    // eslint-disable-next-line no-console
    console.log("STATE_AFTER_CLICK_1", JSON.stringify({ persisted: persisted1, effective: effective1 }));
    expect(effective1).toBe("ON");

    // ── 14. Segundo click (turn_off) — se espera a que termine turn_on
    //        (2 frames / 12fps ≈ 167ms) para no chocar con la protección
    //        anti-spam (isTransitionInFlight). ──────────────────────────
    await adminPage.waitForTimeout(400);
    await dismissUnrelatedErrorDialog();
    const beforeClick2Png = await canvas.screenshot();
    await adminPage.mouse.click(clickX, clickY);
    await adminPage.waitForTimeout(700);
    const afterClick2Png = await canvas.screenshot();
    fs.writeFileSync("test-results/build-7-after-click-2.png", afterClick2Png);

    const visualChange2 = locateLargestChange(beforeClick2Png, afterClick2Png);
    // eslint-disable-next-line no-console
    console.log("VISUAL_CHANGE_CLICK_2", JSON.stringify(visualChange2));

    const itemAfterClick2 = await fetchPlacedItemFromDb();
    const persisted2 = worldObjects.readPersistedState(itemAfterClick2.state);
    const effective2 = worldObjects.effectiveStateKey(behaviorContract, persisted2, Date.now());
    // eslint-disable-next-line no-console
    console.log("STATE_AFTER_CLICK_2", JSON.stringify({ persisted: persisted2, effective: effective2 }));
    expect(effective2).toBe("OFF");

    await diagPrisma.$disconnect();
  });
});
