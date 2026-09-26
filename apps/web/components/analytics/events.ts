"use client";

import { getCurrentGa4Language } from "../../src/i18n/language-analytics";

// Eventos de negocio para GA4 vía GTM. Se usan los nombres "recomendados"
// de GA4 (sign_up, login, begin_checkout, purchase) para que GA4 los
// reconozca solo; en GTM alcanza con una tag "Evento GA4" que use
// {{Event}} como nombre y el trigger "Todos los eventos personalizados".
// El consentimiento (Consent Mode) lo aplica GTM: sin permiso de analítica
// GA4 solo recibe pings anónimos sin cookies.
export type AnalyticsEvent =
  | "sign_up"
  | "login"
  | "begin_checkout"
  | "purchase"
  | "lesson_complete"
  | "exercise_complete";

export function trackEvent(event: AnalyticsEvent, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_GTM_CONTAINER_ID) return;
  window.dataLayer = window.dataLayer || [];
  // GA4 recomienda limpiar `ecommerce` antes de un evento de ecommerce
  // nuevo para que no se mezclen datos del anterior.
  if ("ecommerce" in params) window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({ event, language: getCurrentGa4Language(), ...params });
}
