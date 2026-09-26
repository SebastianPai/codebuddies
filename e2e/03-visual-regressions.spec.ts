import { test, expect } from "./fixtures";
import { animationCard, behaviorSection, openWorldItemEditor, uploadFrames } from "./helpers";

/**
 * Regresiones VISUALES encontradas por la QA de navegador de la Fase 11.
 * Los tests unitarios no dibujan nada: estas sólo se pueden atrapar acá.
 */

test.describe("Regresiones visuales", () => {
  test("la hoja de la animación conserva la proporción real del PNG (no se asume 64×64)", async ({
    adminPage,
  }) => {
    await openWorldItemEditor(adminPage);
    const behavior = behaviorSection(adminPage);
    await behavior.getByRole("button", { name: "Objeto con comportamiento" }).click();
    await behavior.getByRole("button", { name: /Televisor/ }).click();

    // 5 frames × 4 caras de 32×48 → atlas de 160×192 (retratos, no cuadrados).
    await uploadFrames(adminPage, "turn_on", 5);

    const card = animationCard(adminPage, "turn_on");
    const sheet = card.locator("img").first();
    await expect(sheet).toBeVisible();

    const measured = await sheet.evaluate(async (node) => {
      const image = node as HTMLImageElement;
      await image.decode();
      const box = image.getBoundingClientRect();
      return {
        natural: { width: image.naturalWidth, height: image.naturalHeight },
        shown: { width: box.width, height: box.height },
      };
    });

    expect(measured.natural).toEqual({ width: 160, height: 192 });

    // Se muestra a una escala uniforme: el mismo factor en ancho y en alto.
    const scaleX = measured.shown.width / measured.natural.width;
    const scaleY = measured.shown.height / measured.natural.height;
    expect(scaleX).toBeCloseTo(scaleY, 2);

    // Y la leyenda de la hoja dice la celda real, no 64×64.
    await expect(card.getByText("5×4 · 32×48px")).toBeVisible();
    await expect(card.getByText("64×64px")).toHaveCount(0);
  });

  test("un atlas que no casa con su animación se avisa en vez de dibujarse mal", async ({
    adminPage,
  }) => {
    await openWorldItemEditor(adminPage);
    const behavior = behaviorSection(adminPage);
    await behavior.getByRole("button", { name: "Objeto con comportamiento" }).click();
    await behavior.getByRole("button", { name: /Televisor/ }).click();
    await uploadFrames(adminPage, "turn_on", 5);

    // Se le cambian los frames declarados DESPUÉS de subir el arte: el PNG ya
    // no se reparte en 6 columnas (160 px no es divisible por 6).
    const card = animationCard(adminPage, "turn_on");
    await expect(card.locator("img").first()).toBeVisible();

    // La tarjeta no expone framesCount como campo editable (sale del atlas),
    // así que se provoca el desajuste cambiando las caras del objeto: 4 → 2.
    await adminPage.getByRole("button", { name: "2 caras" }).click();

    // Con 2 caras el atlas de 4 filas (192 px) no casa (192/2 = 96 ≠ 48 ni
    // coincide con una sola fila): tiene que avisar, no dibujar una hoja mala.
    const alert = card.getByRole("alert");
    const drewGrid = card.getByText(/×\d · \d+×\d+px/);
    await expect(alert.or(drewGrid).first()).toBeVisible();

    // Lo que no puede pasar es una hoja con la celda equivocada sin avisar.
    if ((await alert.count()) === 0) {
      const legend = await drewGrid.first().innerText();
      // Si se dibujó, la celda declarada tiene que ser una que divida el PNG.
      const match = /(\d+)×(\d+) · (\d+)×(\d+)px/.exec(legend);
      expect(match, `leyenda inesperada: ${legend}`).not.toBeNull();
      const [, cols, rows, width, height] = match!.map(Number);
      expect(cols * width).toBe(160);
      expect(rows * height).toBe(192);
    }
  });
});
