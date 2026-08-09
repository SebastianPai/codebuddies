"use client";

import { useState, useEffect, useRef } from "react";
import { Moon, Sun, X } from "lucide-react";
import { getCurrentUser } from "../../network/auth";
import { apiPatch } from "../../network/http";
import CodeStudio from "../CodeStudio/CodeStudio";
import { useDialogBehavior } from "../shared/useDialogBehavior";
import { useTranslation } from "../../../i18n/useTranslation";
import "./PCWindows.css";

interface PCWindowProps {
  onClose: () => void;
}

export default function PCWindow({ onClose }: PCWindowProps) {
  const t = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  useDialogBehavior(modalRef, onClose);
  const [pcTab, setPcTab] = useState<"desktop" | "codestudio">("desktop");
  // Tema del simulador (escritorio, pestañas y look general de CodeStudio) —
  // guardado en la CUENTA (User.pcTheme, mismo criterio que uiLanguage en
  // LanguageContext.tsx) para que sea el mismo en cualquier navegador/
  // dispositivo. localStorage es solo un cache para pintar rápido antes de
  // que responda /identity/me, no la fuente de verdad.
  const [pcTheme, setPcTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("pcTheme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    const cached = localStorage.getItem("pcTheme") as "dark" | "light" | null;
    void getCurrentUser().then((user) => {
      const remote = user?.pcTheme as "dark" | "light" | undefined;
      if (remote && remote !== cached) {
        setPcTheme(remote);
        localStorage.setItem("pcTheme", remote);
      }
    });
  }, []);

  const toggleTheme = () => {
    setPcTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem("pcTheme", next);
      // Best-effort: si falla, el tema igual queda aplicado en esta pestaña
      // via localStorage, solo no se sincroniza con otros dispositivos hasta
      // el proximo cambio exitoso.
      apiPatch("/identity/profile", { pcTheme: next }).catch(() => {});
      return next;
    });
  };

  // Iconos del escritorio — el único destino real del PC es CodeStudio (el
  // builder heredado de apps con nodos ORDER/PAYMENT/DELIVER se retiró: ver
  // apps/api/src/game/apps y apps/game/src/game/components/AppEditor,
  // eliminados).
  const desktopIcons = [
    { name: "CodeStudio", bgPos: "-24px -48px", action: () => setPcTab("codestudio") },
    { name: t("pc.desktopIconShutdown"), bgPos: "-48px -0px", action: onClose },
  ];

  return (
    <div className="pc-modal" ref={modalRef} role="dialog" aria-modal="true" aria-label={t("pc.osTitle")}>
      <div className="computer-frame" data-pc-theme={pcTheme}>
        <div className="monitor-frame">
          <div className="screen">
            {/* Escritorio */}
            <div className="win11-desktop">
              {pcTab === "desktop" && (
                <div className="desktop-icons">
                  {desktopIcons.map((icon, i) => (
                    <div
                      key={i}
                      className="desktop-icon"
                      onClick={icon.action}
                      title={icon.name}
                    >
                      <div
                        className="icon-image"
                        style={{
                          backgroundImage: `url('/ui/iconos2.png')`,
                          backgroundPosition: icon.bgPos,
                        }}
                      />
                      <div className="icon-label">{icon.name}</div>
                    </div>
                  ))}
                </div>
              )}

              {pcTab === "codestudio" && (
                <div className="pc-content-area">
                  <div className="win11-tabs">
                    <button className="tab active">CodeStudio</button>
                  </div>
                  <CodeStudio />
                </div>
              )}
            </div>

            {/* Barra de tareas */}
            <div className="win11-taskbar">
              <div className="taskbar-center">
                <div
                  className="taskbar-main-icon"
                  onClick={() => setPcTab("desktop")}
                />
              </div>
              <div className="taskbar-right">
                <span className="clock">18:14</span>
                <button
                  className="taskbar-control"
                  onClick={toggleTheme}
                  title={pcTheme === "dark" ? t("pc.lightModeTooltip") : t("pc.darkModeTooltip")}
                >
                  {pcTheme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
                </button>
                <button className="taskbar-control" onClick={onClose} title={t("pc.desktopIconShutdown")}>
                  <X size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
