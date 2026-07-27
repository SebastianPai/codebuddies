"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";

import Draggable from "react-draggable";

import RoomCard from "./RoomCard";
import RoomCreateModal from "../RoomCreate/RoomCreateModal";
import RoomDetailsModal from "../RoomDetails/RoomDetailsModal";

import { Room } from "../../../types/room";

import styles from "./RoomList.module.css";
import { showGameAlert } from "../../../utils/dialog";

interface Props {
  onJoinRoom?: (roomId: string) => void;
  socket?: any;
}

type TabType = "public" | "my";

export default function RoomList({
  onJoinRoom,
  socket: socketProp,
}: Props) {
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("public");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const nodeRef = useRef<HTMLDivElement>(null);

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
        title: "No se pudo entrar",
        message: data.reason || "La sala no esta disponible en este momento.",
        confirmLabel: "Entendido",
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

    if (!search) return rooms;

    const term = search.toLowerCase();

    return rooms.filter(
      (room) =>
        room.name.toLowerCase().includes(term) ||
        room.description?.toLowerCase().includes(term),
    );
  }, [activeTab, myRooms, publicRooms, search]);

  return (
    <>
      <div className={styles.overlay}>
        <Draggable nodeRef={nodeRef} handle={`.${styles.hero}`} bounds="parent">
          <div ref={nodeRef} className={styles.window}>
            <div className={styles.container}>
              <div className={styles.hero}>
                <div className={styles.heroLeft}>
                  <img
                    src="/ui/door.png"
                    alt="Door"
                    className={styles.heroIcon}
                  />

                  <div>
                    <h1 className={styles.heroTitle}>SALAS</h1>

                    <div className={styles.heroSubtitle}>
                      Explora espacios creados por la comunidad
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowCreate(true)}
                  className={styles.createBtn}
                >
                  + Crear Sala
                </button>
              </div>

              <div className={styles.tabs}>
                <button
                  onClick={() => setActiveTab("public")}
                  className={`${styles.tab} ${
                    activeTab === "public" ? styles.active : ""
                  }`}
                >
                  Públicas
                  <span className={styles.counter}>{publicRooms.length}</span>
                </button>

                <button
                  onClick={() => setActiveTab("my")}
                  className={`${styles.tab} ${
                    activeTab === "my" ? styles.active : ""
                  }`}
                >
                  Mis Salas
                  <span className={styles.counter}>{myRooms.length}</span>
                </button>
              </div>

              <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                  <span>🔍</span>

                  <input
                    type="text"
                    value={search}
                    placeholder="Buscar salas..."
                    className={styles.searchInput}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <select className={styles.sort}>
                  <option>Más recientes</option>

                  <option>Más populares</option>

                  <option>Más usuarios</option>
                </select>
              </div>

              <div className={styles.grid}>
                {loading ? (
                  <div className={styles.loading}>Cargando salas...</div>
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
                  <div className={styles.empty}>No se encontraron salas</div>
                )}
              </div>
            </div>
          </div>
        </Draggable>
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
          socket={socket}
          currentUserId={
            (typeof window !== "undefined" && localStorage.getItem("userId")) || undefined
          }
          onClose={() => setSelectedRoom(null)}
          onJoin={handleJoin}
        />
      )}
    </>
  );
}
