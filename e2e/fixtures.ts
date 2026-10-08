import {
  test as base,
  expect,
  request as pwRequest,
  type Page,
  type BrowserContext,
} from "@playwright/test";
import { serveR2Objects } from "./r2";

/**
 * Sesión de admin y vigilancia de consola/red para toda la suite.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CÓMO SE CONSIGUE LA SESIÓN
 *
 * Con la cuenta de desarrollo que YA crea el seed del repo
 * (`apps/api/prisma/seed.ts`: admin@codebuddies.com / admin123, rol ADMIN).
 * Se pide el token al endpoint real `POST /identity/login` y se siembran las
 * tres claves que guarda `storeAuthSession()` en localStorage.
 *
 * No se toca el sistema de autenticación, no se crean usuarios, no se firman
 * tokens a mano y no hay ningún bypass: si el login real dejara de funcionar,
 * la suite entera se cae, que es exactamente lo que queremos de un QA.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ addInitScript Y NO storageState
 *
 * El token tiene que estar en localStorage ANTES del primer render de cada
 * página, incluidos los reloads que hacen los tests de "guardar y reabrir".
 * `addInitScript` corre en cada documento nuevo del contexto; un storageState
 * grabado se quedaría viejo en cuanto el token expire.
 */

export const ADMIN_CREDENTIALS = {
  email: "admin@codebuddies.com",
  password: "admin123",
};

export const API_URL = "http://localhost:3001";
export const GAME_URL = "http://localhost:3002";

type AuthSession = {
  token: string;
  user: Record<string, unknown> & { userId: string };
};

/** Errores recogidos del navegador durante un test (PARTE 30). */
export type Watchdog = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  /** Todo lo anterior, ya filtrado de ruido conocido. */
  unexpected(): string[];
};

/**
 * Ruido conocido, documentado y ajeno a esta funcionalidad.
 *
 * Cada entrada lleva su motivo. Nada relacionado con behavior/atlas/room-items
 * entra en esta lista: si aparece un error de lo nuestro, el test falla.
 */
const KNOWN_NOISE: Array<{ pattern: RegExp; why: string }> = [
  {
    pattern: /paddle/i,
    why: "Paddle sandbox sin token client-side real en .env (pagos, ajeno a world objects)",
  },
  {
    pattern: /favicon/i,
    why: "favicon ausente en dev",
  },
  {
    pattern: /Download the React DevTools/i,
    why: "aviso informativo de React en dev",
  },
  {
    pattern: /webpack-hmr|_next\/static\/webpack|hot-update/i,
    why: "recarga en caliente de Next en dev",
  },
  {
    // Sólo las precargas RSC (`?_rsc=`) abortadas: el router de Next cancela la
    // precarga de una ruta cuando la navegación la reemplaza (p. ej. el
    // `router.push("/admin/items")` que hace el admin tras guardar). Un
    // ERR_ABORTED en cualquier otra URL SÍ se reporta.
    pattern: /GET [^\s]+\?_rsc=[^\s]* — net::ERR_ABORTED/,
    why: "precarga RSC de Next cancelada por la navegación (no es un fallo de red)",
  },
  {
    // Miniaturas/badges/assets de tema de OTRAS salas reales, servidos desde
    // un bucket de DigitalOcean Spaces sin cabeceras CORS para lectura cruzada
    // (Opaque Response Blocking del navegador). Es un dato preexistente del
    // catálogo de salas de la cuenta de desarrollo, ajeno al sistema de World
    // Objects — no es algo que esta fase deba ni pueda arreglar (tocar la
    // config de CORS del bucket de producción está fuera de alcance).
    pattern: /GET https:\/\/[^\s]+\.(?:digitaloceanspaces\.com)\/[^\s]* — net::ERR_BLOCKED_BY_ORB/,
    why: "miniaturas/badges de otras salas sin CORS en el bucket (preexistente, ajeno a World Objects)",
  },
  {
    // El logo por defecto de un item sin sprite propio: el propio HUD lo
    // pide especulativamente y aborta la carga si el componente se
    // desmonta antes de que llegue — comportamiento normal de React, no un
    // fallo de red real.
    pattern: /GET [^\s]+\/items\/logo\.png — net::ERR_ABORTED/,
    why: "placeholder de item sin sprite, petición cancelada por desmontaje (no es un fallo)",
  },
];

export function isKnownNoise(message: string): boolean {
  return KNOWN_NOISE.some((entry) => entry.pattern.test(message));
}

export function describeKnownNoise(): string[] {
  return KNOWN_NOISE.map((entry) => `${entry.pattern} — ${entry.why}`);
}

async function login(): Promise<AuthSession> {
  // Contexto de request PROPIO, no el fixture `request` (ese es de alcance de
  // test): la sesión se cachea por worker justamente para no necesitar uno
  // nuevo en cada test.
  const api = await pwRequest.newContext();
  try {
    const response = await api.post(`${API_URL}/identity/login`, {
      data: ADMIN_CREDENTIALS,
    });

    if (!response.ok()) {
      throw new Error(
        `El login de la cuenta de prueba falló (HTTP ${response.status()}). ` +
          `¿Está la API en ${API_URL} y corrió el seed (pnpm --filter api exec prisma db seed)?\n` +
          (await response.text()),
      );
    }

    const body = (await response.json()) as {
      access_token: string;
      user: Record<string, unknown> & { userId: string };
    };

    return { token: body.access_token, user: body.user };
  } finally {
    await api.dispose();
  }
}

/** Siembra la sesión en un contexto para que TODA página nueva la tenga. */
export async function seedSession(
  context: BrowserContext,
  session: AuthSession,
): Promise<void> {
  await context.addInitScript(
    ([token, user]: [string, string]) => {
      try {
        localStorage.setItem("token", token);
        localStorage.setItem("userId", JSON.parse(user).userId);
        localStorage.setItem("user", user);
        localStorage.setItem("lang", "es");
      } catch {
        // Un contexto sin acceso a storage no debe tumbar la navegación.
      }
    },
    [session.token, JSON.stringify(session.user)] as [string, string],
  );
}

/** Engancha la vigilancia de consola y red a una página. */
export function watchPage(page: Page): Watchdog {
  const watchdog: Watchdog = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    unexpected() {
      return [
        ...this.consoleErrors.map((m) => `console.error: ${m}`),
        ...this.pageErrors.map((m) => `pageerror: ${m}`),
        ...this.failedRequests.map((m) => `request: ${m}`),
      ].filter((message) => !isKnownNoise(message));
    },
  };

  page.on("console", (message) => {
    if (message.type() === "error") watchdog.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => watchdog.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    watchdog.failedRequests.push(
      `${request.method()} ${request.url()} — ${request.failure()?.errorText ?? "?"}`,
    );
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      watchdog.failedRequests.push(`${response.status()} ${response.url()}`);
    }
  });

  return watchdog;
}

type Fixtures = {
  session: AuthSession;
  adminPage: Page;
  watchdog: Watchdog;
};

export const test = base.extend<Fixtures>({
  // Alcance de WORKER, no de test: `POST /identity/login` tiene un límite real
  // de 5 intentos por minuto (antifuerza bruta, `identity.controller.ts`), y
  // esta suite corre con un único worker. Cachear la sesión es lo que haría
  // cualquier persona probando a mano —iniciar sesión una vez y seguir— y
  // evita que la suite se autobloquee contra su propio límite de seguridad,
  // que además no hay que tocar (no es un bug, es la protección real).
  session: [
    async ({}, use) => {
      await use(await login());
    },
    { scope: "worker" },
  ],

  adminPage: async ({ context, session }, use) => {
    await seedSession(context, session);
    // Ver e2e/r2.ts: sirve /objects/… con los bytes reales del bucket.
    await serveR2Objects(context);
    const page = await context.newPage();
    await use(page);
  },

  watchdog: async ({ adminPage }, use) => {
    await use(watchPage(adminPage));
  },
});

export { expect };
export type { AuthSession };
