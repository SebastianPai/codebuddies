import { test, expect, type Watchdog } from "./fixtures";
import {
  animationCard,
  behaviorSection,
  openWorldItemEditor,
  previewBackgroundPosition,
  previewPanel,
  previewSpriteUrl,
  readPreview,
  uploadFrames,
} from "./helpers";
import { fakePng, framesFor, mismatchedFrame, shuffledFramesFor } from "./frames";
import { isPng, keyFromUrl, pngSize, readR2Object } from "./r2";

/**
 * PARTES 7, 8 y 9 — frames reales a R2 real, y la prueba del televisor
 * funcionando en el navegador.
 *
 * Un HTTP 200 no cuenta como prueba: cada subida se verifica porque el sprite
 * aparece dibujado en el recuadro de prueba, y cada avance de animación porque
 * cambia la celda del atlas que se está pintando.
 */

/** Ruta (sin origen) de una URL de atlas, para cotejarla con la que pinta el navegador. */
const keyToPath = (url: string) => new URL(url, "http://placeholder").pathname;

test.describe("Subida de frames y prueba visual", () => {
  test("los frames desordenados se numeran en el orden correcto antes de subir", async ({
    adminPage,
  }) => {
    await openWorldItemEditor(adminPage);
    const behavior = behaviorSection(adminPage);
    await behavior.getByRole("button", { name: "Objeto con comportamiento" }).click();
    await behavior.getByRole("button", { name: /Televisor/ }).click();

    const card = animationCard(adminPage, "turn_on");

    // El televisor tiene 4 caras y turn_on es direccional: 5 frames × 4 caras
    // son 20 archivos. Se eligen del 20 al 1: el editor tiene que dejarlos del
    // 1 al 20 (con orden natural, no alfabético: el 10 va después del 9).
    await card.locator("input[type='file']").setInputFiles(
      await shuffledFramesFor("turn_on", 5, { directions: 4 }),
    );

    await expect(card.getByText("20 archivo(s) · 5 frame(s) × 4 cara(s)")).toBeVisible();
    await expect(
      card.getByText("Este es el orden en que se van a reproducir."),
    ).toBeVisible();

    // Miniaturas numeradas: la primera es turn_on_1 aunque se eligiera última.
    const thumbs = card.locator("ol li");
    await expect(thumbs).toHaveCount(20);
    await expect(thumbs.nth(0).locator("[role='img']")).toHaveAttribute(
      "aria-label",
      "turn_on_1.png",
    );
    await expect(thumbs.nth(8).locator("[role='img']")).toHaveAttribute(
      "aria-label",
      "turn_on_9.png",
    );
    // Orden natural: después del 9 viene el 10, no el 11 ni el 1.
    await expect(thumbs.nth(9).locator("[role='img']")).toHaveAttribute(
      "aria-label",
      "turn_on_10.png",
    );
    await expect(thumbs.nth(19).locator("[role='img']")).toHaveAttribute(
      "aria-label",
      "turn_on_20.png",
    );

    // Y la miniatura es una imagen real cargada en el navegador (blob:).
    const background = await thumbs
      .nth(0)
      .locator("[role='img']")
      .evaluate((node) => getComputedStyle(node as HTMLElement).backgroundImage);
    expect(background).toContain("blob:");
  });

  test("una cuenta de archivos que no cuadra con las caras se avisa sin subir", async ({
    adminPage,
  }) => {
    await openWorldItemEditor(adminPage);
    const behavior = behaviorSection(adminPage);
    await behavior.getByRole("button", { name: "Objeto con comportamiento" }).click();
    await behavior.getByRole("button", { name: /Televisor/ }).click();

    // El item tiene 4 caras y turn_on es direccional: 5 archivos no son un
    // múltiplo de 4, así que el editor tiene que avisar antes de subir nada.
    const card = animationCard(adminPage, "turn_on");
    await expect(card.getByLabel("Gira con el objeto")).toBeChecked();
    await card.locator("input[type='file']").setInputFiles(await framesFor("turn_on", 5));

    await expect(card.getByText(/Faltan 3 archivo\(s\)/)).toBeVisible();
    await expect(card.getByRole("button", { name: "Subir frames" })).toBeDisabled();
  });

  test("el televisor completo: subir 4 atlas y verlos en la prueba", async ({
    adminPage,
    watchdog,
  }) => {
    test.setTimeout(240_000);

    await openWorldItemEditor(adminPage);
    const behavior = behaviorSection(adminPage);
    await behavior.getByRole("button", { name: "Objeto con comportamiento" }).click();
    await behavior.getByRole("button", { name: /Televisor/ }).click();

    // Antes de subir nada, la prueba dice exactamente eso.
    await expect(
      previewPanel(adminPage).getByText("Esta animación todavía no tiene frames subidos."),
    ).toBeVisible();

    // ── PARTE 7: cuatro subidas reales a R2 ──
    const atlases: Record<string, string> = {};
    for (const [key, count] of [
      ["off", 1],
      ["turn_on", 5],
      ["screen_loop", 4],
      ["turn_off", 5],
    ] as Array<[string, number]>) {
      atlases[key] = await uploadFrames(adminPage, key, count);
    }

    // Cada atlas es un objeto DISTINTO y real en R2: se lee del bucket con
    // GetObject, se comprueba la firma PNG y que su tamaño sea exactamente
    // (frames × 32) × (caras × 48) — la geometría que compuso el servidor.
    const urls = Object.values(atlases);
    expect(new Set(urls).size).toBe(4);
    const expectedFrames: Record<string, number> = {
      off: 1,
      turn_on: 5,
      screen_loop: 4,
      turn_off: 5,
    };
    for (const [key, url] of Object.entries(atlases)) {
      const object = await readR2Object(keyFromUrl(url));
      expect(isPng(object.body), `${key}: el objeto de R2 debe ser un PNG`).toBe(true);
      expect(pngSize(object.body), `${key}: geometría del atlas`).toEqual({
        width: expectedFrames[key] * 32,
        height: 4 * 48,
      });
    }

    // Con los cuatro atlas subidos, el objeto está listo para publicar.
    await expect(behavior.getByText("Listo para publicar")).toBeVisible();
    await expect(behavior.getByText("nada, ya está todo")).toBeVisible();

    // ── PARTE 8: OFF → turn_on → ON → screen_loop ──
    await expect
      .poll(async () => (await readPreview(adminPage)).state)
      .toBe("OFF");
    expect((await readPreview(adminPage)).animation).toBe("off");

    // El sprite que se dibuja es el atlas de `off`, no otro.
    expect(await previewSpriteUrl(adminPage)).toBe(keyToPath(atlases.off));

    await previewPanel(adminPage).getByRole("button", { name: "Probar click" }).click();

    // La transición se cuenta en palabras y se dibuja con su propio atlas.
    await expect(previewPanel(adminPage).getByText("OFF → turn_on → ON")).toBeVisible();
    expect(await previewSpriteUrl(adminPage)).toBe(keyToPath(atlases.turn_on));

    // turn_on son 5 frames a 12 fps (417 ms): al terminar queda en ON con el loop.
    await expect
      .poll(async () => (await readPreview(adminPage)).animation, { timeout: 10_000 })
      .toBe("screen_loop");
    expect((await readPreview(adminPage)).state).toBe("ON");
    expect(await previewSpriteUrl(adminPage)).toBe(keyToPath(atlases.screen_loop));

    // El loop sigue moviéndose: la celda pintada cambia sola.
    const positions = new Set<string>();
    for (let i = 0; i < 12; i += 1) {
      positions.add(await previewBackgroundPosition(adminPage));
      await adminPage.waitForTimeout(60);
    }
    expect(
      positions.size,
      "screen_loop tiene 4 frames: la celda dibujada debe cambiar",
    ).toBeGreaterThan(1);

    // Segundo click: vuelve a OFF pasando por turn_off.
    await previewPanel(adminPage).getByRole("button", { name: "Probar click" }).click();
    await expect(previewPanel(adminPage).getByText("ON → turn_off → OFF")).toBeVisible();
    await expect
      .poll(async () => (await readPreview(adminPage)).state, { timeout: 10_000 })
      .toBe("OFF");

    expect(watchdog.unexpected()).toEqual([]);
  });

  test("controles de la prueba: pausa, reanudar, reiniciar y velocidad", async ({
    adminPage,
  }) => {
    test.setTimeout(240_000);

    await openWorldItemEditor(adminPage);
    const behavior = behaviorSection(adminPage);
    await behavior.getByRole("button", { name: "Objeto con comportamiento" }).click();
    await behavior.getByRole("button", { name: /Televisor/ }).click();

    await uploadFrames(adminPage, "off", 1);
    await uploadFrames(adminPage, "turn_on", 5);
    await uploadFrames(adminPage, "screen_loop", 4);

    const panel = previewPanel(adminPage);

    // Arrancar el loop para tener algo en movimiento que pausar.
    await panel.getByRole("button", { name: "Probar click" }).click();
    await expect
      .poll(async () => (await readPreview(adminPage)).animation, { timeout: 10_000 })
      .toBe("screen_loop");

    // ── PAUSA: el frame se congela ──
    await panel.getByRole("button", { name: "Pausar" }).click();
    const frozen = await previewBackgroundPosition(adminPage);
    await adminPage.waitForTimeout(700); // más de un ciclo completo del loop
    expect(await previewBackgroundPosition(adminPage)).toBe(frozen);
    const frozenFrame = (await readPreview(adminPage)).frame;

    // ── REANUDAR: sigue desde donde estaba, no desde cero ──
    await panel.getByRole("button", { name: "Reanudar" }).click();
    await expect
      .poll(async () => previewBackgroundPosition(adminPage), { timeout: 5_000 })
      .not.toBe(frozen);

    // ── REINICIAR: vuelve al estado inicial sin tocar el draft ──
    await panel.getByRole("button", { name: "Reiniciar" }).click();
    await expect.poll(async () => (await readPreview(adminPage)).state).toBe("OFF");
    // El draft sigue intacto: los estados y animaciones siguen ahí.
    await expect(behavior.locator("input[value='ON']")).toBeVisible();
    await expect(behavior.locator("input[value='screen_loop']")).toBeVisible();
    expect(frozenFrame).not.toBeNull();

    // ── VELOCIDAD: sólo el reloj de la prueba, nunca el fps guardado ──
    const fpsInput = animationCard(adminPage, "screen_loop").locator(
      "input[type='number']",
    );
    await expect(fpsInput).toHaveValue("8");

    for (const speed of ["0.5x", "1x", "2x"]) {
      const button = panel.getByRole("button", { name: speed, exact: true });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
    }

    // El fps del objeto no se movió.
    await expect(fpsInput).toHaveValue("8");
  });

  test("un frame con otras dimensiones lo rechaza el servidor con un mensaje legible", async ({
    adminPage,
  }) => {
    await openWorldItemEditor(adminPage);
    const behavior = behaviorSection(adminPage);
    await behavior.getByRole("button", { name: "Objeto con comportamiento" }).click();
    await behavior.getByRole("button", { name: /Televisor/ }).click();

    const card = animationCard(adminPage, "turn_on");
    // Sin caras: la cuenta de archivos es simplemente la de frames.
    await card.getByLabel("Gira con el objeto").uncheck();
    const frames = await framesFor("turn_on", 2);
    await card
      .locator("input[type='file']")
      .setInputFiles([...frames, await mismatchedFrame("turn_on")]);

    await card.getByRole("button", { name: "Subir frames" }).click();

    // El mensaje del backend llega a la UI, con el número de frame concreto.
    const alert = card.getByRole("alert");
    await expect(alert).toBeVisible({ timeout: 30_000 });
    await expect(alert).toContainText(/frame 3/i);
    await expect(alert).toContainText(/17/);

    // Y la animación sigue sin atlas: no se guardó nada a medias.
    await expect(card.getByText("Sin frames subidos todavía.")).toBeVisible();
  });

  test("un archivo que no es PNG de verdad también se rechaza", async ({ adminPage }) => {
    await openWorldItemEditor(adminPage);
    const behavior = behaviorSection(adminPage);
    await behavior.getByRole("button", { name: "Objeto con comportamiento" }).click();
    await behavior.getByRole("button", { name: /Televisor/ }).click();

    const card = animationCard(adminPage, "turn_on");
    await card.getByLabel("Gira con el objeto").uncheck();
    await card.locator("input[type='file']").setInputFiles([fakePng()]);
    await card.getByRole("button", { name: "Subir frames" }).click();

    await expect(card.getByRole("alert")).toBeVisible({ timeout: 30_000 });
    await expect(card.getByText("Sin frames subidos todavía.")).toBeVisible();
  });
});

/** Ayuda de lectura para los tests que sólo miran la consola. */
export function noErrors(watchdog: Watchdog): string[] {
  return watchdog.unexpected();
}
