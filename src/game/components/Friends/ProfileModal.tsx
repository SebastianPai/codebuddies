"use client";

import { useEffect, useState } from "react";

import styles from "./ProfileModal.module.css";
import { PublicProfile, followUser, getPublicProfile, unfollowUser } from "../../network/profiles";
import { acceptFriendRequest, removeFriendship, sendFriendRequest } from "../../network/friendships";
import { requestGameConfirm, showGameAlert } from "../../utils/dialog";
import { audioManager } from "../../audio/AudioManager";
import Modal from "../shared/Modal";
import Button from "../shared/Button";

type Props = {
  username: string;
  onClose: () => void;
  onOpenChat: (userId: string, username: string, avatarUrl?: string | null) => void;
};

export default function ProfileModal({ username, onClose, onOpenChat }: Props) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getPublicProfile(username);
      setProfile(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const handleFriendAction = async () => {
    if (!profile) return;

    if (profile.friendshipStatus === "ACCEPTED" && profile.friendshipId) {
      const confirmed = await requestGameConfirm({
        title: "Eliminar amigo",
        message: `¿Seguro que quieres eliminar a ${profile.username} de tu lista de amigos?`,
        confirmLabel: "Eliminar",
        cancelLabel: "Cancelar",
        tone: "danger",
      });
      if (!confirmed) return;
    }

    setBusy(true);
    try {
      if (profile.friendshipStatus === "NONE") {
        await sendFriendRequest(profile.id);
      } else if (profile.friendshipStatus === "PENDING" && profile.friendshipDirection === "INCOMING" && profile.friendshipId) {
        await acceptFriendRequest(profile.friendshipId);
        audioManager.play("notify");
      } else if (profile.friendshipStatus === "ACCEPTED" && profile.friendshipId) {
        await removeFriendship(profile.friendshipId);
      }
      await load();
    } catch {
      await showGameAlert({
        title: "No se pudo completar la acción",
        message: "Intenta de nuevo en unos segundos.",
        confirmLabel: "Entendido",
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      if (profile.isFollowing) {
        await unfollowUser(profile.username);
      } else {
        await followUser(profile.username);
      }
      await load();
    } catch {
      await showGameAlert({
        title: "No se pudo completar la acción",
        message: "Intenta de nuevo en unos segundos.",
        confirmLabel: "Entendido",
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  };

  const friendActionLabel = () => {
    if (!profile) return "";
    switch (profile.friendshipStatus) {
      case "ACCEPTED":
        return "Eliminar amigo";
      case "PENDING":
        return profile.friendshipDirection === "INCOMING" ? "Aceptar solicitud" : "Solicitud enviada";
      case "BLOCKED":
        return "Bloqueado";
      default:
        return "Agregar amigo";
    }
  };

  const friendActionDisabled =
    busy || profile?.friendshipStatus === "BLOCKED" || (profile?.friendshipStatus === "PENDING" && profile.friendshipDirection === "OUTGOING");

  return (
    <Modal
      title={!loading && !error && profile ? profile.username : "Perfil"}
      onClose={onClose}
      contentClassName={styles.content}
      style={{ width: "min(340px, 100%)" }}
    >
      {loading && <div className={styles.loading}>Cargando perfil...</div>}
      {!loading && error && <div className={styles.error}>No se pudo cargar este perfil.</div>}

      {!loading && !error && profile && (
        <>
          <div className={styles.profileHead}>
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.avatar} src={profile.avatarUrl} alt={profile.username} />
            ) : (
              <div className={styles.avatarFallback}>{profile.username.slice(0, 1).toUpperCase()}</div>
            )}
            <div className={styles.level}>NIVEL {profile.level}</div>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statValue}>{profile.followers}</div>
              <div className={styles.statLabel}>SEGUIDORES</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>{profile.coursesCompleted}</div>
              <div className={styles.statLabel}>CURSOS</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>{profile.certificatesEarned}</div>
              <div className={styles.statLabel}>CERTIFICADOS</div>
            </div>
          </div>

          {profile.mutualFriends > 0 && (
            <div className={styles.mutual}>{profile.mutualFriends} amigos en común</div>
          )}

          <div className={styles.actions}>
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={() => onOpenChat(profile.id, profile.username, profile.avatarUrl)}
            >
              💬 Mensaje
            </Button>
            <Button variant="secondary" size="sm" fullWidth onClick={() => void handleFollowToggle()} disabled={busy}>
              {profile.isFollowing ? "Dejar de seguir" : "Seguir"}
            </Button>
            <Button
              variant={profile.friendshipStatus === "ACCEPTED" ? "danger" : "primary"}
              size="sm"
              fullWidth
              onClick={() => void handleFriendAction()}
              disabled={friendActionDisabled}
            >
              {friendActionLabel()}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
