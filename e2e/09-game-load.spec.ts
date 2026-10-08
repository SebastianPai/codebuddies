import { test, expect, GAME_URL } from "./fixtures";

/**
 * PARTE 19/21 — carga real del cliente de juego.
 *
 * Esto confirma que la app de Game arranca con la sesión real, monta el
 * canvas de Phaser y no tira errores — es lo que SÍ se puede verificar sin
 * pixel-matching. Colocar el objeto y hacer click DENTRO del canvas ya se
 * verificó de punta a punta contra el servidor real en
 * `07-multiplayer-protocol.spec.ts` (mismo protocolo que usa este cliente).
 *
 * Lo que esta prueba NO cubre — y que el informe de la Fase 11 marca
 * ⏳ PENDIENTE — es la inspección píxel a píxel del sprite ya colocado
 * (orientación, recorte) y la manipulación del Build Mode con clicks de
 * canvas en coordenadas de mundo: Phaser dibuja en un `<canvas>` sin hooks de
 * accesibilidad, así que Playwright no puede consultar "qué objeto hay en
 * (x,y)" sin instrumentación nueva en el cliente — y esta fase tiene
 * explícitamente prohibido tocar el motor/renderer para conveniencia del test.
 */
test("el cliente de Game carga con sesión real y monta el canvas sin errores", async ({
  adminPage,
  watchdog,
}) => {
  const response = await adminPage.goto(GAME_URL, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBeLessThan(400);

  await expect(adminPage.locator("canvas").first()).toBeVisible({ timeout: 30_000 });

  await adminPage.waitForTimeout(2000);
  await adminPage.screenshot({ path: "test-results/game-loaded.png" });

  expect(watchdog.unexpected()).toEqual([]);
});
