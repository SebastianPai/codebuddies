import fs from "fs";
import path from "path";

/**
 * Registro de lo que ESTA suite crea, para limpiarlo al terminar.
 *
 * La base de datos es la real de desarrollo (con datos que no son de la QA), así
 * que la limpieza borra únicamente ids que un test registró explícitamente al
 * crearlos — nunca por nombre, por patrón ni "todo lo que empiece por QA".
 * El archivo es JSON plano porque el proceso de los tests y el del
 * `globalTeardown` no comparten memoria.
 */

const FILE = path.join(__dirname, ".qa-created.json");

type Registry = { items: string[] };

function read(): Registry {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf8")) as Partial<Registry>;
    return { items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { items: [] };
  }
}

function write(registry: Registry): void {
  fs.writeFileSync(FILE, JSON.stringify(registry, null, 2));
}

export function registerForCleanup(itemId: string): void {
  const registry = read();
  if (!registry.items.includes(itemId)) registry.items.push(itemId);
  write(registry);
}

export function readCleanupIds(): string[] {
  return read().items;
}

export function forgetCleanupIds(ids: string[]): void {
  const registry = read();
  registry.items = registry.items.filter((id) => !ids.includes(id));
  if (registry.items.length === 0) {
    fs.rmSync(FILE, { force: true });
  } else {
    write(registry);
  }
}
