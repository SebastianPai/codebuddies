import { request } from "@playwright/test";

import { forgetCleanupIds, readCleanupIds } from "./cleanup";
import { ADMIN_CREDENTIALS, API_URL } from "./fixtures";

/**
 * Borra de la base los items que la suite registró, y sólo esos.
 *
 * Es best-effort a propósito: si un item no se puede borrar (por ejemplo,
 * porque un test lo dejó publicado y hay usuarios que lo tienen), se deja tal
 * cual y se imprime, en vez de forzar nada. El informe de la Fase 11 lista lo
 * que quede.
 */
export default async function globalTeardown(): Promise<void> {
  const ids = readCleanupIds();
  if (ids.length === 0) return;

  const api = await request.newContext();
  const login = await api.post(`${API_URL}/identity/login`, { data: ADMIN_CREDENTIALS });

  if (!login.ok()) {
    console.warn(`[teardown] no se pudo iniciar sesión (${login.status()}): quedan ${ids.length} items de QA`);
    await api.dispose();
    return;
  }

  const { access_token: token } = (await login.json()) as { access_token: string };
  const removed: string[] = [];
  const kept: string[] = [];

  for (const id of ids) {
    const response = await api.delete(`${API_URL}/items/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    (response.ok() || response.status() === 404 ? removed : kept).push(id);
    if (!response.ok() && response.status() !== 404) {
      console.warn(`[teardown] item ${id} no se pudo borrar: HTTP ${response.status()}`);
    }
  }

  forgetCleanupIds(removed);
  console.log(`[teardown] items de QA borrados: ${removed.length}, conservados: ${kept.length}`);
  await api.dispose();
}
