"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, User } from "lucide-react";

import styles from "./PlayerQuickMenu.module.css";
import { PublicProfile, getPublicProfile } from "../../network/profiles";
import { acceptFriendRequest, removeFriendship, sendFriendRequest } from "../../network/friendships";
import { showGameAlert } from "../../utils/dialog";
import { audioManager } from "../../audio/AudioManager";
import { useChat } from "../Chat/ChatProvider";
import Button from "../shared/Button";
import RarityText from "../shared/RarityText";
import { useTranslation } from "../../../i18n/useTranslation";

type Props = {
  username: string;
  // Posición en pantalla (px, viewport) de donde se hizo click — el menú se
  // ancla arriba de ese punto con una flechita apuntando hacia abajo, como un
  // popover normal. No sigue al jugador si se mueve (se cierra solo con el
  // próximo click, como cualquier menú contextual).
  x: number;
  y: number;
  onClose: () => void;
};

export default function PlayerQuickMenu({ username, x, y, onClose }: Props) {
  const t = useTranslation();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { openChat, openProfile } = useChat();

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPublicProfile(username);
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleMessage = () => {
    if (!profile) return;
    openChat(profile.id, profile.username, profile.avatarUrl, profile.nameEffectId);
    onClose();
  };

  const handleViewProfile = () => {
    openProfile(username);
    onClose();
  };

  const handleFriendAction = async () => {
    if (!profile) return;

    setBusy(true);
    try {
      if (profile.friendshipStatus === "NONE") {
        await sendFriendRequest(profile.id);
      } else if (
        profile.friendshipStatus === "PENDING" &&
        profile.friendshipDirection === "INCOMING" &&
        profile.friendshipId
      ) {
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
    busy ||
    !profile ||
    profile.friendshipStatus === "BLOCKED" ||
    (profile.friendshipStatus === "PENDING" && profile.friendshipDirection === "OUTGOING");

  return (
    <div ref={rootRef} className={styles.popover} style={{ left: x, top: y }}>
      <div className={styles.head}>
        {profile?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.avatar} src={profile.avatarUrl} alt={username} />
        ) : (
          <div className={styles.avatarFallback}>{username.slice(0, 1).toUpperCase()}</div>
        )}
        <div className={styles.headInfo}>
          <RarityText as="span" effect={profile?.nameEffectId} className={styles.username}>
            {username}
          </RarityText>
          {profile && <span className={styles.level}>{t("quickmenu.level", { level: profile.level })}</span>}
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>{t("common.loading")}</div>
      ) : (
        <div className={styles.actions}>
          <Button variant="secondary" size="sm" fullWidth onClick={handleViewProfile}>
            <User size={13} /> {t("quickmenu.viewProfile")}
          </Button>
          <Button variant="primary" size="sm" fullWidth onClick={handleMessage} disabled={!profile}>
            <MessageCircle size={13} /> {t("quickmenu.message")}
          </Button>
          <Button
            variant={profile?.friendshipStatus === "ACCEPTED" ? "danger" : "primary"}
            size="sm"
            fullWidth
            onClick={() => void handleFriendAction()}
            disabled={friendActionDisabled}
          >
            {friendActionLabel()}
          </Button>
        </div>
      )}

      <div className={styles.arrow} />
    </div>
  );
}
