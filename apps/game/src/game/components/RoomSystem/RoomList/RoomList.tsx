"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";

import Draggable from "react-draggable";
import { DoorOpen, Search } from "lucide-react";

import RoomCard from "./RoomCard";
import RoomCreateModal from "../RoomCreate/RoomCreateModal";
import RoomDetailsModal from "../RoomDetails/RoomDetailsModal";

import { Room } from "../../../types/room";

import styles from "./RoomList.module.css";
import { showGameAlert } from "../../../utils/dialog";
import { useThemeAsset } from "../../../network/themeAssets";
import { ThemeImage } from "../../ThemeImage/ThemeImage";
import { useTranslation } from "../../../../i18n/useTranslation";
import { useWindowChrome } from "../../shared/useWindowChrome";
import tabsOverflow from "../../shared/tabsOverflow.module.css";
import chromeStyles from "../../shared/windowChrome.module.css";

interface Props {
  onJoinRoom?: (roomId: string) => void;
  socket?: any;
}

type TabType = "public" | "my";
type SortType = "recent" | "popular" | "users";

export default function RoomList({
  onJoinRoom,
  socket: socketProp,
}: Props) {
  const t = useTranslation();
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("public");
  const [search, setSearch] = useState("");
  // Por defecto se recomiendan las salas con más gente adentro primero (como
  // en la mayoría de juegos con salas), no las más nuevas.
  const [sort, setSort] = useState<SortType>("users");
  const [loading, setLoading] = useState(true);
  const doorAsset = useThemeAsset("ROOM_DOOR");

  const nodeRef = useRef<HTMLDivElement>(null);
  const { isSheet } = useWindowChrome();

  const socket =
    socketProp ||
    (typeof window !== "undefined" ? (window as any).phaserSocket : null);

  useEffect(() => {
    if (!socket) return;

    setLoading(true);

    socket.emit("getPublicRooms");
    socket.emit("getMyRooms");

    const handlePublicRooms = (rooms: Room[]) => {
      setPublicRooms(rooms);
      setLoading(false);
    };

    const handleMyRooms = (rooms: Room[]) => {
      setMyRooms(rooms);
    };

    const handleJoinError = (data: any) => {
      void showGameAlert({
        title: t("rooms.listJoinErrorTitle"),
        message: data.reason || t("rooms.listJoinErrorMessage"),
        confirmLabel: t("common.understood"),
        tone: "danger",
      });
    };

    const handleRoomCreated = (room: Room) => {
      setMyRooms((current) => [room, ...current.filter((item) => item.id !== room.id)]);
      if (room.isPublic) {
        setPublicRooms((current) => [room, ...current.filter((item) => item.id !== room.id)]);
      }
      setActiveTab("my");
    };

    socket.on("publicRooms", handlePublicRooms);
    socket.on("myRooms", handleMyRooms);
    socket.on("room:join:error", handleJoinError);
    socket.on("room:created", handleRoomCreated);

    return () => {
      socket.off("publicRooms", handlePublicRooms);
      socket.off("myRooms", handleMyRooms);
      socket.off("room:join:error", handleJoinError);
      socket.off("room:created", handleRoomCreated);
    };
  }, [socket]);

  const handleJoin = (roomId: string) => {
    if (!roomId) return;

    if (onJoinRoom) {
      onJoinRoom(roomId);
      return;
    }

    socket?.emit("joinRoom", {
      roomId,
    });
  };

  const displayedRooms = useMemo(() => {
    const rooms = activeTab === "my" ? myRooms : publicRooms;

    const term = search.toLowerCase();
    const filtered = !term
      ? rooms
      : rooms.filter(
          (room) =>
            room.name.toLowerCase().includes(term) ||
            room.description?.toLowerCase().includes(term),
        );

    const sorted = [...filtered];
    if (sort === "popular") {
      sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sort === "users") {
      sorted.sort((a, b) => (b._count?.users ?? 0) - (a._count?.users ?? 0));
    } else {
      sorted.sort(
        (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      );
    }
    return sorted;
  }, [activeTab, myRooms, publicRooms, search, sort]);

  const windowEl = (
    <div ref={nodeRef} className={`${styles.window} ${isSheet ? styles.sheet : ""}`}>
            <div className={styles.container}>
              <div className={styles.hero}>
                <div className={styles.heroLeft}>
                  {doorAsset ? (
                    <ThemeImage
                      asset={doorAsset}
                      fallbackSrc="/ui/door.png"
                      alt={t("rooms.listDoorAlt")}
                      size={36}
                      className={styles.heroIcon}
                    />
                  ) : (
                    // "/ui/door.png" nunca existió en apps/game/public --
                    // ThemeImage no tiene un segundo fallback si ese archivo
                    // 404ea, así que sin un theme activo para ROOM_DOOR se
                    // veía un ícono roto. DoorOpen ya se usa en este mismo
                    // archivo como ícono de estado vacío (línea de abajo).
                    <DoorOpen
                      size={28}
                      className={styles.heroIcon}
                      aria-label={t("rooms.listDoorAlt")}
                    />
                  )}

                  <div>
                    <h1 className={styles.heroTitle}>{t("rooms.listTitle")}</h1>

                    <div className={styles.heroSubtitle}>
                      {t("rooms.listSubtitle")}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowCreate(true)}
                  className={`${styles.createBtn} ${chromeStyles.closeHitArea}`}
                >
                  {t("rooms.listCreateButton")}
                </button>
              </div>

              <div className={`${styles.tabs} ${tabsOverflow.scrollRow}`}>
                <button
                  onClick={() => setActiveTab("public")}
                  className={`${styles.tab} ${
                    activeTab === "public" ? styles.active : ""
                  }`}
                >
                  {t("rooms.listTabPublic")}
                  <span className={styles.counter}>{publicRooms.length}</span>
                </button>

                <button
                  onClick={() => setActiveTab("my")}
                  className={`${styles.tab} ${
                    activeTab === "my" ? styles.active : ""
                  }`}
                >
                  {t("rooms.listTabMine")}
                  <span className={styles.counter}>{myRooms.length}</span>
                </button>
              </div>

              <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                  <Search size={15} />

                  <input
                    type="text"
                    value={search}
                    placeholder={t("rooms.listSearchPlaceholder")}
                    className={styles.searchInput}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <select
                  className={styles.sort}
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortType)}
                >
                  <option value="users">{t("rooms.listSortUsers")}</option>
                  <option value="recent">{t("rooms.listSortRecent")}</option>
                  <option value="popular">{t("rooms.listSortPopular")}</option>
                </select>
              </div>

              <div className={styles.grid}>
                {loading ? (
                  <div className={styles.skeletonGrid}>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className={styles.skeletonCard} />
                    ))}
                  </div>
                ) : displayedRooms.length > 0 ? (
                  displayedRooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      onJoin={handleJoin}
                      onView={setSelectedRoom}
                    />
                  ))
                ) : (
                  <div className={styles.empty}>
                    <DoorOpen size={28} className={styles.emptyIcon} />
                    <span>
                      {activeTab === "my"
                        ? t("rooms.listEmptyMine")
                        : t("rooms.listEmptyFiltered")}
                    </span>
                  </div>
                )}
              </div>
            </div>
    </div>
  );

  return (
    <>
      <div className={styles.overlay}>
        {isSheet ? (
          windowEl
        ) : (
          <Draggable nodeRef={nodeRef} handle={`.${styles.hero}`} bounds="parent" cancel="button">
            {windowEl}
          </Draggable>
        )}
      </div>

      {showCreate && (
        <RoomCreateModal
          socket={socket}
          onClose={() => setShowCreate(false)}
          onCreate={(data) => {
            socket?.emit("createRoom", data);

            setShowCreate(false);
          }}
        />
      )}

      {selectedRoom && (
        <RoomDetailsModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onJoin={handleJoin}
        />
      )}
    </>
  );
}
