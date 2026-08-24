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
import TopBar from "./components/TopBar/TopBar";
import ZoomControls from "./components/ZoomControls/ZoomControls";
import EditWorldPanel from "./components/RoomSystem/EditWorld/EditWorldPanel";
import BottomBar from "./components/BottomBar/BottomBar";

import RoomList from "./components/RoomSystem/RoomList/RoomList";

import Shop from "./components/Shop/Shop";
import MarketplaceWindow from "./components/Marketplace/MarketplaceWindow";
import Inventory from "./components/Inventory/Inventory";
import FurnitureContextMenu from "./components/Furniture/FurnitureContextMenu";
import PlayerQuickMenu from "./components/PlayerQuickMenu/PlayerQuickMenu";
import BuildModePanel from "./components/BuildMode/BuildModePanel";
import GameDialog from "./components/GameDialog/GameDialog";
import FriendsPanel from "./components/Friends/FriendsPanel";
import ChatProvider from "./components/Chat/ChatProvider";
import MessagesPanel from "./components/Chat/MessagesPanel";
import NotificationsPanel from "./components/Notifications/NotificationsPanel";
import NotificationsToastBridge from "./components/Notifications/NotificationsToastBridge";
import SettingsWindow from "./components/Settings/SettingsWindow";
import {
  GameDialogRequest,
  requestGameConfirm,
  resolveGameDialog,
} from "./utils/dialog";
import { useTranslation } from "../i18n/useTranslation";
import { EffectivePermissions, NO_PERMISSIONS } from "./types/permissions";

let gameInstance: Phaser.Game | null = null;
let socketInstance: ReturnType<typeof createSocket> | null = null;

export default function Game() {
  const t = useTranslation();
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
  const [showSettings, setShowSettings] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);

  const [inGame, setInGame] = useState(false);

  const [selectedFurniture, setSelectedFurniture] = useState<any>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<{ username: string; x: number; y: number } | null>(null);
  const [buildMode, setBuildMode] = useState(false);
  const [dialog, setDialog] = useState<GameDialogRequest | null>(null);
  const [paintAllProgress, setPaintAllProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [currentRoom, setCurrentRoom] = useState<{
    id: string;
    name?: string;
    ownerId?: string;
    thumbnailUrl?: string | null;
    background?: { id: string } | null;
  } | null>(null);
  const [myPermissions, setMyPermissions] = useState<EffectivePermissions>(NO_PERMISSIONS);
  const [showEditWorld, setShowEditWorld] = useState(false);
  // Los botones "Información"/"Invitar" de la tarjeta de sala (RightSidebar)
  // abren este mismo panel pero directo en la pestaña que corresponde, en
  // vez de sumar una vista de sala separada que duplicaría los mismos
  // datos que ya vive acá.
  const [editWorldInitialTab, setEditWorldInitialTab] = useState<
    "roomInfo" | "access" | "limits" | "guests" | "permissions" | "stats" | undefined
  >(undefined);

  // =========================
  // INIT
  // =========================

  useEffect(() => {
    // Referencias a los handlers que registra postBoot más abajo, para poder
    // quitarlos en el cleanup de este efecto. Antes no se guardaban, así que
    // cada vez que se recreaba la instancia de Phaser (p. ej. StrictMode en
    // dev: mount → cleanup → mount) se apilaba un "room:joined" y un
    // "room:backgroundChanged" más sobre el mismo socket singleton, que
    // sobrevive a la destrucción/recreación de gameInstance.
    let roomJoinedHandler: ((data: any) => void) | undefined;
    let backgroundChangedHandler: ((data: any) => void) | undefined;

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

        // Ancho/alto y scale.mode (RESIZE) se heredan de gameConfig sin
        // pisarlos acá: antes este objeto forzaba width:1920/height:1280 con
        // scale.mode: NONE, que fija el tamaño del canvas en 1920x1280px
        // reales sin importar la pantalla — en cualquier viewport más chico
        // (la mayoría de laptops, todo móvil) el juego quedaba recortado por
        // el overflow:hidden de .game-wrapper en vez de ajustarse.

        backgroundColor: "#111",

        render: {
          pixelArt: true,
          antialias: false,
        },

        callbacks: {
          postBoot: (game) => {
            (game as any).socket = socketInstance;
            (game as any).user = user;

            // =========================
            // OPEN PC FROM PHASER
            // =========================

            (window as any).openPC = () => {
              audioManager.play("panelOpen");
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

            roomJoinedHandler = (data: any) => {
              setInGame(true);
              setCurrentRoom(data?.room ?? null);
              setMyPermissions(data?.myPermissions ?? NO_PERMISSIONS);
              window.dispatchEvent(new CustomEvent("game:missions:refresh"));
            };
            socketInstance?.on("room:joined", roomJoinedHandler);

            backgroundChangedHandler = (data: any) => {
              setCurrentRoom((prev) =>
                prev ? { ...prev, background: data?.background ?? null } : prev,
              );
            };
            socketInstance?.on("room:backgroundChanged", backgroundChangedHandler);
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

      if (roomJoinedHandler) {
        socketInstance?.off("room:joined", roomJoinedHandler);
      }
      if (backgroundChangedHandler) {
        socketInstance?.off("room:backgroundChanged", backgroundChangedHandler);
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
      setSelectedFurniture(event.detail);
    };

    // Disparado por LobbyScene cuando el clic cae en cualquier otro lado
    // (caminar, piso vacío) — mantiene el menú de React sincronizado con la
    // selección real del mueble en Phaser.
    const handleFurnitureDeselect = () => setSelectedFurniture(null);

    window.addEventListener("room:item:selected", handleFurnitureSelect);
    window.addEventListener("room:item:deselected", handleFurnitureDeselect);

    return () => {
      window.removeEventListener("room:item:selected", handleFurnitureSelect);
      window.removeEventListener("room:item:deselected", handleFurnitureDeselect);
    };
  }, []);

  useEffect(() => {
    const handlePlayerSelect = (event: Event) => {
      const detail = (event as CustomEvent<{ username: string; x: number; y: number }>).detail;
      setSelectedPlayer(detail);
    };

    window.addEventListener("player:selected", handlePlayerSelect);

    return () => {
      window.removeEventListener("player:selected", handlePlayerSelect);
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
      title: t("rooms.clearRoomTitle"),
      message: t("rooms.clearRoomMessage"),
      confirmLabel: t("rooms.clearRoomTitle"),
      cancelLabel: t("rooms.clearRoomKeepLabel"),
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
      audioManager.play("panelOpen");
      setShowShop(panel === "shop");
      setShowMarketplace(panel === "marketplace");
      setShowInventory(panel === "inventory");
      setShowAvatarStudio(panel === "avatarStudio");
    },
    [],
  );

  // "Inicio": vuelve a la vista base del juego cerrando cualquier panel
  // abierto (PC, tienda, marketplace, inventario, avatar) — no toca la sala
  // actual ni desconecta nada, a diferencia de "Salir" (que sí abandona la
  // sala hacia la lista). Los paneles utilitarios (Amigos/Mensajes/
  // Notificaciones/Ajustes) también se cierran para que "Inicio" sea
  // predecible: siempre te deja en el mismo estado limpio.
  const handleGoHome = useCallback(() => {
    setShowPC(false);
    setShowShop(false);
    setShowMarketplace(false);
    setShowInventory(false);
    setShowAvatarStudio(false);
    setShowFriends(false);
    setShowMessages(false);
    setShowNotifications(false);
    setShowSettings(false);
    setShowEditWorld(false);
  }, []);

  const handleOpenPc = useCallback(() => {
    audioManager.play("panelOpen");
    setShowPC(true);
  }, []);
  const handleCustomize = useCallback(() => openMajorPanel("avatarStudio"), [openMajorPanel]);
  const handleOpenFriends = useCallback(() => {
    audioManager.play("panelOpen");
    setShowFriends(true);
  }, []);
  const handleOpenMessages = useCallback(() => {
    audioManager.play("panelOpen");
    setShowMessages(true);
  }, []);
  const handleOpenNotifications = useCallback(() => {
    audioManager.play("panelOpen");
    setShowNotifications(true);
  }, []);
  const handleOpenSettings = useCallback(() => {
    audioManager.play("panelOpen");
    setShowSettings(true);
  }, []);
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
      {/* ================= BOOT LOADING ================= */}
      {/* Antes esto era una pantalla negra pura mientras se resuelve el auth
          inicial y Phaser termina de bootear — sin logo, spinner ni texto de
          progreso. Es lo primero que ve todo jugador nuevo. */}
      {!currentUser && (
        <div className="boot-loading">
          <div className="boot-spinner" aria-hidden="true" />
          <span className="boot-title">CodeBuddies</span>
        </div>
      )}

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
              nameEffectId={currentUser.nameEffectId}
              level={stats?.level || currentUser.level || 1}
              coins={stats?.coins || currentUser.coins || 0}
              diamonds={stats?.diamonds || currentUser.diamonds || 0}
              onGoHome={handleGoHome}
              onOpenPc={handleOpenPc}
              onCustomize={handleCustomize}
              onOpenFriends={handleOpenFriends}
              onOpenMessages={handleOpenMessages}
              onOpenNotifications={handleOpenNotifications}
              onOpenShop={handleOpenShop}
              onOpenMarketplace={handleOpenMarketplace}
              onOpenBuildMode={handleOpenBuildMode}
              onOpenSettings={handleOpenSettings}
              onExitGame={handleExitGame}
            />
          )}
        </div>

        {/* ================= TOP (energía) ================= */}

        {inGame && <TopBar energy={stats?.energy} />}

        {/* ================= RIGHT ================= */}

        {inGame && (
          <div className="ui-right">
            <RightSidebar
              roomName={currentRoom?.name}
              thumbnailUrl={currentRoom?.thumbnailUrl}
              canManageRoom={
                myPermissions.canEditConfig ||
                myPermissions.canManageGuests ||
                myPermissions.canManagePermissions
              }
              canInvite={myPermissions.canManageGuests}
              onOpenEditWorld={() => {
                setEditWorldInitialTab(undefined);
                setShowEditWorld(true);
              }}
              onOpenRoomInfo={() => {
                setEditWorldInitialTab("roomInfo");
                setShowEditWorld(true);
              }}
              onOpenInvite={() => {
                setEditWorldInitialTab("guests");
                setShowEditWorld(true);
              }}
            />
          </div>
        )}

        {/* ================= ZOOM ================= */}

        {inGame && <ZoomControls />}

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
          permissions={myPermissions}
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

      {/* ================= AJUSTES ================= */}

      {showSettings && currentUser && (
        <SettingsWindow
          username={currentUser.username}
          onClose={() => setShowSettings(false)}
          onUsernameChanged={(username) =>
            setCurrentUser((current: any) => (current ? { ...current, username } : current))
          }
        />
      )}

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
          furniture={selectedFurniture.furniture}
          x={selectedFurniture.x}
          y={selectedFurniture.y}
          permissions={myPermissions}
          onClose={() => {
            setSelectedFurniture(null);
            window.dispatchEvent(new CustomEvent("room:item:deselected"));
          }}
        />
      )}

      {selectedPlayer && (
        <PlayerQuickMenu
          username={selectedPlayer.username}
          x={selectedPlayer.x}
          y={selectedPlayer.y}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      {showEditWorld && currentRoom && (
        <EditWorldPanel
          roomId={currentRoom.id}
          permissions={myPermissions}
          initialTab={editWorldInitialTab}
          onClose={() => setShowEditWorld(false)}
        />
      )}

      {/* ================= AVATAR STUDIO ================= */}

      {showAvatarStudio && currentUser && (
        <AvatarStudio
          inventory={inventory}
          avatar={avatar}
          username={currentUser.username}
          nameEffectId={currentUser.nameEffectId}
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

        .boot-loading {
          position: absolute;
          inset: 0;
          z-index: 500;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;

          background: #000;
          color: #f8fafc;
        }

        .boot-title {
          font-family: system-ui, sans-serif;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.04em;
          opacity: 0.9;
        }

        .boot-spinner {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 3px solid rgba(255, 255, 255, 0.15);
          border-top-color: #f8fafc;
          animation: boot-spin 0.8s linear infinite;
        }

        @keyframes boot-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .boot-spinner {
            animation: none;
          }
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

        /* Ya no hay reglas responsive acá: LeftSidebar y RightSidebar
           resuelven su propio colapso en tablet/compact (ver
           useViewportMode + LeftSidebar.css/.collapsed y
           RightSidebar.tsx/.right-sidebar-pill) en vez de que este layer
           las escale o las esconda por completo desde afuera. */
      `}</style>
    </div>
    </ChatProvider>
  );
}



