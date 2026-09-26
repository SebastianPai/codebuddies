"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Cookie, X } from "lucide-react";
import { useTranslation } from "../../src/i18n/useTranslation";
import { OPEN_CONSENT_EVENT, readConsent, saveConsent } from "./consent";

// Banner de consentimiento: tarjeta compacta abajo (no tapa la página ni
// bloquea el scroll). Sale en la primera visita y se reabre desde el link
// "Preferencias de cookies" del footer o de la política de cookies.
export default function CookieBanner() {
  const t = useTranslation();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [detailed, setDetailed] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [ads, setAds] = useState(true);

  useEffect(() => {
    const stored = readConsent();
    if (!stored) {
      // Un respiro para no competir con la carga inicial de la página.
      const timer = window.setTimeout(() => setOpen(true), 800);
      return () => window.clearTimeout(timer);
    }
    setAnalytics(stored.analytics);
    setAds(stored.ads);
  }, []);

  useEffect(() => {
    const reopen = () => {
      const stored = readConsent();
      if (stored) {
        setAnalytics(stored.analytics);
        setAds(stored.ads);
      }
      setDetailed(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  const decide = (nextAnalytics: boolean, nextAds: boolean) => {
    saveConsent(nextAnalytics, nextAds);
    setAnalytics(nextAnalytics);
    setAds(nextAds);
    setOpen(false);
    setDetailed(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-banner-title"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-x-3 bottom-3 z-[9500] mx-auto max-h-[80dvh] max-w-2xl overflow-y-auto rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:bottom-5 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))] sm:flex">
              <Cookie size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h2 id="cookie-banner-title" className="text-base font-black text-[rgb(var(--text))]">
                  {t("site.cookies.title")}
                </h2>
                {readConsent() && (
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={t("site.cookies.close")}
                    className="-mr-1 -mt-1 rounded-lg p-1.5 text-[rgb(var(--secondary-text))] hover:bg-[rgb(var(--border)/0.5)]"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[rgb(var(--secondary-text))] sm:text-sm">
                {t("site.cookies.body")}{" "}
                <Link href="/cookies" className="font-semibold text-[rgb(var(--primary))] underline underline-offset-2">
                  {t("site.cookies.policyLink")}
                </Link>
                {!detailed && (
                  <>
                    {" · "}
                    <button
                      type="button"
                      onClick={() => setDetailed(true)}
                      className="font-semibold text-[rgb(var(--text))] underline underline-offset-2"
                    >
                      {t("site.cookies.customize")}
                    </button>
                  </>
                )}
              </p>

              {detailed && (
                <ul className="mt-3 space-y-2">
                  <ConsentRow
                    title={t("site.cookies.necessaryTitle")}
                    body={t("site.cookies.necessaryBody")}
                    checked
                    disabled
                    badge={t("site.cookies.alwaysOn")}
                  />
                  <ConsentRow
                    title={t("site.cookies.analyticsTitle")}
                    body={t("site.cookies.analyticsBody")}
                    checked={analytics}
                    onChange={setAnalytics}
                  />
                  <ConsentRow
                    title={t("site.cookies.adsTitle")}
                    body={t("site.cookies.adsBody")}
                    checked={ads}
                    onChange={setAds}
                  />
                </ul>
              )}

              {detailed && (
                <button
                  type="button"
                  onClick={() => decide(analytics, ads)}
                  className="mt-3 w-full rounded-xl border border-[rgb(var(--border))] px-4 py-2.5 text-sm font-bold text-[rgb(var(--text))] transition hover:border-[rgb(var(--primary)/0.6)] sm:w-auto"
                >
                  {t("site.cookies.save")}
                </button>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                {/* Rechazar y aceptar con el mismo peso visual: así lo pide
                    el RGPD (no se puede empujar a aceptar). */}
                <button
                  type="button"
                  onClick={() => decide(false, false)}
                  className="rounded-xl border border-[rgb(var(--border))] px-3 py-2.5 text-sm font-bold text-[rgb(var(--text))] transition hover:border-[rgb(var(--primary)/0.6)] sm:px-4"
                >
                  {t("site.cookies.rejectAll")}
                </button>
                <button
                  type="button"
                  onClick={() => decide(true, true)}
                  className="rounded-xl bg-[rgb(var(--button))] px-3 py-2.5 text-sm font-black text-[rgb(var(--button-text))] transition hover:brightness-110 sm:px-4"
                >
                  {t("site.cookies.acceptAll")}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ConsentRow({
  title,
  body,
  checked,
  disabled,
  badge,
  onChange,
}: {
  title: string;
  body: string;
  checked: boolean;
  disabled?: boolean;
  badge?: string;
  onChange?: (value: boolean) => void;
}) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-[rgb(var(--text))]">{title}</p>
        <p className="mt-0.5 text-xs text-[rgb(var(--secondary-text))]">{body}</p>
      </div>
      {badge ? (
        <span className="shrink-0 rounded-full bg-[rgb(var(--border)/0.6)] px-2 py-1 text-[10px] font-bold uppercase text-[rgb(var(--secondary-text))]">
          {badge}
        </span>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={title}
          disabled={disabled}
          onClick={() => onChange?.(!checked)}
          className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
            checked ? "bg-[rgb(var(--button))]" : "bg-[rgb(var(--border))]"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              checked ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      )}
    </li>
  );
}
