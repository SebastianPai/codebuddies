import React, { useState } from "react";
import { Crown, Gem, Globe, Lock, ZoomIn } from "lucide-react";
import { Room } from "../../../types/room";
import styles from "./RoomCard.module.css";
import CachedGameImage from "../../shared/CachedGameImage";
import ImagePreviewModal from "../../shared/ImagePreviewModal";
import UserBadges from "../../shared/UserBadges";
import RarityText from "../../shared/RarityText";
import { useTranslation } from "../../../../i18n/useTranslation";

interface RoomCardProps {
  room: Room;
  onJoin: (roomId: string) => void;
  onView: (room: Room) => void;
}

export default function RoomCard({ room, onJoin, onView }: RoomCardProps) {
  const t = useTranslation();
  const [zoomOpen, setZoomOpen] = useState(false);
  const currentUsers = room._count?.users || 0;

  const isFull = currentUsers >= room.maxUsers;

  const thumbnail =
    room.thumbnailUrl ||
    (room as any).thumbnail ||
    room.background?.previewUrl ||
    room.background?.thumbnailUrl ||
    room.background?.imageUrl ||
    "/rooms/default-room.png";

  return (
    <div className={styles.roomCard}>
      <div className={styles.roomImage} onClick={() => onView(room)}>
        {/* Las salas son una colección chica y acotada (no miles de items en
            scroll infinito): cargarlas "eager" evita que la carga diferida se
            confunda con el scroll propio de la grilla y la imagen no aparezca. */}
        <CachedGameImage src={thumbnail} alt={room.name} loading="eager" />

        <div className={styles.overlay} />

        <div className={styles.badges}>
          <span className={styles.publicBadge}>
            {room.isPublic ? <Globe size={11} /> : <Lock size={11} />}
            {room.isPublic ? t("rooms.cardPublicBadge") : t("rooms.cardPrivateBadge")}
          </span>

          {room.isVipOnly && (
            <span className={styles.vipBadge}>
              <Gem size={11} /> {t("rooms.cardVipBadge")}
            </span>
          )}
        </div>

        <button
          type="button"
          className={styles.zoomBtn}
          aria-label={t("rooms.cardZoomAriaLabel", { name: room.name })}
          onClick={(event) => {
            event.stopPropagation();
            setZoomOpen(true);
          }}
        >
          <ZoomIn size={14} />
        </button>
      </div>

      {zoomOpen && (
        <ImagePreviewModal title={room.name} imageUrl={thumbnail} onClose={() => setZoomOpen(false)} />
      )}

      <div className={styles.cardBody}>
        <h3 className={styles.roomTitle}>{room.name}</h3>

        <p className={styles.description}>
          {room.description || t("rooms.cardDefaultDescription")}
        </p>

        <div className={styles.separator} />

        <div className={styles.stats}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>{t("rooms.cardUsersLabel")}</span>

            <span
              className={`${styles.statValue} ${
                isFull ? styles.red : styles.green
              }`}
            >
              {currentUsers}/{room.maxUsers}
            </span>
          </div>

          <div className={styles.statBox}>
            <span className={styles.statLabel}>{t("rooms.cardOwnerLabel")}</span>

            <span className={styles.ownerName}>
              <Crown size={12} />{" "}
              {room.owner?.username ? (
                <RarityText effect={room.owner.nameEffectId}>{room.owner.username}</RarityText>
              ) : (
                t("rooms.cardUnknownOwner")
              )}
              {room.owner?.username && <UserBadges username={room.owner.username} size={11} />}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <button
          disabled={isFull}
          className={styles.joinBtn}
          onClick={() => onJoin(room.id)}
        >
          {isFull ? t("rooms.cardFullBadge") : t("rooms.cardJoinButton")}
        </button>
      </div>
    </div>
  );
}
