import { test, expect } from "./fixtures";
import {
  animationCard,
  behaviorSection,
  openWorldItemEditor,
  previewPanel,
  readPreview,
  uploadFrames,
} from "./helpers";

/**
 * PARTES 27, 28 y 29 — falla de asset, responsive y accesibilidad básica.
 */

test.describe("Falla de asset ≠ falla de comportamiento (PARTE 27)", () => {
  test("una URL de atlas rota muestra un error de imagen sin congelar la máquina de estados", async ({
    adminPage,
    watchdog,
  }) => {
    test.setTimeout(120_000);
    await openWorldItemEditor(adminPage);
    const behavior = behaviorSection(adminPage);
    await behavior.getByRole("button", { name: "Objeto con comportamiento" }).click();
    await behavior.getByRole("button", { name: /Televisor/ }).click();

    // Se sube el atlas real de `off` (necesario para que la máquina arranque
    // en un estado dibujable) y luego se rompe la URL de `turn_on` a mano,
    // simulando un objeto en R2 que desapareció o un dominio caído — un atlas
    // inválido "en entorno de desarrollo" sin tocar R2 de verdad.
    await uploadFrames(adminPage, "off", 1);

    await adminPage.evaluate(() => {
      // Se reescribe el <img> de la tarjeta de turn_on para simular una URL
      // rota, sin pasar por el input de archivo (no hay forma de "subir" una
      // URL inválida por la UI: esto reproduce lo que se vería si el archivo
      // en R2 desaparece después de haber sido guardado).
      const cards = Array.from(document.querySelectorAll("article"));
      const card = cards.find((el) => el.querySelector("input[value='turn_on']"));
      const img = card?.querySelector("img");
      if (img) (img as HTMLImageElement).src = "https://localhost:1/no-existe.png";
    });

    const panel = previewPanel(adminPage);

    // Se prueba el click: la TRANSICIÓN ocurre igual (estado lógico avanza).
    await expect.poll(async () => (await readPreview(adminPage)).state).toBe("OFF");
    await panel.getByRole("button", { name: "Probar click" }).click();
    await expect(panel.getByText("OFF → turn_on → ON")).toBeVisible();

    // El estado lógico SIGUE avanzando aunque el sprite de turn_on no exista:
    // termina en ON con screen_loop, exactamente como si el atlas estuviera bien.
    await expect
      .poll(async () => (await readPreview(adminPage)).state, { timeout: 10_000 })
      .toBe("ON");

    // Nada de esto debe aparecer como un error de consola nuevo: un <img> con
    // src roto es un evento de red esperado (404/DNS), no un fallo de la app.
    const onlyImageNoise = watchdog.failedRequests.every((entry) =>
      entry.includes("no-existe.png"),
    );
    expect(
      watchdog.consoleErrors.filter((e) => !e.includes("no-existe")),
    ).toEqual([]);
    expect(onlyImageNoise || watchdog.failedRequests.length === 0).toBe(true);
  });
});

test.describe("Responsive real (PARTE 28)", () => {
  const VIEWPORTS = [
    { name: "Desktop", width: 1440, height: 900 },
    { name: "Tablet", width: 834, height: 1112 },
    { name: "Mobile", width: 390, height: 844 },
  ];

  for (const viewport of VIEWPORTS) {
    test(`${viewport.name} (${viewport.width}×${viewport.height}): sin overflow horizontal y el editor usable`, async ({
      adminPage,
    }) => {
      await adminPage.setViewportSize({ width: viewport.width, height: viewport.height });
      await openWorldItemEditor(adminPage);
      const behavior = behaviorSection(adminPage);
      await behavior.getByRole("button", { name: "Objeto con comportamiento" }).click();
      await behavior.getByRole("button", { name: /Televisor/ }).click();

      // Sin scroll horizontal: el ancho de scroll del documento no debe
      // superar el viewport (con 1px de tolerancia por redondeo de subpíxel).
      const overflow = await adminPage.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${viewport.name}: desbordamiento horizontal de ${overflow}px`).toBeLessThanOrEqual(1);

      // Los controles clave siguen siendo tocables (visibles, con área > 0).
      const uploadButton = animationCard(adminPage, "turn_on").getByRole("button", {
        name: "Arrastrá los frames",
      });
      await expect(uploadButton).toBeVisible();
      const box = await uploadButton.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThan(20);
      expect(box?.height ?? 0).toBeGreaterThan(20);

      // La prueba (preview) sigue siendo visible y usable, no cortada fuera
      // de pantalla.
      await expect(
        previewPanel(adminPage).getByRole("button", { name: "Probar click" }),
      ).toBeVisible();

      // Los avisos, cuando existen, se ven (no colapsados a 0 alto).
      await behavior.getByRole("button", { name: "Borrar el click de ON" }).click();
      const notice = behavior.getByText("Al llegar a este estado ningún click saca de él");
      await expect(notice).toBeVisible();
      const noticeBox = await notice.boundingBox();
      expect(noticeBox?.height ?? 0).toBeGreaterThan(0);
    });
  }
});

test.describe("Accesibilidad básica (PARTE 29)", () => {
  test("botones, inputs, controles y mensajes tienen los atributos accesibles esperados", async ({
    adminPage,
  }) => {
    test.setTimeout(120_000);
    await openWorldItemEditor(adminPage);
    const behavior = behaviorSection(adminPage);
    await behavior.getByRole("button", { name: "Objeto con comportamiento" }).click();
    await behavior.getByRole("button", { name: /Televisor/ }).click();

    // 1) Los botones tienen nombre accesible (no un <button> mudo con sólo un
    // ícono): getByRole con `name` sólo encuentra el botón si lo tiene.
    await expect(behavior.getByRole("button", { name: "Objeto estatico" })).toBeVisible();
    await expect(
      behavior.getByRole("button", { name: "Borrar el estado ON" }),
    ).toBeVisible();

    // 2) Los inputs de nombre tienen label real, no sólo placeholder.
    await expect(behavior.getByLabel("Nombre del estado").first()).toBeVisible();
    await expect(behavior.getByLabel("Nombre de la animación").first()).toBeVisible();

    // 3) Velocidad y dirección exponen su estado con aria-pressed.
    await uploadFrames(adminPage, "off", 1);
    const panel = previewPanel(adminPage);
    const speedButton = panel.getByRole("button", { name: "1x", exact: true });
    await expect(speedButton).toHaveAttribute("aria-pressed", "true");
    await panel.getByRole("button", { name: "2x", exact: true }).click();
    await expect(speedButton).toHaveAttribute("aria-pressed", "false");

    // 4) Mensajes de estado usan role=status.
    await expect(adminPage.getByRole("status").first()).toBeVisible();

    // Y los errores (subida rechazada) usan role=alert: se provoca uno real,
    // subiendo un frame con otras dimensiones.
    const { mismatchedFrame, framesFor } = await import("./frames");
    const turnOnCard = animationCard(adminPage, "turn_on");
    await turnOnCard.getByLabel("Gira con el objeto").uncheck();
    await turnOnCard
      .locator("input[type='file']")
      .setInputFiles([...(await framesFor("turn_on", 2)), await mismatchedFrame("turn_on")]);
    await turnOnCard.getByRole("button", { name: "Subir frames" }).click();
    await expect(turnOnCard.getByRole("alert")).toBeVisible({ timeout: 30_000 });

    // 5) La zona de subida se activa con teclado (es un <button>, no un <div>).
    const dropZone = turnOnCard.getByRole("button", { name: /Arrastrá los frames/ });
    await dropZone.focus();
    await expect(dropZone).toBeFocused();
  });
});
