// Enlaces profundos al juego desde la web, p.ej. la página de logros:
//   https://game.codebuddies.tech/?open=codestudio&view=career
// abre el PC directamente en CodeStudio, en la pestaña pedida.
// Los parámetros se leen una sola vez y se quitan de la URL para que
// recargar la página no vuelva a abrir el PC.

export const DEEP_LINK_PARAMS = ["open", "view"] as const;

export type DeepLink = { open: string; view: string | null };

export function takeDeepLink(): DeepLink | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const open = url.searchParams.get("open");
  if (!open) return null;
  const view = url.searchParams.get("view");
  for (const param of DEEP_LINK_PARAMS) url.searchParams.delete(param);
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  return { open, view };
}
