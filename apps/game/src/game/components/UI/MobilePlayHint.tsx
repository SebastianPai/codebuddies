"use client";

import { useEffect, useState } from "react";
import { Maximize2, RotateCw, Share, X } from "lucide-react";
import { useTranslation } from "../../../i18n/useTranslation";
import "./MobilePlayHint.css";

// Celular: el juego se ve mejor en horizontal y sin la barra del navegador.
// - Vertical: aviso para girar, con botón de pantalla completa (que además
//   intenta fijar la orientación horizontal donde el navegador lo permite).
// - Horizontal sin pantalla completa: botón chico para activarla.
// - iPhone/iPad (Safari no tiene API de pantalla completa): explica cómo
//   agregarlo a la pantalla de inicio, que abre como app sin barra.

const DISMISS_KEY = "cb-rotate-hint-dismissed";

function isTouchPhone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches && Math.min(window.innerWidth, window.innerHeight) < 820;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

async function enterFullscreen() {
  try {
    const root = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
    if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: "hide" });
    else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await orientation?.lock?.("landscape").catch(() => {});
  } catch {
    // Algunos navegadores lo niegan: el juego sigue igual.
  }
}

export default function MobilePlayHint() {
  const t = useTranslation();
  const [phone, setPhone] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);

  useEffect(() => {
    const update = () => {
      setPhone(isTouchPhone());
      setPortrait(window.innerHeight > window.innerWidth);
      setFullscreen(!!document.fullscreenElement || isStandalone());
    };
    update();
    try {
      setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      // sin storage: el aviso puede volver a salir
    }
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    document.addEventListener("fullscreenchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      document.removeEventListener("fullscreenchange", update);
    };
  }, []);

  if (!phone) return null;
  const ios = isIOS();
  const canFullscreen = !ios && !fullscreen;

  const goFullscreen = () => {
    if (ios) setShowIosTip(true);
    else void enterFullscreen();
  };

  if (portrait && !dismissed) {
    return (
      <div className="cb-rotate" role="dialog" aria-modal="true" aria-label={t("hud.mobile.rotateTitle")}>
        <div className="cb-rotate-card">
          <span className="cb-rotate-icon" aria-hidden>
            <RotateCw size={34} />
          </span>
          <h2>{t("hud.mobile.rotateTitle")}</h2>
          <p>{t("hud.mobile.rotateText")}</p>
          {showIosTip && (
            <p className="cb-rotate-tip">
              <Share size={15} /> {t("hud.mobile.iosTip")}
            </p>
          )}
          <div className="cb-rotate-actions">
            {!fullscreen && (
              <button type="button" className="cb-rotate-primary" onClick={goFullscreen}>
                <Maximize2 size={16} /> {t("hud.mobile.fullscreen")}
              </button>
            )}
            <button
              type="button"
              className="cb-rotate-ghost"
              onClick={() => {
                setDismissed(true);
                try {
                  window.sessionStorage.setItem(DISMISS_KEY, "1");
                } catch {
                  // sin storage
                }
              }}
            >
              {t("hud.mobile.stayPortrait")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!fullscreen && (canFullscreen || ios)) {
    return (
      <>
        <button type="button" className="cb-fullscreen-btn" onClick={goFullscreen} aria-label={t("hud.mobile.fullscreen")} title={t("hud.mobile.fullscreen")}>
          <Maximize2 size={18} />
        </button>
        {showIosTip && (
          <div className="cb-ios-tip" role="status">
            <Share size={15} />
            <span>{t("hud.mobile.iosTip")}</span>
            <button type="button" onClick={() => setShowIosTip(false)} aria-label={t("common.close")}>
              <X size={14} />
            </button>
          </div>
        )}
      </>
    );
  }
  return null;
}
