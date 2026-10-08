import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Utilidades compartidas por la suite de navegador.
 *
 * Todo lo que se repite en varios tests vive acá para que cada spec se lea como
 * lo que comprueba y no como una lista de selectores.
 */

/** La sección "Comportamiento" del editor de items. */
export function behaviorSection(page: Page): Locator {
  return page.locator("section").filter({
    has: page.getByRole("heading", { name: "Comportamiento", exact: true }),
  });
}

/** La columna de prueba (preview) dentro de la sección de comportamiento. */
export function previewPanel(page: Page): Locator {
  return behaviorSection(page)
    .locator("div")
    .filter({ has: page.getByText("Prueba", { exact: true }) })
    .last();
}

/**
 * Abre el editor de items de admin en modo "objeto del mundo".
 *
 * El selector de tipo de contenido ya arranca en `world` (getInitialKind), pero
 * se fija explícitamente: si mañana cambia el default, el test tiene que seguir
 * probando lo que dice probar.
 */
export async function openWorldItemEditor(page: Page): Promise<void> {
  const response = await page.goto("/admin/items/create", {
    waitUntil: "domcontentloaded",
  });

  if (!response || response.status() >= 400) {
    throw new Error(
      `No se pudo abrir /admin/items/create (HTTP ${response?.status() ?? "sin respuesta"}). ` +
        "¿Está `pnpm --filter web dev` levantado en http://localhost:3000?",
    );
  }

  // La página es un client component: hay que esperar a que hidrate.
  await expect(page.locator("select").first()).toBeVisible({ timeout: 60_000 });
  await page.locator("select").first().selectOption("world");
  await expect(
    behaviorSection(page).getByRole("heading", { name: "Comportamiento" }),
  ).toBeVisible();
}

/**
 * Lee el estado lógico que muestra la preview.
 *
 * La preview publica estado / animación / frame en un `<dl>`; leerlo de ahí es
 * lo mismo que ve el creador, no un detalle interno.
 */
export async function readPreview(page: Page): Promise<{
  state: string;
  animation: string;
  frame: string | null;
}> {
  const panel = previewPanel(page);
  const rows = panel.locator("dl > div");

  const state = (await rows.nth(0).locator("dd").innerText()).trim();
  const animation = (await rows.nth(1).locator("dd").innerText()).trim();

  const frameRow = rows.nth(2);
  const frame = (await frameRow.count()) > 0
    ? (await frameRow.locator("dd").innerText()).trim()
    : null;

  return { state, animation, frame };
}

/** El fondo (atlas) que la preview está dibujando ahora mismo, o null. */
export async function previewSpriteUrl(page: Page): Promise<string | null> {
  const box = previewPanel(page).locator("[aria-hidden='true']").first();
  const image = await box.evaluate(
    (node) => getComputedStyle(node as HTMLElement).backgroundImage,
  );
  const match = /url\("?([^")]+)"?\)/.exec(image);
  if (!match) return null;
  // El navegador devuelve la URL ya resuelta contra el origen de la página
  // (`http://localhost:3000/objects/…`); se compara por ruta para poder
  // cotejarla con la que devolvió la API, sea relativa o absoluta.
  return new URL(match[1], "http://placeholder").pathname;
}

/** La posición del fondo: es lo que cambia cuando avanza un frame. */
export async function previewBackgroundPosition(page: Page): Promise<string> {
  const box = previewPanel(page).locator("[aria-hidden='true']").first();
  return box.evaluate((node) => getComputedStyle(node as HTMLElement).backgroundPosition);
}

/**
 * La tarjeta de UNA animación, identificada por el valor actual de su input
 * de nombre. Cada tarjeta lleva su propio input de subida (label "Subir
 * frames") y su propia zona de error, así que hace falta acotar el DOM a ella
 * antes de buscar esos elementos — si no, `getByRole("alert")` a nivel de
 * página encontraría el de la primera tarjeta que falle, no necesariamente la
 * que el test está probando.
 */
export function animationCard(page: Page, animationKey: string): Locator {
  return behaviorSection(page)
    .locator("article")
    .filter({ has: page.locator(`input[value='${animationKey}']`) });
}

/**
 * Sube N frames reales para una animación y espera la confirmación de éxito.
 *
 * Devuelve la URL del atlas resultante, leída del propio DOM (el `src` que
 * SpriteSheetPreview usa para dibujarlo) — no un valor inventado a partir de
 * la respuesta HTTP, para que un test que la usa esté leyendo lo mismo que
 * vería el creador.
 */
export async function uploadFrames(
  page: Page,
  animationKey: string,
  count: number,
  directions = 4,
): Promise<string> {
  // Import perezoso: evita que un archivo que sólo lee la preview (sin subir
  // nada) tenga que cargar `sharp`.
  const { framesFor } = await import("./frames");

  const card = animationCard(page, animationKey);
  await card.locator("input[type='file']").setInputFiles(await framesFor(animationKey, count, { directions }));
  await card.getByRole("button", { name: "Subir frames" }).click();

  await expect(card.getByRole("status")).toBeVisible({ timeout: 30_000 });

  const image = card.locator("img").first();
  await expect(image).toBeVisible({ timeout: 10_000 });
  const src = await image.getAttribute("src");
  if (!src) throw new Error(`La animación ${animationKey} no quedó con un atlas visible`);
  return src;
}


// ═══════════════════ crear / guardar / reabrir un item ═══════════════════

/** Nombre reconocible de un item de prueba, para poder limpiarlo después. */
export const QA_PREFIX = "QA-F11";

export function qaName(label: string): string {
  return `${QA_PREFIX} ${label} ${Date.now().toString(36)}`;
}

/**
 * Rellena lo mínimo que exige el editor para poder guardar un world object:
 * nombre, descripción y sprite principal. La categoría, el precio, la huella y
 * el origen ya traen valores por defecto válidos.
 */
export async function fillBasicItem(page: Page, name: string): Promise<void> {
  const { spritePng } = await import("./frames");

  await page.getByLabel("Nombre", { exact: true }).first().fill(name);
  await page.locator("form textarea").first().fill("Objeto creado por la QA de navegador (Fase 11).");

  // El primer <input type=file> del formulario es el del sprite principal; los
  // de la sección de comportamiento vienen después en el DOM.
  await page
    .locator("form input[type='file']")
    .first()
    .setInputFiles(await spritePng(`${name.replace(/\s+/g, "-")}.png`));

  // El editor mide el PNG para fijar el ancho y el alto.
  await expect(page.getByText("64", { exact: false }).first()).toBeVisible();
}

/**
 * Pulsa "Guardar Item" y devuelve el id que la API asignó.
 *
 * El id sale de la respuesta real de `POST /items` (o `PATCH /items/:id`), no
 * de la URL: así se comprueba lo que la API respondió, no un efecto lateral.
 * Cualquier `alert()` (así reporta el admin sus errores) se recoge y hace
 * fallar el guardado con su texto.
 */
export async function saveItem(page: Page): Promise<{ id: string; dialogs: string[] }> {
  const dialogs: string[] = [];
  const onDialog = async (dialog: import("@playwright/test").Dialog) => {
    dialogs.push(`${dialog.type()}: ${dialog.message()}`);
    await dialog.dismiss();
  };
  page.on("dialog", onDialog);

  try {
    const responsePromise = page.waitForResponse(
      (response) =>
        /\/items(\/[^/?]+)?$/.test(new URL(response.url()).pathname) &&
        ["POST", "PATCH"].includes(response.request().method()),
      { timeout: 60_000 },
    );

    await page.getByRole("button", { name: /^Guardar Item$|Guardando/ }).click();
    const response = await responsePromise;

    if (!response.ok()) {
      throw new Error(
        `Guardar falló: HTTP ${response.status()} — ${await response.text()}${
          dialogs.length ? ` — alert: ${dialogs.join(" | ")}` : ""
        }`,
      );
    }

    const body = (await response.json()) as { id?: string };
    const id = body.id ?? new URL(response.url()).pathname.split("/").pop() ?? "";
    return { id, dialogs };
  } finally {
    page.off("dialog", onDialog);
  }
}
