"use client";

import React, { useEffect, useState } from "react";
import { Background, Room } from "../../../types/room";
import StarRating from "../../UI/StarRating";
import BackgroundSelector from "../BackgroundSelector/BackgroundSelector";
import styles from "./RoomDetailsModal.module.css";
import Modal from "../../shared/Modal";
import Button from "../../shared/Button";

type PendingJoinRequest = {
  id: string;
  createdAt: string;
  user: { id: string; username: string; avatarUrl?: string | null };
};

interface Props {
  room: Room;
  currentUserId?: string;
  onClose: () => void;
  onJoin: (roomId: string) => void;
  socket?: any;
}

export default function RoomDetailsModal({
  room,
  currentUserId,
  onClose,
  onJoin,
  socket: socketProp,
}: Props) {
  const [isOwner, setIsOwner] = useState(false);
  const [joining, setJoining] = useState(false);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [selectedBackgroundId, setSelectedBackgroundId] = useState(
    room.background?.id ?? "",
  );
  const [joinRequests, setJoinRequests] = useState<PendingJoinRequest[]>([]);
  const socket =
    socketProp ||
    (typeof window !== "undefined" ? (window as any).phaserSocket : null);

  useEffect(() => {
    if (!room || !currentUserId) return;

    setIsOwner(room.owner?.id === currentUserId);
  }, [room, currentUserId]);

  useEffect(() => {
    if (!socket) return;

    socket.emit("getBackgrounds");
    socket.on("backgrounds:list", setBackgrounds);

    return () => {
      socket.off("backgrounds:list", setBackgrounds);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !isOwner) return;

    const handleJoinRequests = (data: { roomId: string; requests: PendingJoinRequest[] }) => {
      if (data.roomId === room.id) setJoinRequests(data.requests);
    };

    socket.emit("room:joinRequests:list", { roomId: room.id });
    socket.on("room:joinRequests", handleJoinRequests);
    socket.on("room:joinRequest:approved", () => socket.emit("room:joinRequests:list", { roomId: room.id }));
    socket.on("room:joinRequest:rejected", () => socket.emit("room:joinRequests:list", { roomId: room.id }));

    return () => {
      socket.off("room:joinRequests", handleJoinRequests);
      socket.off("room:joinRequest:approved");
      socket.off("room:joinRequest:rejected");
    };
  }, [socket, isOwner, room.id]);

  const handleJoin = async () => {
    if (joining) return;

    try {
      setJoining(true);
      await onJoin(room.id);
    } finally {
      setJoining(false);
    }
  };

  return (
    <Modal title={room.name} onClose={onClose} style={{ width: "min(520px, 100%)" }}>
        {/* BACKGROUND */}
        {room.background?.imageUrl && (
          <div className={styles.backgroundPreview}>
            <img
              src={room.background.imageUrl}
              alt={room.background.name || "background"}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        {/* INFO */}
        <div className={styles.info}>
          <p>
            <strong>Descripción:</strong>{" "}
            {room.description?.trim() || "Sin descripción"}
          </p>

          <p>
            <strong>Creador:</strong> {room.owner?.username || "Desconocido"}
          </p>

          <p>
            <strong>Capacidad:</strong> {room._count?.users ?? 0} /{" "}
            {room.maxUsers}
          </p>

          <StarRating
            rating={room.rating || 0}
            totalVotes={room.totalVotes || 0}
          />
        </div>

        {/* ACTIONS */}
        <div className={styles.actions}>
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cerrar
          </Button>

          <Button variant="primary" fullWidth onClick={() => void handleJoin()} disabled={joining}>
            {joining ? "Entrando..." : "Unirse a la sala"}
          </Button>
        </div>

        {/* OWNER ACTIONS */}
        {isOwner && (
          <div className={styles.ownerActions}>
            <p className={styles.ownerLabel}>🔧 Eres el dueño de esta sala</p>

            {joinRequests.length > 0 && (
              <div className={styles.joinRequests}>
                <p className={styles.joinRequestsTitle}>Quieren entrar</p>
                {joinRequests.map((request) => (
                  <div key={request.id} className={styles.joinRequestRow}>
                    <span className={styles.joinRequestUser}>{request.user.username}</span>
                    <div className={styles.joinRequestActions}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => socket?.emit("room:joinRequest:approve", { requestId: request.id })}
                      >
                        Aceptar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => socket?.emit("room:joinRequest:reject", { requestId: request.id })}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <BackgroundSelector
              backgrounds={backgrounds}
              selectedId={selectedBackgroundId}
              onSelect={(id) => {
                setSelectedBackgroundId(id);
                socket?.emit("room:changeBackground", {
                  roomId: room.id,
                  backgroundId: id,
                });
              }}
            />
          </div>
        )}
    </Modal>
  );
}
