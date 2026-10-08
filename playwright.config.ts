import { defineConfig, devices } from "@playwright/test";

/**
 * Suite de navegador real (Fase 11).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ PRUEBA Y QUÉ NO
 *
 * Esto NO reemplaza a los tests unitarios: la lógica del contrato, la máquina
 * de estados y el editor ya están cubiertos por Jest (API 314 · web 202 ·
 * game 101 · world-objects 138) sin navegador y sin servicios. Lo que sólo se
 * puede comprobar acá es lo que pasa cuando todo eso corre de verdad: que la
 * página pinta, que el sprite se ve, que el click llega al servidor, que dos
 * navegadores ven lo mismo.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SERVICIOS REALES, NO MOCKS
 *
 * Los tests asumen web (3000), API (3001), game (3002) y Postgres levantados
 * con los scripts del repo. No se arrancan desde acá con `webServer` a
 * propósito: `nest start --watch` y `next dev` tardan minutos en la primera
 * compilación y reiniciarlos en cada corrida haría la suite inusable. Si algo
 * no está arriba, el primer test lo dice con un mensaje claro en vez de fallar
 * por timeout.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * UN SOLO WORKER
 *
 * Los tests comparten la base de datos real: dos workers creando y publicando
 * items a la vez se pisarían. Es una suite de QA, no una suite de velocidad.
 */
export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    // El editor es una pantalla densa; el viewport por defecto de Playwright
    // (1280×720) deja la columna de prueba fuera del breakpoint xl.
    viewport: { width: 1600, height: 1000 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
