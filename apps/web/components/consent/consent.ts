"use client";

// Consentimiento de cookies (Google Consent Mode v2).
//
// GTM y AdSense arrancan con todo denegado (ver el snippet "consent
// default" en GoogleTagManager.tsx) hasta que la persona elige en el
// banner. La elección se guarda en localStorage y se reaplica en el <head>
// de cada carga antes de que GTM arranque.

import { CONSENT_STORAGE_KEY, CONSENT_VERSION } from "./consent-snippet";

export { CONSENT_STORAGE_KEY, CONSENT_VERSION };
export const OPEN_CONSENT_EVENT = "codebuddies:open-cookie-settings";

export type ConsentChoice = {
  v: number;
  analytics: boolean;
  ads: boolean;
  at: string;
};

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
    adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number };
  }
}

export function readConsent(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentChoice;
    return parsed?.v === CONSENT_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

// gtag() de Google empuja el objeto `arguments` (no un array): GTM solo
// reconoce los comandos de consentimiento con esa forma.
function gtag(..._args: unknown[]) {
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments as unknown as Record<string, unknown>);
}

export function saveConsent(analytics: boolean, ads: boolean): ConsentChoice {
  const choice: ConsentChoice = {
    v: CONSENT_VERSION,
    analytics,
    ads,
    at: new Date().toISOString(),
  };
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(choice));
  } catch {
    /* modo privado: la elección vale solo para esta visita */
  }

  const ad = ads ? "granted" : "denied";
  gtag("consent", "update", {
    analytics_storage: analytics ? "granted" : "denied",
    ad_storage: ad,
    ad_user_data: ad,
    ad_personalization: ad,
  });
  window.dataLayer?.push({ event: "cookie_consent_update", analytics, ads });

  // AdSense: sin consentimiento de publicidad, solo anuncios no
  // personalizados.
  window.adsbygoogle = window.adsbygoogle || [];
  window.adsbygoogle.requestNonPersonalizedAds = ads ? 0 : 1;

  return choice;
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}
