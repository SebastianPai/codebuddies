"use client";

import { useEffect, useRef } from "react";
import { getCurrentGa4Language } from "../../src/i18n/language-analytics";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

function pushToolEvent(
  event: "tool_used" | "tool_action",
  toolName: string,
  toolCategory: string,
  action?: string,
) {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_GTM_CONTAINER_ID) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    tool_name: toolName,
    tool_category: toolCategory,
    ...(action ? { action } : {}),
    language: getCurrentGa4Language(),
  });
}

// Dispara "tool_used" una sola vez por montaje real de la herramienta -- el
// ref (no un dep externo) es lo que garantiza que nunca se repita, ni
// siquiera si el efecto corriera dos veces seguidas (Strict Mode en
// desarrollo). toolName/toolCategory son constantes por página, así que
// listarlos como deps es solo para conformidad con exhaustive-deps, no
// porque se espere que cambien.
export function useTrackToolUsed(toolName: string, toolCategory: string) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    pushToolEvent("tool_used", toolName, toolCategory);
  }, [toolName, toolCategory]);
}

// Dispara "tool_action" -- se llama a mano, DESPUÉS de confirmar que la
// acción realmente tuvo éxito (ver cada call site: siempre después de un
// await que ya resolvió bien, nunca en el handler de click ni en un catch).
// No es un hook: se invoca de forma imperativa dentro de callbacks async.
export function trackToolAction(toolName: string, toolCategory: string, action: string) {
  pushToolEvent("tool_action", toolName, toolCategory, action);
}

// Variante para acciones cuyo "éxito" ya se resolvió del lado del server
// (ej. una página server component que sólo renderiza este componente hijo
// dentro de la rama de éxito, como /certificates/[certificateId] al
// verificar). Mismo criterio de una-sola-vez-por-montaje que
// useTrackToolUsed.
export function useTrackToolAction(toolName: string, toolCategory: string, action: string) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    pushToolEvent("tool_action", toolName, toolCategory, action);
  }, [toolName, toolCategory, action]);
}

// Tracking educativo específico del ejercicio de código -- eventos propios
// (no tool_used/tool_action) porque cargan un parámetro que esos dos no
// tienen: exercise_id. El dedupe (una vez por ejercicio) vive en el
// componente llamador (useRef reseteado cuando cambia el id del ejercicio),
// no acá -- estas dos funciones son solo el push, igual que trackToolAction.

// Primera edición REAL del usuario en el editor (ver handleChange de
// EditorContent, que Monaco solo dispara por ediciones del usuario, nunca
// por cambios del prop `value` desde afuera -- así nunca se confunde con la
// carga del starterCode o la restauración desde localStorage).
export function trackCodeStarted(exerciseId: string) {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_GTM_CONTAINER_ID) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "code_started",
    tool_name: "code_exercise",
    tool_category: "learning",
    exercise_id: exerciseId,
    language: getCurrentGa4Language(),
  });
}

// Resultado real del envío -- result sale 1:1 de res.correct (el backend,
// nunca del chequeo client-side del iframe). Nunca lleva checkMessage,
// código del usuario ni ningún texto libre.
export function trackCodeResult(exerciseId: string, result: "success" | "failed") {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_GTM_CONTAINER_ID) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "code_result",
    tool_name: "code_exercise",
    tool_category: "learning",
    exercise_id: exerciseId,
    result,
    language: getCurrentGa4Language(),
  });
}
