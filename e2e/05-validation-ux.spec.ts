import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import {
  behaviorSection,
  fillBasicItem,
  openWorldItemEditor,
  previewBackgroundPosition,
  previewPanel,
  uploadFrames,
} from "./helpers";

/**
 * PARTES 13, 14, 15 y 9 (direcciones) — validaciones que se ven, borrados que
 * avisan de sus consecuencias, objeto estático inequívoco y las 4 caras.
 *
 * Son pruebas de la interfaz: no necesitan guardar nada, salvo la de
 * direcciones que sube UN atlas real.
 */

async function withTv(page: Page) {
  await openWorldItemEditor(page);
  const behavior = behaviorSection(page);
  await behavior.getByRole("button", { name: "Objeto con comportamiento" }).click();
  await behavior.getByRole("button", { name: /Televisor/ }).click();
  await expect(behavior.locator("input[value='OFF']")).toBeVisible();
  return behavior;
}

/** La tarjeta de un estado o de una animación, por el valor de su input de nombre. */
const card = (page: Page, key: string) =>
  behaviorSection(page)
    .locator("article")
    .filter({ has: page.locator(`input[value='${key}']`) });

test.describe("Validación en la interfaz (PARTE 13)", () => {
  test("una animación sin frames avisa en su propia tarjeta, sin bloquear el guardado", async ({
    adminPage,
  }) => {
    const behavior = await withTv(adminPage);

    await expect(
      card(adminPage, "turn_on").getByText(
        "Todavía no tiene frames subidos: en la sala no se va a ver nada.",
      ),
    ).toBeVisible();

    // Es un aviso, no un error: el semáforo dice "se puede guardar".
    await expect(
      behavior.getByText("Se puede guardar, pero todavía no está listo"),
    ).toBeVisible();
    await expect(behavior.getByText("Hay algo que impide guardar")).toHaveCount(0);
  });

  test("un estado sin animación es válido y el editor lo deja elegir (sin aviso)", async ({
    adminPage,
  }) => {
    const behavior = await withTv(adminPage);

    const on = card(adminPage, "ON");
    await on.locator("select").first().selectOption({ label: "Ninguna" });
    await expect(on.locator("select").first()).toHaveValue("");

    // Por contrato es una pose quieta: no es un error ni impide guardar. El
    // editor NO añade ningún mensaje propio para este caso (ver deudas).
    await expect(behavior.getByText("Hay algo que impide guardar")).toHaveCount(0);
    await expect(on.getByText(/pose|sin animación/i)).toHaveCount(0);
  });

  test("un estado nuevo al que nada lleva avisa de que no se alcanza y de que no tiene salida", async ({
    adminPage,
  }) => {
    const behavior = await withTv(adminPage);

    await behavior.getByRole("button", { name: "Agregar estado" }).click();
    const fresh = card(adminPage, "ESTADO");

    await expect(
      fresh.getByText("No es el estado inicial y nada lleva a él: en la sala nunca se va a ver."),
    ).toBeVisible();
    await expect(
      fresh.getByText("Al llegar a este estado ningún click saca de él"),
    ).toBeVisible();
  });

  test("quitar el click de ON deja a ON como callejón sin salida y lo señala", async ({
    adminPage,
  }) => {
    const behavior = await withTv(adminPage);

    await behavior.getByRole("button", { name: "Borrar el click de ON" }).click();

    await expect(
      card(adminPage, "ON").getByText(
        "Al llegar a este estado ningún click saca de él: el objeto se queda así para siempre.",
      ),
    ).toBeVisible();

    // El semáforo también deja de decir "listo": hay un aviso pendiente antes
    // de poder publicar (el orden exacto del "siguiente paso" con varios
    // pendientes a la vez está cubierto en behavior-guidance.spec.ts).
    await expect(behavior.getByText("Hay algo que impide guardar")).toHaveCount(0);
    await expect(behavior.getByText("Listo para publicar")).toHaveCount(0);
  });

  test("una animación que nadie usa avisa en su tarjeta", async ({ adminPage }) => {
    const behavior = await withTv(adminPage);

    await behavior.getByRole("button", { name: "Agregar animacion" }).click();
    await expect(
      card(adminPage, "animacion").getByText(
        "No la usa ningún estado ni ningún click: no se va a reproducir nunca.",
      ),
    ).toBeVisible();
  });

  test("una transición inválida marca el error en SU tarjeta y no sólo en una lista al final", async ({
    adminPage,
  }) => {
    const behavior = await withTv(adminPage);

    // La primera tarjeta de "Al hacer click" es la que crea la plantilla para
    // OFF (transitions[0]). Se identifica por POSICIÓN, no por su texto: el
    // texto cambia en cuanto se vacía el estado de origen, y un locator de
    // Playwright se reevalúa en cada acción contra el DOM actual.
    const transitionCard = behavior
      .locator("article")
      .filter({ has: adminPage.getByText("Estando en") })
      .first();
    await expect(transitionCard).toContainText("Al hacer click en OFF");

    await transitionCard.locator("select").first().selectOption("");

    // El error aparece DENTRO de esa misma tarjeta…
    await expect(transitionCard.getByText(/transitions\[0\]\.fromState/)).toBeVisible();

    // …y el semáforo avisa de que no se puede guardar y qué hacer.
    await expect(behavior.getByText("Hay algo que impide guardar")).toBeVisible();
    await expect(behavior.getByText("arreglá lo que está marcado en rojo")).toBeVisible();

    // Los errores de una fila NO se repiten en la cabecera general.
    const header = behavior.locator("div.rounded-2xl.border").first();
    await expect(header.getByText(/transitions\[0\]/)).toHaveCount(0);
  });

  test("con el comportamiento inválido, Guardar no envía nada y lista los errores uno por línea", async ({
    adminPage,
  }) => {
    const behavior = await withTv(adminPage);
    await fillBasicItem(adminPage, "QA-F11 invalido");

    const transitionCard = behavior
      .locator("article")
      .filter({ has: adminPage.getByText("Estando en") })
      .first();
    await transitionCard.locator("select").first().selectOption("");

    const posts: string[] = [];
    adminPage.on("request", (request) => {
      if (request.method() === "POST" && /\/items\/?$/.test(new URL(request.url()).pathname)) {
        posts.push(request.url());
      }
    });

    await adminPage.getByRole("button", { name: "Guardar Item" }).click();

    // El bloque de errores del formulario: título + una línea por error.
    const errors = adminPage.locator("form > div").first();
    await expect(errors.getByText("Revisa el comportamiento")).toBeVisible();
    await expect(errors.getByText(/^· .*transitions\[0\]/)).toBeVisible();

    await adminPage.waitForTimeout(800);
    expect(posts, "un comportamiento inválido no debe llegar a la API").toEqual([]);
  });
});

test.describe("Confirmaciones de borrado (PARTE 14)", () => {
  test("borrar un estado explica las interacciones afectadas; cancelar no cambia nada", async ({
    adminPage,
  }) => {
    const behavior = await withTv(adminPage);
    await expect(behavior.getByText("2/16")).toBeVisible();

    await behavior.getByRole("button", { name: "Borrar el estado ON" }).click();

    const dialog = behavior.getByRole("alertdialog");
    await expect(dialog).toContainText("¿Borrar el estado ON?");
    await expect(dialog).toContainText("Se borran también 2 interacción(es) de click.");

    // Cancelar: nada cambió.
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(behavior.getByRole("alertdialog")).toHaveCount(0);
    await expect(behavior.locator("input[value='ON']")).toBeVisible();
    await expect(behavior.getByText("2/16")).toBeVisible();

    // Volver a pedir el borrado y confirmar.
    await behavior.getByRole("button", { name: "Borrar el estado ON" }).click();
    await behavior
      .getByRole("alertdialog")
      .getByRole("button", { name: "Sí, borrar" })
      .click();

    await expect(behavior.locator("input[value='ON']")).toHaveCount(0);
    await expect(behavior.getByText("0/16")).toBeVisible();
  });

  test("borrar una animación en uso explica qué estados se quedan sin ella", async ({
    adminPage,
  }) => {
    const behavior = await withTv(adminPage);

    await behavior.getByRole("button", { name: "Borrar la animación screen_loop" }).click();
    const dialog = behavior.getByRole("alertdialog");
    await expect(dialog).toContainText("¿Borrar la animación screen_loop?");
    await expect(dialog).toContainText("Estos estados se quedan sin animación: ON.");

    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(behavior.locator("input[value='screen_loop']")).toBeVisible();

    await behavior.getByRole("button", { name: "Borrar la animación screen_loop" }).click();
    await behavior
      .getByRole("alertdialog")
      .getByRole("button", { name: "Sí, borrar" })
      .click();

    await expect(behavior.locator("input[value='screen_loop']")).toHaveCount(0);
    // El estado ON sigue existiendo, ahora sin animación.
    await expect(card(adminPage, "ON").locator("select").first()).toHaveValue("");
  });

  test("borrar una animación usada por un click cuenta cuántas interacciones se van", async ({
    adminPage,
  }) => {
    const behavior = await withTv(adminPage);

    await behavior.getByRole("button", { name: "Borrar la animación turn_on" }).click();
    await expect(behavior.getByRole("alertdialog")).toContainText(
      "Se borran también 1 interacción(es) de click.",
    );
  });

  test("volver a estático pide confirmación y dice qué se pierde", async ({ adminPage }) => {
    const behavior = await withTv(adminPage);

    await behavior.getByRole("button", { name: "Objeto estatico" }).click();
    const dialog = behavior.getByRole("alertdialog");
    await expect(dialog).toContainText("¿Volver a objeto estático?");
    await expect(dialog).toContainText(
      "Se van a borrar 2 estado(s), 4 animación(es) y 2 interacción(es).",
    );

    // Cancelar deja todo como estaba.
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(
      behavior.getByRole("button", { name: "Objeto con comportamiento" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(behavior.locator("input[value='OFF']")).toBeVisible();

    // Confirmar lo deja estático.
    await behavior.getByRole("button", { name: "Objeto estatico" }).click();
    await behavior
      .getByRole("alertdialog")
      .getByRole("button", { name: "Sí, dejarlo estático" })
      .click();
    await expect(
      behavior.getByRole("button", { name: "Objeto estatico" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(behavior.locator("input[value='OFF']")).toHaveCount(0);
  });
});

test.describe("Objeto estático (PARTE 15)", () => {
  test("un objeto nuevo es estático de forma inequívoca, sin un editor vacío", async ({
    adminPage,
  }) => {
    await openWorldItemEditor(adminPage);
    const behavior = behaviorSection(adminPage);

    // La etiqueta lo dice…
    await expect(behavior.getByText("Estatico", { exact: true })).toBeVisible();
    // …y el texto explica qué significa y para qué sirve.
    await expect(
      behavior.getByText("El objeto se mostrará siempre igual, sin animaciones ni interacción."),
    ).toBeVisible();
    await expect(behavior.getByText(/Es lo correcto para una mesa, una silla/)).toBeVisible();

    // No hay secciones vacías que confundan.
    await expect(behavior.getByRole("heading", { name: "Estados" })).toHaveCount(0);
    await expect(behavior.getByRole("heading", { name: "Animaciones" })).toHaveCount(0);
    await expect(behavior.getByRole("button", { name: "Probar click" })).toHaveCount(0);
  });
});

test.describe("Direcciones de la prueba (PARTE 9)", () => {
  test("las cuatro caras dibujan filas distintas del atlas y quedan marcadas", async ({
    adminPage,
  }) => {
    test.setTimeout(120_000);
    await withTv(adminPage);

    // `off` es 1 frame × 4 caras: cada cara es una fila distinta.
    await uploadFrames(adminPage, "off", 1);
    const panel = previewPanel(adminPage);

    const yOf = async () => {
      const position = await previewBackgroundPosition(adminPage);
      return parseFloat(position.split(" ")[1]);
    };

    const seen: number[] = [];
    for (const [label, expected] of [
      ["N", 0],
      ["E", 100 / 3],
      ["S", 200 / 3],
      ["O", 100],
    ] as Array<[string, number]>) {
      const button = panel.getByRole("button", { name: label, exact: true });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");

      const y = await yOf();
      expect(y).toBeCloseTo(expected, 0);
      seen.push(y);
    }

    // Cuatro filas distintas: ninguna cara repite el dibujo de otra.
    expect(new Set(seen.map((value) => Math.round(value))).size).toBe(4);
  });
});
