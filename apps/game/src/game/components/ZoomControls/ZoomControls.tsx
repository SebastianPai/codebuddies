"use client";

import { memo, useEffect, useState } from "react";
import { Eye, EyeOff, Maximize, Minimize, Minus, Plus } from "lucide-react";
import { readInteriorView, setInteriorView } from "../../systems/interiorView";
import "./ZoomControls.css";
import { useTranslation } from "../../../i18n/useTranslation";

// Los botones -/+ solo reenvían los mismos eventos que ya escuchaba la
// rueda del mouse en LobbyScene (ver stepZoom) — no hay lógica de zoom
// nueva acá, solo otra forma de disparar la misma acción para quien no usa
// mouse con rueda (touch, trackpad).
function ZoomControls() {
  const t = useTranslation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [interior, setInterior] = useState(readInteriorView);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen().catch(() => {
        // Algunos navegadores/iframes bloquean el pedido — no es crítico,
        // el juego sigue jugable en la ventana normal.
      });
    }
  };

  return (
    <div className="zoom-controls">
      {/* Modo tipo Los Sims: paredes de adelante (3+ cubos) en fantasma. */}
      <button
        type="button"
        className={`zoom-btn ${interior ? "zoom-btn-active" : ""}`}
        aria-pressed={interior}
        aria-label={interior ? t("hud.zoom.interiorOff") : t("hud.zoom.interiorOn")}
        title={interior ? t("hud.zoom.interiorOff") : t("hud.zoom.interiorOn")}
        onClick={() => {
          const next = !interior;
          setInterior(next);
          setInteriorView(next);
        }}
      >
        {interior ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
      <button
        type="button"
        className="zoom-btn"
        aria-label={t("hud.zoom.out")}
        title={t("hud.zoom.out")}
        onClick={() => window.dispatchEvent(new CustomEvent("camera:zoom:out"))}
      >
        <Minus size={16} />
      </button>
      <button
        type="button"
        className="zoom-btn"
        aria-label={isFullscreen ? t("hud.zoom.exitFullscreen") : t("hud.zoom.fullscreen")}
        title={isFullscreen ? t("hud.zoom.exitFullscreen") : t("hud.zoom.fullscreen")}
        onClick={toggleFullscreen}
      >
        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
      </button>
      <button
        type="button"
        className="zoom-btn"
        aria-label={t("hud.zoom.in")}
        title={t("hud.zoom.in")}
        onClick={() => window.dispatchEvent(new CustomEvent("camera:zoom:in"))}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

export default memo(ZoomControls);
