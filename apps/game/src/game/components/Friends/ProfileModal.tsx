"use client";

import { useEffect, useState } from "react";

import styles from "./ProfileModal.module.css";
import {
  ProfileRoom,
  PublicProfile,
  followUser,
  getPublicProfile,
  getPublicProfileRooms,
  unfollowUser,
} from "../../network/profiles";
import { acceptFriendRequest, removeFriendship, sendFriendRequest } from "../../network/friendships";
import { requestGameConfirm, showGameAlert } from "../../utils/dialog";
import { audioManager } from "../../audio/AudioManager";
import Modal from "../shared/Modal";
import Button from "../shared/Button";
import UserBadges from "../shared/UserBadges";
import RarityText from "../shared/RarityText";
import { Globe, Lock, MessageCircle } from "lucide-react";
import { useTranslation } from "../../../i18n/useTranslation";

type Props = {
  username: string;
  onClose: () => void;
  onOpenChat: (
    userId: string,
    username: string,
    avatarUrl?: string | null,
    nameEffectId?: string | null,
  ) => void;
};

export default function ProfileModal({ username, onClose, onOpenChat }: Props) {
  const t = useTranslation();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rooms, setRooms] = useState<ProfileRoom[]>([]);
  const [requestingRoomId, setRequestingRoomId] = useState<string | null>(null);

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
    getPublicProfileRooms(username)
      .then(setRooms)
      .catch(() => setRooms([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const joinRoom = (roomId: string) => {
    const socket = (typeof window !== "undefined" && (window as any).phaserSocket) || null;
    socket?.emit("joinRoom", { roomId });
    onClose();
  };

  const requestJoinRoom = async (room: ProfileRoom) => {
    const socket = (typeof window !== "undefined" && (window as any).phaserSocket) || null;
    // requestingRoomId ya en curso bloquea un segundo clic mientras el
    // alert de confirmación sigue abierto (antes se setteaba y desetteaba
    // de forma síncrona, sin ningún await entre medio: React agrupaba
    // ambos cambios en un solo commit y el guard nunca llegaba a
    // renderizarse como "true").
    if (!socket || requestingRoomId) return;

    setRequestingRoomId(room.id);
    try {
      socket.emit("room:requestJoin", { roomId: room.id });
      setRooms((current) =>
        current.map((entry) => (entry.id === room.id ? { ...entry, joinRequestStatus: "PENDING" } : entry)),
      );

      await showGameAlert({
        title: t("quickmenu.friendActionPendingOutgoing"),
        message: t("friends.joinRequestSentMessage", { username, roomName: room.name }),
        confirmLabel: t("common.understood"),
        tone: "success",
      });
    } finally {
      setRequestingRoomId(null);
    }
  };

  const handleFriendAction = async () => {
    if (!profile) return;

    if (profile.friendshipStatus === "ACCEPTED" && profile.friendshipId) {
      const confirmed = await requestGameConfirm({
        title: t("quickmenu.friendActionAccepted"),
        message: t("friends.removeConfirmMessage", { username: profile.username }),
        confirmLabel: t("common.delete"),
        cancelLabel: t("common.cancel"),
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
        title: t("common.actionFailedTitle"),
        message: t("common.actionFailedMessage"),
        confirmLabel: t("common.understood"),
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
        title: t("common.actionFailedTitle"),
        message: t("common.actionFailedMessage"),
        confirmLabel: t("common.understood"),
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
        return t("quickmenu.friendActionAccepted");
      case "PENDING":
        return profile.friendshipDirection === "INCOMING"
          ? t("quickmenu.friendActionPendingIncoming")
          : t("quickmenu.friendActionPendingOutgoing");
      case "BLOCKED":
        return t("quickmenu.friendActionBlocked");
      default:
        return t("quickmenu.friendActionDefault");
    }
  };

  const friendActionDisabled =
    busy || profile?.friendshipStatus === "BLOCKED" || (profile?.friendshipStatus === "PENDING" && profile.friendshipDirection === "OUTGOING");

  return (
    <Modal
      title={
        !loading && !error && profile ? (
          <>
            <RarityText effect={profile.nameEffectId}>{profile.username}</RarityText>
            <UserBadges verified={profile.verified} isCreator={profile.isCreator} size={14} className={styles.titleBadges} />
          </>
        ) : (
          t("friends.profileTitle")
        )
      }
      onClose={onClose}
      contentClassName={styles.content}
      style={{ width: "min(340px, 100%)" }}
    >
      {loading && <div className={styles.loading}>{t("friends.profileLoading")}</div>}
      {!loading && error && <div className={styles.error}>{t("friends.profileLoadError")}</div>}

      {!loading && !error && profile && (
        <>
          <div className={styles.profileHead}>
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.avatar} src={profile.avatarUrl} alt={profile.username} />
            ) : (
              <div className={styles.avatarFallback}>{profile.username.slice(0, 1).toUpperCase()}</div>
            )}
            <div className={styles.level}>{t("quickmenu.level", { level: profile.level })}</div>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statValue}>{profile.followers}</div>
              <div className={styles.statLabel}>{t("friends.followersLabel")}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>{profile.coursesCompleted}</div>
              <div className={styles.statLabel}>{t("friends.coursesLabel")}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>{profile.certificatesEarned}</div>
              <div className={styles.statLabel}>{t("friends.certificatesLabel")}</div>
            </div>
          </div>

          {profile.mutualFriends > 0 && (
            <div className={styles.mutual}>{t("friends.mutualFriendsCount", { count: profile.mutualFriends })}</div>
          )}

          <div className={styles.actions}>
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={() => onOpenChat(profile.id, profile.username, profile.avatarUrl, profile.nameEffectId)}
            >
              <MessageCircle size={14} /> {t("quickmenu.message")}
            </Button>
            <Button variant="secondary" size="sm" fullWidth onClick={() => void handleFollowToggle()} disabled={busy}>
              {profile.isFollowing ? t("friends.unfollowAction") : t("friends.followAction")}
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

          {rooms.length > 0 && (
            <div className={styles.rooms}>
              <div className={styles.roomsTitle}>{t("friends.roomsTitle", { username: profile.username })}</div>
              {rooms.map((room) => (
                <div key={room.id} className={styles.roomRow}>
                  <div className={styles.roomInfo}>
                    <span className={styles.roomName}>{room.name}</span>
                    <span className={styles.roomMeta}>
                      {room.isPublic ? (
                        <Globe size={11} className={styles.roomMetaIcon} />
                      ) : (
                        <Lock size={11} className={styles.roomMetaIcon} />
                      )}
                      {room.isPublic ? t("friends.roomPublic") : t("friends.roomPrivate")} · {room._count.users}/
                      {room.maxUsers}
                    </span>
                  </div>
                  {room.canJoinDirectly ? (
                    <Button variant="primary" size="sm" onClick={() => joinRoom(room.id)}>
                      {t("friends.joinRoomAction")}
                    </Button>
                  ) : room.joinRequestStatus === "PENDING" ? (
                    <Button variant="secondary" size="sm" disabled>
                      {t("friends.pendingLabel")}
                    </Button>
                  ) : room.joinRequestStatus === "APPROVED" ? (
                    <Button variant="primary" size="sm" onClick={() => joinRoom(room.id)}>
                      {t("friends.joinRoomAction")}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={requestingRoomId === room.id}
                      onClick={() => void requestJoinRoom(room)}
                    >
                      {t("friends.requestJoinAction")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
