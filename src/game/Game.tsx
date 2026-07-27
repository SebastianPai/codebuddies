"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Phaser from "phaser";

import { gameConfig } from "./config";
import { getCurrentUser, redirectToWebLogin } from "./network/auth";
import { createSocket } from "./network/socket";
import { connectRealtime, disconnectRealtime } from "./network/realtime";
import { audioManager } from "./audio/AudioManager";
import { useAvatar } from "./hooks/useAvatar";

import { useSocket } from "./hooks/useSocket";
import { usePlayerStats } from "./hooks/usePlayerStats";
import { useInventory } from "./hooks/useInventory";

import AvatarStudio from "./components/AvatarStudio/AvatarStudio";
import PCWindow from "./components/PC/PCWindows";

import LeftSidebar from "./components/LeftSidebar/LeftSidebar";
import RightSidebar from "./components/RightSidebar/RightSidebar";
import BottomBar from "./components/BottomBar/BottomBar";

import RoomList from "./components/RoomSystem/RoomList/RoomList";

import Shop from "./components/Shop/Shop";
import MarketplaceWindow from "./components/Marketplace/MarketplaceWindow";
import Inventory from "./components/Inventory/Inventory";
import FurnitureContextMenu from "./components/Furniture/FurnitureContextMenu";
import BuildModePanel from "./components/BuildMode/BuildModePanel";
import GameDialog from "./components/GameDialog/GameDialog";
import FriendsPanel from "./components/Friends/FriendsPanel";
import ChatProvider from "./components/Chat/ChatProvider";
import MessagesPanel from "./components/Chat/MessagesPanel";
import NotificationsPanel from "./components/Notifications/NotificationsPanel";
import NotificationsToastBridge from "./components/Notifications/NotificationsToastBridge";
import {
  GameDialogRequest,
  requestGameConfirm,
  resolveGameDialog,
} from "./utils/dialog";

let gameInstance: Phaser.Game | null = null;
let socketInstance: ReturnType<typeof createSocket> | null = null;

export default function Game() {
  const containerRef = useRef<HTMLDivElement>(null);

  // =========================
  // SOCKET
  // =========================

  const socket = useSocket();

  // =========================
  // PLAYER DATA
  // =========================

  const avatar = useAvatar(socket);

  const stats = usePlayerStats(socket);

  const { inventory } = useInventory(socket);

  // =========================
  // UI STATES
  // =========================

  const [showPC, setShowPC] = useState(false);
  const [showAvatarStudio, setShowAvatarStudio] = useState(false);

  const [showShop, setShowShop] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);

  const [inGame, setInGame] = useState(false);

  const [selectedFurniture, setSelectedFurniture] = useState<any>(null);
  const [buildMode, setBuildMode] = useState(false);
  const [dialog, setDialog] = useState<GameDialogRequest | null>(null);
  const [paintAllProgress, setPaintAllProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [currentRoom, setCurrentRoom] = useState<{
    id: string;
    ownerId?: string;
    background?: { id: string } | null;
  } | null>(null);

  // =========================
  // INIT
  // =========================

  useEffect(() => {
    async function init() {
      const user = await getCurrentUser();

      if (!user) {
        redirectToWebLogin();
        return;
      }

      setCurrentUser(user);

      // =========================
      // AUDIO
      // =========================

      audioManager.init();

      // =========================
      // REALTIME SOCIAL (amigos/mensajes/notificaciones vía SSE)
      // =========================

      connectRealtime();

      // =========================
      // SOCKET GLOBAL
      // =========================

      if (!socketInstance) {
        socketInstance = createSocket();
      }

      (window as any).phaserSocket = socketInstance;

      // =========================
      // PREVENIR DUPLICADO
      // =========================

      if (gameInstance || !containerRef.current) return;

      // =========================
      // PHASER CONFIG
      // =========================

      const config: Phaser.Types.Core.GameConfig = {
        ...gameConfig,

        parent: containerRef.current,

        width: 1920,
        height: 1280,

        backgroundColor: "#111",

        render: {
          pixelArt: true,
          antialias: false,
        },

        scale: {
          mode: Phaser.Scale.NONE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },

        callbacks: {
          postBoot: (game) => {
            (game as any).socket = socketInstance;
            (game as any).user = user;

            // =========================
            // OPEN PC FROM PHASER
            // =========================

            (window as any).openPC = () => {
              setShowPC(true);
            };

            // =========================
            // OPEN SHOP FROM PHASER
            // =========================

            (window as any).openShop = () => {
              openMajorPanel("shop");
            };

            // =========================
            // OPEN INVENTORY
            // =========================

            (window as any).openInventory = () => {
              openMajorPanel("inventory");
            };

            // =========================
            // ROOM JOIN
            // =========================

            socketInstance?.on("room:joined", (data: any) => {
              console.log("🚪 Entrando room:", data);

              setInGame(true);
              setCurrentRoom(data?.room ?? null);
              window.dispatchEvent(new CustomEvent("game:missions:refresh"));
            });

            socketInstance?.on("room:backgroundChanged", (data: any) => {
              setCurrentRoom((prev) =>
                prev ? { ...prev, background: data?.background ?? null } : prev,
              );
            });

          },
        },
      };

      // =========================
      // CREATE GAME
      // =========================

      gameInstance = new Phaser.Game(config);
    }

    init();

    return () => {
      if (gameInstance) {
        gameInstance.destroy(true);

        gameInstance = null;
      }

      disconnectRealtime();
    };
  }, []);

  useEffect(() => {
    const handleDialog = (event: Event) => {
      setDialog((event as CustomEvent<GameDialogRequest>).detail);
    };

    window.addEventListener("game:dialog", handleDialog);

    return () => {
      window.removeEventListener("game:dialog", handleDialog);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("build:mode:set", {
        detail: { active: buildMode },
      }),
    );
  }, [buildMode]);

  useEffect(() => {
    const handleFurnitureSelect = (event: any) => {
      console.log("🪑 Mueble seleccionado", event.detail);

      setSelectedFurniture(event.detail);
    };

    window.addEventListener("room:item:selected", handleFurnitureSelect);

    return () => {
      window.removeEventListener("room:item:selected", handleFurnitureSelect);
    };
  }, []);

  useEffect(() => {
    const handleProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ done: number; total: number }>)
        .detail;
      setPaintAllProgress(detail);
    };

    const handleDone = () => setPaintAllProgress(null);

    const handleError = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      console.warn("No se pudo pintar todo el suelo", detail?.message);
      setPaintAllProgress(null);
    };

    window.addEventListener("build:paint-all:progress", handleProgress);
    window.addEventListener("build:paint-all:done", handleDone);
    window.addEventListener("build:paint-all:error", handleError);

    return () => {
      window.removeEventListener("build:paint-all:progress", handleProgress);
      window.removeEventListener("build:paint-all:done", handleDone);
      window.removeEventListener("build:paint-all:error", handleError);
    };
  }, []);

  // =========================
  // ROOM
  // =========================

  const handleEnterRoom = (roomId: string) => {
    if (!socket || !roomId) return;

    console.log("🔥 ROOM GUARDADO", roomId);

    (window as any).currentRoomId = roomId;
    if (gameInstance) {
      (gameInstance as any).roomId = roomId;
    }

    console.log("🔥 ROOM ACTUAL", (window as any).currentRoomId);

    // 🔥 GUARDAR ROOM ACTUAL
    (window as any).currentRoomId = roomId;

    socket.emit("joinRoom", {
      roomId,
    });
  };

  const handleEquipAvatarItem = (item: any, color?: number) => {
    if (!socket) return;

    console.log("🧢 Equipando:", item);

    socket.emit("avatar:equip", {
      slot: item.avatarData.slot,
      itemId: item.id,
      color,
    });
  };

  const clearCurrentRoom = async () => {
    const roomId =
      (window as any).currentRoomId || (gameInstance as any)?.roomId;

    if (!socket || !roomId) return;

    const confirmed = await requestGameConfirm({
      title: "Limpiar casa",
      message:
        "Se retiraran todos los muebles de la habitacion y volveran al inventario. Esta accion no se puede deshacer.",
      confirmLabel: "Limpiar casa",
      cancelLabel: "Conservar sala",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    socket.emit("room:items:clear", {
      roomId,
    });
  };

  // =========================
  // LEFT SIDEBAR CALLBACKS (estables vía useCallback)
  // =========================
  // LeftSidebar está memoizado con React.memo; si estos handlers se recrearan
  // en cada render de Game (como funciones inline), el memo no serviría de
  // nada porque las props "cambiarían" en cada render igual.

  // Shop/Marketplace/Inventory/AvatarStudio son "paneles mayores": abrir
  // cualquiera de los cuatro cierra a los otros tres (mismo criterio que ya
  // usaba handleOpenBuildMode, extendido a cuando se abren entre sí). Los
  // paneles "utilitarios" (Amigos, Mensajes, Notificaciones, PC) no entran
  // acá — pueden convivir con un panel mayor sin problema.
  const openMajorPanel = useCallback(
    (panel: "shop" | "marketplace" | "inventory" | "avatarStudio") => {
      setShowShop(panel === "shop");
      setShowMarketplace(panel === "marketplace");
      setShowInventory(panel === "inventory");
      setShowAvatarStudio(panel === "avatarStudio");
    },
    [],
  );

  const handleOpenPc = useCallback(() => setShowPC(true), []);
  const handleCustomize = useCallback(() => openMajorPanel("avatarStudio"), [openMajorPanel]);
  const handleOpenFriends = useCallback(() => setShowFriends(true), []);
  const handleOpenMessages = useCallback(() => setShowMessages(true), []);
  const handleOpenNotifications = useCallback(() => setShowNotifications(true), []);
  const handleOpenShop = useCallback(() => openMajorPanel("shop"), [openMajorPanel]);
  const handleOpenMarketplace = useCallback(() => openMajorPanel("marketplace"), [openMajorPanel]);
  const handleOpenBuildMode = useCallback(() => {
    setShowPC(false);
    setShowAvatarStudio(false);
    setShowMarketplace(false);
    setShowInventory(false);
    setSelectedFurniture(null);
    setBuildMode(true);
  }, []);
  const handleExitGame = useCallback(() => setInGame(false), []);

  // =========================
  // RENDER
  // =========================

  return (
    <ChatProvider>
    <div className="game-wrapper">
      {/* ================= GAME ================= */}

      <div ref={containerRef} className="phaser-game-container" />

      {/* ================= UI ================= */}

      {!buildMode && (
        <div className="ui-layer">
        {/* ================= LEFT ================= */}

        <div className="ui-left">
          {currentUser && (
            <LeftSidebar
              username={currentUser.username || "Jugador"}
              level={stats?.level || currentUser.level || 1}
              coins={stats?.coins || currentUser.coins || 0}
              diamonds={stats?.diamonds || currentUser.diamonds || 0}
              onOpenPc={handleOpenPc}
              onCustomize={handleCustomize}
              onOpenFriends={handleOpenFriends}
              onOpenMessages={handleOpenMessages}
              onOpenNotifications={handleOpenNotifications}
              onOpenShop={handleOpenShop}
              onOpenMarketplace={handleOpenMarketplace}
              onOpenBuildMode={handleOpenBuildMode}
              onExitGame={handleExitGame}
            />
          )}
        </div>

        {/* ================= RIGHT ================= */}

        {inGame && (
          <div className="ui-right">
            <RightSidebar />
          </div>
        )}

        {/* ================= BOTTOM ================= */}

        {inGame && (
          <div className="ui-bottom">
            <BottomBar />
          </div>
        )}


      </div>
      )}

      {inGame && buildMode && (
        <BuildModePanel
          socket={socket}
          roomId={currentRoom?.id}
          currentBackgroundId={currentRoom?.background?.id}
          inventory={inventory}
          paintAllProgress={paintAllProgress}
          onExit={() => {
            setBuildMode(false);
            setShowShop(false);
            setShowInventory(false);
            window.dispatchEvent(new CustomEvent("build:item:cancel"));
            window.dispatchEvent(new CustomEvent("build:surface:cancel"));
          }}
          onOpenShop={() => openMajorPanel("shop")}
          onOpenMarketplace={() => openMajorPanel("marketplace")}
          onClearRoom={clearCurrentRoom}
          onPlaceWorldItem={(item) => {
            window.dispatchEvent(
              new CustomEvent("build:item:selected", {
                detail: item,
              }),
            );
          }}
          onPaintSurfaceTexture={(item, width, height) => {
            window.dispatchEvent(
              new CustomEvent("build:surface:selected", {
                detail: {
                  item,
                  width,
                  height,
                },
              }),
            );
          }}
          onPaintAllFloor={() => {
            window.dispatchEvent(new CustomEvent("build:paint-all-floor"));
          }}
          onCancelPainting={() => {
            window.dispatchEvent(new CustomEvent("build:surface:cancel"));
          }}
          onCancelPlacement={() => {
            window.dispatchEvent(new CustomEvent("build:item:cancel"));
          }}
        />
      )}

      {/* ================= ROOM LIST ================= */}

      {!inGame && socket && currentUser && (
        <RoomList socket={socket} onJoinRoom={handleEnterRoom} />
      )}

      {/* ================= PC ================= */}

      {showPC && <PCWindow onClose={() => setShowPC(false)} />}

      {/* ================= SHOP ================= */}

      {showShop && socket && (
        <Shop
          socket={socket}
          inventory={inventory}
          onClose={() => setShowShop(false)}
        />
      )}

      {showMarketplace && (
        <MarketplaceWindow
          socket={socket}
          onClose={() => setShowMarketplace(false)}
        />
      )}

      {/* ================= AMIGOS ================= */}

      {showFriends && <FriendsPanel onClose={() => setShowFriends(false)} />}

      {/* ================= MENSAJES ================= */}

      {showMessages && <MessagesPanel onClose={() => setShowMessages(false)} />}

      {/* ================= NOTIFICACIONES ================= */}

      {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} />}

      {currentUser && <NotificationsToastBridge />}

      {/* ================= INVENTORY ================= */}

      {showInventory && (
        <Inventory
          inventory={inventory}
          onClose={() => setShowInventory(false)}
          onPlaceWorldItem={(item) => {
            console.log("🏠 Modo construcción:", item);

            setShowInventory(false);

            window.dispatchEvent(
              new CustomEvent("build:item:selected", {
                detail: item,
              }),
            );
          }}
          onPaintSurfaceTexture={(item, width, height) => {
            setShowInventory(false);

            window.dispatchEvent(
              new CustomEvent("build:surface:selected", {
                detail: {
                  item,
                  width,
                  height,
                },
              }),
            );
          }}
        />
      )}

      {selectedFurniture && (
        <FurnitureContextMenu
          furniture={selectedFurniture}
          onClose={() => setSelectedFurniture(null)}
        />
      )}

      {/* ================= AVATAR STUDIO ================= */}

      {showAvatarStudio && currentUser && (
        <AvatarStudio
          inventory={inventory}
          avatar={avatar}
          username={currentUser.username}
          onEquipAvatarItem={handleEquipAvatarItem}
          onClose={() => setShowAvatarStudio(false)}
        />
      )}

      {dialog && (
        <GameDialog
          dialog={dialog}
          onClose={(confirmed) => {
            resolveGameDialog(dialog.id, confirmed);
            setDialog(null);
          }}
        />
      )}

      {/* ================= STYLES ================= */}

      <style jsx>{`
        .game-wrapper {
          position: relative;

          width: 100vw;
          height: 100dvh;

          overflow: hidden;

          background: #000;
        }

        .phaser-game-container {
          width: 100%;
          height: 100%;
        }

        /* ================= UI ================= */

        .ui-layer {
          position: absolute;
          inset: 0;

          z-index: 100;

          pointer-events: none;
        }

        /* ================= LEFT ================= */

        .ui-left {
          position: absolute;

          top: 0;
          left: 0;

          pointer-events: auto;

          z-index: 30;
        }

        /* ================= RIGHT ================= */

        .ui-right {
          position: absolute;

          top: 0;
          right: 0;

          height: calc(100dvh - 115px);

          pointer-events: auto;

          z-index: 30;
        }

        /* ================= BOTTOM ================= */

        .ui-bottom {
          position: absolute;

          left: 0;
          right: 0;
          bottom: 0;

          pointer-events: auto;

          z-index: 20;
        }

        /* ================= RESPONSIVE ================= */

        @media (max-width: 1300px) {
          .ui-right {
            display: none;
          }
        }

        @media (max-width: 900px) {
          .ui-left {
            transform: scale(0.9);
            transform-origin: top left;
          }
        }

        @media (max-width: 700px) {
          .ui-left {
            transform: scale(0.82);
          }
        }
      `}</style>
    </div>
    </ChatProvider>
  );
}



