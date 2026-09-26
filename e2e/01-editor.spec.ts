import { test, expect } from "./fixtures";
import { openWorldItemEditor, behaviorSection } from "./helpers";

/**
 * PARTE 5 y 6 — el editor carga de verdad y la plantilla del televisor arma
 * el comportamiento completo.
 *
 * Nada de screenshots como prueba: cada afirmación es un assert sobre el DOM
 * real que pinta Chromium contra la web, la API y Postgres reales.
 */

test.describe("Editor de comportamiento en el navegador", () => {
  test("la página de creación carga con el editor de world object", async ({
    adminPage,
    watchdog,
  }) => {
    await openWorldItemEditor(adminPage);

    const behavior = behaviorSection(adminPage);

    // La sección existe y arranca en "objeto estático" (sin comportamiento).
    await expect(behavior.getByRole("heading", { name: "Comportamiento" })).toBeVisible();
    await expect(
      behavior.getByRole("button", { name: "Objeto estatico" }),
    ).toHaveAttribute("aria-pressed", "true");

    // El editor no es lo único que tiene que estar: el formulario del item
    // también, o estaríamos probando media pantalla.
    await expect(adminPage.getByLabel("Nombre", { exact: true }).first()).toBeVisible();

    expect(watchdog.unexpected()).toEqual([]);
  });

  test("activar el comportamiento deja un estado inicial y guía el paso siguiente", async ({
    adminPage,
  }) => {
    await openWorldItemEditor(adminPage);
    const behavior = behaviorSection(adminPage);

    await behavior.getByRole("button", { name: "Objeto con comportamiento" }).click();

    // createStarterDraft(): un estado IDLE que además es el inicial.
    await expect(behavior.getByRole("heading", { name: "Estados" })).toBeVisible();
    await expect(behavior.locator("input[value='IDLE']")).toBeVisible();
    await expect(behavior.getByText("Es el estado inicial")).toBeVisible();

    // El semáforo dice que falta algo y cuál es el próximo paso.
    await expect(behavior.getByText("Siguiente paso:")).toBeVisible();
    await expect(behavior.getByText("agregá una animación")).toBeVisible();

    // Estados vacíos explicativos en las dos secciones que aún no tienen nada.
    await expect(behavior.getByText(/No hay animaciones todavía/)).toBeVisible();
    await expect(behavior.getByText(/Nada reacciona al click/)).toBeVisible();
  });

  test("la plantilla Televisor arma estados, animaciones y clicks", async ({
    adminPage,
    watchdog,
  }) => {
    await openWorldItemEditor(adminPage);
    const behavior = behaviorSection(adminPage);

    await behavior.getByRole("button", { name: "Objeto con comportamiento" }).click();

    // El resumen de la plantilla se ve ANTES de aplicarla.
    const tvButton = behavior.getByRole("button", { name: /Televisor/ });
    await expect(tvButton).toContainText("2 estados");
    await expect(tvButton).toContainText("4 animaciones");
    await expect(tvButton).toContainText("2 al hacer click");

    await tvButton.click();

    // Estados del TV.
    await expect(behavior.locator("input[value='OFF']")).toBeVisible();
    await expect(behavior.locator("input[value='ON']")).toBeVisible();

    // Animaciones del TV.
    for (const key of ["off", "turn_on", "screen_loop"]) {
      await expect(behavior.locator(`input[value='${key}']`)).toBeVisible();
    }

    // Y lo que pasa al hacer click, contado DOS veces a propósito: en la
    // tarjeta del estado (para no tener que bajar) y en la de la interacción.
    await expect(
      behavior.getByText("Reproduce turn_on y queda en ON.", { exact: true }),
    ).toBeVisible();
    await expect(
      behavior.getByText("Al hacer click en OFF: Reproduce turn_on y queda en ON."),
    ).toBeVisible();

    // El semáforo: válido, pero todavía sin frames subidos.
    await expect(
      behavior.getByText("Se puede guardar, pero todavía no está listo"),
    ).toBeVisible();
    await expect(behavior.getByText("subí los frames de la animación")).toBeVisible();

    expect(watchdog.unexpected()).toEqual([]);
  });

  test("aplicar una plantilla sobre algo ya configurado pide confirmación", async ({
    adminPage,
  }) => {
    await openWorldItemEditor(adminPage);
    const behavior = behaviorSection(adminPage);

    await behavior.getByRole("button", { name: "Objeto con comportamiento" }).click();

    // La primera plantilla NO pregunta: lo único que había era el estado IDLE
    // que crea el propio interruptor (ver describeDisableImpact).
    await behavior.getByRole("button", { name: /Televisor/ }).click();
    await expect(behavior.getByRole("alertdialog")).toHaveCount(0);
    await expect(behavior.locator("input[value='OFF']")).toBeVisible();

    // Ya hay contenido: la segunda plantilla tiene que preguntar.
    await behavior.getByRole("button", { name: /Puerta/ }).click();

    const dialog = behavior.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Reemplaza todo lo que tengas configurado");

    // Cancelar deja el televisor intacto.
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(behavior.locator("input[value='OFF']")).toBeVisible();
    await expect(behavior.locator("input[value='turn_on']")).toBeVisible();
  });
});
