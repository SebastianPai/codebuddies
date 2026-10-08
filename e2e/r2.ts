import fs from "fs";
import path from "path";
import type { BrowserContext } from "@playwright/test";

/**
 * Lectura REAL de R2 para el navegador de la suite.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ EXISTE
 *
 * En este entorno `R2_PUBLIC_URL` está vacío en `apps/api/.env` (y en su
 * `.env.example`): esa URL es un ajuste del dashboard de Cloudflare — dominio
 * propio o subdominio `r2.dev` del bucket — y no se puede deducir del repo.
 * Los `PUT` a R2 funcionan igual (hay credenciales reales), pero la URL que
 * devuelve `R2Storage.upload()` sale como `"" + "/objects/…"`, es decir
 * relativa, y un navegador la resuelve contra `localhost:3000` y recibe 404.
 *
 * Lo que hace este módulo es lo mínimo honesto: interceptar SÓLO las
 * peticiones a `/objects/…` y responderlas con los bytes que están de verdad
 * en el bucket, leídos con `GetObject` y las mismas credenciales que usa la
 * API. El navegador decodifica el PNG real que salió de R2 — no un fixture, no
 * un mock.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ NO DEMUESTRA
 *
 * Que el bucket tenga acceso público configurado y que `R2_PUBLIC_URL` apunte
 * a él. Eso queda como PENDIENTE en el informe: depende de un ajuste de
 * Cloudflare que sólo el dueño de la cuenta puede hacer.
 */

type S3Like = {
  send(command: unknown): Promise<{
    Body?: { transformToByteArray(): Promise<Uint8Array> };
    ContentType?: string;
  }>;
};

let client: S3Like | null = null;
let GetObjectCommand: new (input: { Bucket: string; Key: string }) => unknown;

/** Lee `apps/api/.env` sin depender de dotenv: sólo pares CLAVE=VALOR. */
function readApiEnv(): Record<string, string> {
  const file = path.join(__dirname, "..", "apps", "api", ".env");
  const values: Record<string, string> = {};

  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }

  return values;
}

function getClient(): { s3: S3Like; bucket: string } {
  const env = readApiEnv();
  const bucket = env.R2_BUCKET;

  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !bucket) {
    throw new Error("Faltan credenciales de R2 en apps/api/.env: no se puede leer el bucket.");
  }

  if (!client) {
    // El SDK es dependencia de apps/api, no del monorepo raíz.
    const sdk = require(
      require.resolve("@aws-sdk/client-s3", {
        paths: [path.join(__dirname, "..", "apps", "api")],
      }),
    );
    GetObjectCommand = sdk.GetObjectCommand;
    client = new sdk.S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    }) as S3Like;
  }

  return { s3: client as S3Like, bucket };
}

const cache = new Map<string, { body: Buffer; contentType: string }>();

/** Los bytes de un objeto de R2, o lanza si no está. */
export async function readR2Object(
  key: string,
): Promise<{ body: Buffer; contentType: string }> {
  const cached = cache.get(key);
  if (cached) return cached;

  const { s3, bucket } = getClient();
  const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!result.Body) throw new Error(`R2 devolvió un objeto vacío para ${key}`);

  const entry = {
    body: Buffer.from(await result.Body.transformToByteArray()),
    contentType: result.ContentType ?? "image/png",
  };
  cache.set(key, entry);
  return entry;
}

/** ¿Es un PNG de verdad? (firma de 8 bytes) */
export function isPng(buffer: Buffer): boolean {
  return (
    buffer.length > 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  );
}

/** Ancho y alto de un PNG, leídos de su cabecera IHDR. */
export function pngSize(buffer: Buffer): { width: number; height: number } {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** Clave de bucket a partir de la URL relativa que devuelve la API. */
export function keyFromUrl(url: string): string {
  return new URL(url, "http://placeholder").pathname.replace(/^\//, "");
}

/**
 * Sirve `/objects/…` desde R2 a todas las páginas del contexto (web y game).
 *
 * Sólo intercepta rutas que empiezan por `/objects/` en los orígenes locales;
 * todo lo demás pasa intacto. Si el objeto no está en R2 responde 404 con el
 * motivo, para que un sprite ausente se vea como lo que es.
 */
export async function serveR2Objects(context: BrowserContext): Promise<void> {
  await context.route(
    (url) =>
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      url.pathname.startsWith("/objects/"),
    async (route) => {
      const key = decodeURIComponent(new URL(route.request().url()).pathname.slice(1));
      try {
        const object = await readR2Object(key);
        await route.fulfill({
          status: 200,
          contentType: object.contentType,
          body: object.body,
          headers: {
            "access-control-allow-origin": "*",
            "cache-control": "no-store",
          },
        });
      } catch (error) {
        await route.fulfill({
          status: 404,
          contentType: "text/plain",
          body: `R2: ${key} no está en el bucket (${error instanceof Error ? error.message : error})`,
        });
      }
    },
  );
}
