"use client";

import { useState } from "react";
import { Room } from "../../../types/room";
import StarRating from "../../UI/StarRating";
import styles from "./RoomDetailsModal.module.css";
import Modal from "../../shared/Modal";
import Button from "../../shared/Button";
import UserBadges from "../../shared/UserBadges";
import { useTranslation } from "../../../../i18n/useTranslation";

interface Props {
  room: Room;
  onClose: () => void;
  onJoin: (roomId: string) => void;
}

// Tarjeta de "ver antes de entrar" desde el listado de salas (RoomList).
// La administración de la sala (invitados, permisos, fondo, solicitudes de
// acceso...) vive en EditWorldPanel una vez adentro — antes esas mismas
// acciones de dueño (aprobar solicitudes, cambiar fondo) estaban duplicadas
// acá, alcanzables solo desde este listado y nunca desde dentro de tu
// propia sala. Se retiraron de acá para no mantener dos caminos a lo mismo.
export default function RoomDetailsModal({ room, onClose, onJoin }: Props) {
  const t = useTranslation();
  const [joining, setJoining] = useState(false);

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
            alt={room.background.name || t("rooms.detailsBackgroundAlt")}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}

      {/* INFO */}
      <div className={styles.info}>
        <p>
          <strong>{t("rooms.detailsDescriptionLabel")}</strong>{" "}
          {room.description?.trim() || t("rooms.detailsNoDescription")}
        </p>

        <p className={styles.ownerLine}>
          <strong>{t("rooms.detailsOwnerLabel")}</strong> {room.owner?.username || t("rooms.cardUnknownOwner")}
          {room.owner?.username && <UserBadges username={room.owner.username} size={12} />}
        </p>

        <p>
          <strong>{t("rooms.detailsCapacityLabel")}</strong> {room._count?.users ?? 0} /{" "}
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
          {t("common.close")}
        </Button>

        <Button variant="primary" fullWidth onClick={() => void handleJoin()} disabled={joining}>
          {joining ? t("rooms.detailsJoining") : t("rooms.detailsJoinRoom")}
        </Button>
      </div>
    </Modal>
  );
}
