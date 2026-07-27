"use client";

import { useState, useEffect, useRef } from "react";
import {
  createApp,
  getMyApps,
  getAppById,
  updateAppLogic,
  publishApp,
} from "../../network/apps";
import AppEditor from "../AppEditor/AppEditor";
import CodeStudio from "../CodeStudio/CodeStudio";
import { showGameAlert } from "../../utils/dialog";
import { useDialogBehavior } from "../shared/useDialogBehavior";
import "./PCWindows.css";

interface App {
  id: string;
  type: "DELIVERY" | "ECOMMERCE" | "SOCIAL";
  status: string;
  activeUsers?: number;
  successRate?: number;
  revenue?: number;
  logic?: any;
}

interface PCWindowProps {
  onClose: () => void;
}

export default function PCWindow({ onClose }: PCWindowProps) {
  const [apps, setApps] = useState<App[]>([]);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  useDialogBehavior(modalRef, onClose);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [minimized, setMinimized] = useState(false);
  const [pcTab, setPcTab] = useState<"desktop" | "list" | "editor" | "stats" | "codestudio">(
    "desktop",
  );

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      const myApps = await getMyApps();
      setApps(myApps);
    } catch (err) {
      console.error("Error cargando apps:", err);
    }
  };

  const handleCreateApp = async (type: "DELIVERY" | "ECOMMERCE" | "SOCIAL") => {
    try {
      const newApp = await createApp(type);
      setApps((prev) => [newApp, ...prev]);
      setSelectedApp(newApp);
      setPcTab("editor");
    } catch (err) {
      void showGameAlert({
        title: "No se pudo crear",
        message: "Revisa tu suscripcion o intenta de nuevo.",
        confirmLabel: "Entendido",
        tone: "danger",
      });
    }
  };

  const handleSelectApp = async (appId: string) => {
    try {
      const app = await getAppById(appId);
      setSelectedApp(app);
      setPcTab("editor");
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseApp = () => {
    setSelectedApp(null);
    setPcTab("list");
  };

  const handleSaveLogic = async (newLogic: any) => {
    if (!selectedApp) return;
    try {
      await updateAppLogic(selectedApp.id, newLogic);
      setSelectedApp((prev) => (prev ? { ...prev, logic: newLogic } : null));
      void showGameAlert({
        title: "Guardado",
        message: "La logica se guardo correctamente.",
        confirmLabel: "Perfecto",
        tone: "success",
      });
    } catch (err) {
      void showGameAlert({
        title: "Error al guardar",
        message: "No se pudo guardar la logica.",
        confirmLabel: "Entendido",
        tone: "danger",
      });
    }
  };

  const handlePublish = async () => {
    if (!selectedApp) return;
    try {
      await publishApp(selectedApp.id);
      void showGameAlert({
        title: "App publicada",
        message: "Tu app fue publicada con exito.",
        confirmLabel: "Genial",
        tone: "success",
      });
      loadApps();
      setPcTab("list");
    } catch (err: any) {
      void showGameAlert({
        title: "Error al publicar",
        message: err.message || "No se pudo publicar la app.",
        confirmLabel: "Entendido",
        tone: "danger",
      });
    }
  };

  // Iconos del escritorio
  const desktopIcons = [
    { name: "Mi PC", bgPos: "0px -48px", action: () => setPcTab("list") },
    { name: "CodeStudio", bgPos: "-24px -48px", action: () => setPcTab("codestudio") },
    {
      name: "Constructor",
      bgPos: "0px 0px",
      action: () => setPcTab("desktop"),
    },
    { name: "Mis Apps", bgPos: "-144px 0", action: () => setPcTab("list") },
    { name: "Apagar", bgPos: "-48px -0px", action: onClose },
  ];

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: position.x,
      top: position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    setPosition({
      x: start.left + event.clientX - start.x,
      y: start.top + event.clientY - start.y,
    });
  };

  const endDrag = () => {
    dragStartRef.current = null;
  };

  if (minimized) {
    return (
      <button className="pc-minimized-pill" onClick={() => setMinimized(false)}>
        <span />
        CodeBuddies PC - restaurar
      </button>
    );
  }

  return (
    <div className="pc-modal" ref={modalRef} role="dialog" aria-modal="true" aria-label="CodeBuddies OS">
      <div
        className="computer-frame"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        <div className="monitor-frame">
          <div className="screen">
            <div
              className="pc-drag-handle"
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <span>CodeBuddies OS</span>
              <div className="pc-window-controls">
                <button onClick={() => setMinimized(true)} title="Minimizar">_</button>
                <button onClick={() => setPosition({ x: 0, y: 0 })} title="Centrar">□</button>
                <button onClick={onClose} title="Apagar">⏻</button>
              </div>
            </div>

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

              {pcTab !== "desktop" && (
                <div className="pc-content-area">
                  <div className="win11-tabs">
                    <button
                      className={`tab ${pcTab === "codestudio" ? "active" : ""}`}
                      onClick={() => setPcTab("codestudio")}
                    >
                      CodeStudio
                    </button>
                    <button
                      className={`tab ${pcTab === "list" ? "active" : ""}`}
                      onClick={() => setPcTab("list")}
                    >
                      📋 Mis Apps
                    </button>
                    <button
                      className={`tab ${pcTab === "editor" ? "active" : ""}`}
                      onClick={() => setPcTab("editor")}
                      disabled={!selectedApp}
                    >
                      ✏️ Editor
                    </button>
                    <button
                      className={`tab ${pcTab === "stats" ? "active" : ""}`}
                      onClick={() => setPcTab("stats")}
                      disabled={!selectedApp}
                    >
                      📊 Estadísticas
                    </button>
                  </div>

                  {pcTab === "list" && (
                    <div className="list-content">
                      <div className="create-buttons">
                        <button
                          onClick={() => handleCreateApp("DELIVERY")}
                          className="win11-btn"
                        >
                          Crear Delivery
                        </button>
                        <button
                          onClick={() => handleCreateApp("ECOMMERCE")}
                          className="win11-btn"
                        >
                          Crear Ecommerce
                        </button>
                        <button
                          onClick={() => handleCreateApp("SOCIAL")}
                          className="win11-btn"
                        >
                          Crear Social
                        </button>
                      </div>

                      <h3>Mis Apps ({apps.length})</h3>
                      <div className="app-list">
                        {apps.length === 0 ? (
                          <p className="empty">
                            No tienes apps aún.
                            <br />
                            Crea una arriba.
                          </p>
                        ) : (
                          apps.map((app) => (
                            <div
                              key={app.id}
                              className="app-item"
                              onClick={() => handleSelectApp(app.id)}
                            >
                              <div
                                className="win11-item-icon"
                                style={{ backgroundPosition: "-24px 0" }}
                              />
                              <div>
                                <strong>{app.type}</strong>
                                <br />
                                <small>Estado: {app.status}</small>
                              </div>
                              <span>{app.activeUsers || 0} usuarios</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {pcTab === "codestudio" && <CodeStudio />}

                  {pcTab === "editor" && selectedApp && (
                    <div className="editor-window">
                      <div className="editor-titlebar">
                        <div className="editor-title">
                          ✏️ Editor - {selectedApp.type}
                        </div>
                        <button
                          className="editor-close"
                          onClick={handleCloseApp}
                        >
                          ✕
                        </button>
                      </div>

                      <div className="editor-content">
                        <AppEditor
                          initialLogic={selectedApp.logic}
                          onSave={handleSaveLogic}
                        />

                        <div className="editor-actions">
                          <button
                            onClick={handlePublish}
                            className="win11-btn success"
                            disabled={selectedApp.status === "PUBLISHED"}
                          >
                            🚀 Publicar App
                          </button>
                          <button
                            onClick={handleCloseApp}
                            className="win11-btn"
                          >
                            ← Cerrar Editor
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {pcTab === "stats" && selectedApp && (
                    <div className="stats-content">
                      <h3>Estadísticas de {selectedApp.type}</h3>
                      <p>
                        Usuarios activos:{" "}
                        <strong>{selectedApp.activeUsers || 0}</strong>
                      </p>
                      <p>
                        Success Rate:{" "}
                        <strong>
                          {((selectedApp.successRate || 0) * 100).toFixed(1)}%
                        </strong>
                      </p>
                      <p>
                        Revenue:{" "}
                        <strong>
                          ${(selectedApp.revenue || 0).toFixed(0)}
                        </strong>
                      </p>
                    </div>
                  )}
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
                <span className="tray">▲</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
