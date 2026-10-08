import { test, expect, API_URL } from "./fixtures";
import {
  animationCard,
  behaviorSection,
  fillBasicItem,
  openWorldItemEditor,
  previewPanel,
  qaName,
  readPreview,
  saveItem,
  uploadFrames,
} from "./helpers";
import { registerForCleanup } from "./cleanup";

/**
 * PARTES 10, 11 y 12 — guardar desde la UI, recargar, reabrir y proteger los
 * cambios sin guardar.
 *
 * Es una serie: el televisor se crea UNA vez (4 subidas reales a R2) y los
 * tests siguientes lo reabren. Si el primero falla, el resto se salta en vez
 * de fallar por una razón que no es la suya.
 */

test.describe.serial("Guardar, reabrir y cambios sin guardar", () => {
  const state: {
    id: string;
    name: string;
    atlases: Record<string, string>;
  } = { id: "", name: "", atlases: {} };

  test("guardar el televisor desde la UI persiste el comportamiento completo", async ({
    adminPage,
    session,
    watchdog,
  }) => {
    test.setTimeout(240_000);

    state.name = qaName("TV");
    await openWorldItemEditor(adminPage);
    await fillBasicItem(adminPage, state.name);

    const behavior = behaviorSection(adminPage);
    await behavior.getByRole("button", { name: "Objeto con comportamiento" }).click();
    await behavior.getByRole("button", { name: /Televisor/ }).click();

    for (const [key, count] of [
      ["off", 1],
      ["turn_on", 5],
      ["screen_loop", 4],
      ["turn_off", 5],
    ] as Array<[string, number]>) {
      state.atlases[key] = await uploadFrames(adminPage, key, count);
    }

    await expect(behavior.getByText("Listo para publicar")).toBeVisible();

    // ── GUARDAR: la API responde 2xx y ningún alert() del admin aparece ──
    const saved = await saveItem(adminPage);
    expect(saved.dialogs, "el admin reporta sus errores con alert()").toEqual([]);
    expect(saved.id).toBeTruthy();
    state.id = saved.id;
    registerForCleanup(state.id);

    // Tras guardar, el admin vuelve al listado (es su señal de éxito).
    await adminPage.waitForURL(/\/admin\/items\/?$/, { timeout: 30_000 });

    // ── Lo guardado en el backend, leído de la API real ──
    const response = await adminPage.request.get(`${API_URL}/items/${state.id}`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    expect(response.ok()).toBe(true);
    const item = (await response.json()) as {
      worldData?: { behavior?: Record<string, any> | null };
    };

    const saveBehavior = item.worldData?.behavior;
    expect(saveBehavior, "worldData.behavior debe estar persistido").toBeTruthy();
    expect(saveBehavior!.version).toBe(1);
    expect(saveBehavior!.initialState).toBe("OFF");
    expect(saveBehavior!.states.map((s: any) => s.key).sort()).toEqual(["OFF", "ON"]);
    expect(saveBehavior!.animations.map((a: any) => a.key).sort()).toEqual([
      "off",
      "screen_loop",
      "turn_off",
      "turn_on",
    ]);

    // Cada animación quedó con su atlas real (y sólo con propiedades del contrato).
    for (const animation of saveBehavior!.animations) {
      expect(animation.spriteSheetUrl).toBeTruthy();
      expect(new URL(animation.spriteSheetUrl, "http://x").pathname).toBe(
        new URL(state.atlases[animation.key], "http://x").pathname,
      );
      expect(Object.keys(animation).sort()).toEqual(
        [
          "directional",
          "fps",
          "framesCount",
          "key",
          "loop",
          "row",
          "spriteSheetUrl",
          "startCol",
        ].sort(),
      );
    }

    expect(watchdog.unexpected()).toEqual([]);
  });

  test("reabrir: todo sigue ahí y la prueba vuelve a funcionar", async ({ adminPage }) => {
    test.skip(!state.id, "el televisor no se llegó a guardar");
    test.setTimeout(120_000);

    await adminPage.goto(`/admin/items/${state.id}`, { waitUntil: "domcontentloaded" });
    const behavior = behaviorSection(adminPage);
    await expect(behavior.getByRole("heading", { name: "Comportamiento" })).toBeVisible({
      timeout: 60_000,
    });

    // El interruptor está en "con comportamiento", con el semáforo en verde.
    await expect(
      behavior.getByRole("button", { name: "Objeto con comportamiento" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(behavior.getByText("Listo para publicar")).toBeVisible();

    // Estados, animaciones y sus valores exactos.
    await expect(behavior.locator("input[value='OFF']")).toBeVisible();
    await expect(behavior.locator("input[value='ON']")).toBeVisible();

    const loop = animationCard(adminPage, "screen_loop");
    await expect(loop.locator("input[type='number']")).toHaveValue("8");
    await expect(loop.getByLabel("Repetir en bucle")).toBeChecked();
    await expect(loop.getByLabel("Gira con el objeto")).toBeChecked();

    const turnOn = animationCard(adminPage, "turn_on");
    await expect(turnOn.locator("input[type='number']")).toHaveValue("12");
    await expect(turnOn.getByLabel("Repetir en bucle")).not.toBeChecked();

    // Las hojas se dibujan con el atlas guardado (5 frames × 4 caras de 32×48).
    await expect(turnOn.getByText("5×4 · 32×48px")).toBeVisible({ timeout: 30_000 });
    await expect(loop.getByText("4×4 · 32×48px")).toBeVisible();

    // Recién reabierto no hay cambios pendientes que avisar.
    await expect(adminPage.getByText("cambios sin guardar")).toHaveCount(0);

    // Y "Probar click" vuelve a recorrer OFF → turn_on → ON → screen_loop.
    const panel = previewPanel(adminPage);
    await expect.poll(async () => (await readPreview(adminPage)).state).toBe("OFF");
    await panel.getByRole("button", { name: "Probar click" }).click();
    await expect(panel.getByText("OFF → turn_on → ON")).toBeVisible();
    await expect
      .poll(async () => (await readPreview(adminPage)).animation, { timeout: 10_000 })
      .toBe("screen_loop");
  });

  test("cambios sin guardar: el navegador avisa, y cada opción hace lo esperado", async ({
    adminPage,
  }) => {
    test.skip(!state.id, "el televisor no se llegó a guardar");
    test.setTimeout(120_000);

    await adminPage.goto(`/admin/items/${state.id}`, { waitUntil: "domcontentloaded" });
    const behavior = behaviorSection(adminPage);
    await expect(behavior.getByRole("heading", { name: "Comportamiento" })).toBeVisible({
      timeout: 60_000,
    });

    // Recién abierto no hay badge de cambios.
    await expect(
      adminPage.getByText("Tenés cambios sin guardar en el comportamiento del objeto."),
    ).toHaveCount(0);

    // ── Se modifica algo SIN guardar ──
    const fps = animationCard(adminPage, "screen_loop").locator("input[type='number']");
    await fps.fill("20");
    await expect(fps).toHaveValue("20");
    await expect(
      adminPage.getByText("Tenés cambios sin guardar en el comportamiento del objeto."),
    ).toBeVisible();

    // ── Recargar: el navegador pregunta (beforeunload) ──
    //
    // 1) "Seguir editando". Cuando el usuario cancela, la navegación no se
    // completa nunca, así que `reload()` no debe esperarse: se dispara, se
    // responde al diálogo y se comprueba el estado de la página.
    const stayDialog = adminPage.waitForEvent("dialog");
    void adminPage.reload({ waitUntil: "commit" }).catch(() => {
      // Cancelada por el diálogo: es justo lo que se quiere probar.
    });
    const stay = await stayDialog;
    expect(stay.type()).toBe("beforeunload");
    await stay.dismiss();

    // La página sigue siendo la misma, con la edición intacta y el aviso visible.
    await adminPage.waitForTimeout(500);
    await expect(fps).toHaveValue("20");
    await expect(
      adminPage.getByText("Tenés cambios sin guardar en el comportamiento del objeto."),
    ).toBeVisible();

    // 2) "Salir sin guardar": se acepta y la recarga descarta el cambio.
    const leaveDialog = adminPage.waitForEvent("dialog");
    const reloading = adminPage.reload({ waitUntil: "domcontentloaded" });
    const leave = await leaveDialog;
    expect(leave.type()).toBe("beforeunload");
    await leave.accept();
    await reloading;

    await expect(
      behaviorSection(adminPage).getByRole("heading", { name: "Comportamiento" }),
    ).toBeVisible({ timeout: 60_000 });
    // Lo guardado seguía siendo 8 fps: el 20 se descartó de verdad.
    await expect(
      animationCard(adminPage, "screen_loop").locator("input[type='number']"),
    ).toHaveValue("8");
  });

  test("sin cambios, recargar no pregunta nada", async ({ adminPage }) => {
    test.skip(!state.id, "el televisor no se llegó a guardar");

    await adminPage.goto(`/admin/items/${state.id}`, { waitUntil: "domcontentloaded" });
    await expect(
      behaviorSection(adminPage).getByRole("heading", { name: "Comportamiento" }),
    ).toBeVisible({ timeout: 60_000 });

    const dialogs: string[] = [];
    adminPage.on("dialog", (dialog) => {
      dialogs.push(dialog.type());
      void dialog.dismiss();
    });

    await adminPage.reload({ waitUntil: "domcontentloaded" });
    expect(dialogs).toEqual([]);
  });
});
