"use client";

import { useEffect, useRef, useState } from "react";
import Draggable from "react-draggable";
import { X } from "lucide-react";

import styles from "./NotificationsPanel.module.css";
import {
  GameNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../network/notifications";
import { resolveNotificationIcon } from "../../utils/notificationIcons";
import { useDialogBehavior } from "../shared/useDialogBehavior";
import { useTranslation } from "../../../i18n/useTranslation";
import { useSocket } from "../../hooks/useSocket";

type Props = {
  onClose: () => void;
};

export default function NotificationsPanel({ onClose }: Props) {
  const t = useTranslation();
  const nodeRef = useRef<HTMLDivElement>(null);
  useDialogBehavior(nodeRef, onClose);
  const socket = useSocket();

  const [items, setItems] = useState<GameNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  // Estado puramente local (no persistido): qué invitación está en curso de
  // aceptar/rechazar y cómo quedó resuelta, para no depender de un refetch.
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);
  const [resolvedInvites, setResolvedInvites] = useState<Record<string, "accepted" | "declined">>({});

  const load = async () => {
    try {
      const data = await getNotifications();
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      // silencioso: se puede reintentar cerrando y reabriendo el panel
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const handleNew = () => void load();
    window.addEventListener("codebuddies:notification:new", handleNew);
    return () => window.removeEventListener("codebuddies:notification:new", handleNew);
  }, []);

  const markRead = (notificationId: string) => {
    setItems((current) =>
      current.map((entry) => (entry.id === notificationId ? { ...entry, read: true } : entry)),
    );
    setUnreadCount((current) => Math.max(0, current - 1));
    void markNotificationRead(notificationId).catch(() => {
      // el contador se corrige solo en el próximo load()
    });
  };

  const handleItemClick = async (notification: GameNotification) => {
    if (notification.read) return;
    markRead(notification.id);
  };

  // Contraparte del lado del invitado: antes no había forma de aceptar o
  // rechazar una invitación de sala, solo de verla. "room:invite:accept"/
  // "room:invite:decline" resuelven el RoomInvite en el servidor (ver
  // rooms.service.ts#acceptInvite/declineInvite); la respuesta llega por
  // "room:invite:accepted"/"room:invite:declined" (ver el efecto de abajo).
  const handleAcceptInvite = (notification: GameNotification) => {
    const inviteId = notification.metadata?.inviteId as string | undefined;
    if (!inviteId || !socket) return;
    setRespondingInviteId(inviteId);
    markRead(notification.id);
    socket.emit("room:invite:accept", { inviteId });
  };

  const handleDeclineInvite = (notification: GameNotification) => {
    const inviteId = notification.metadata?.inviteId as string | undefined;
    if (!inviteId || !socket) return;
    setRespondingInviteId(inviteId);
    markRead(notification.id);
    socket.emit("room:invite:decline", { inviteId });
  };

  useEffect(() => {
    if (!socket) return;

    const handleAccepted = (invite: { id: string; roomId?: string; room?: { id: string } }) => {
      setResolvedInvites((current) => ({ ...current, [invite.id]: "accepted" }));
      setRespondingInviteId(null);
      const roomId = invite.room?.id ?? invite.roomId;
      if (roomId) {
        socket.emit("joinRoom", { roomId });
        onClose();
      }
    };

    const handleDeclined = (invite: { id: string }) => {
      setResolvedInvites((current) => ({ ...current, [invite.id]: "declined" }));
      setRespondingInviteId(null);
    };

    const handleError = () => setRespondingInviteId(null);

    socket.on("room:invite:accepted", handleAccepted);
    socket.on("room:invite:declined", handleDeclined);
    socket.on("room:error", handleError);
    return () => {
      socket.off("room:invite:accepted", handleAccepted);
      socket.off("room:invite:declined", handleDeclined);
      socket.off("room:error", handleError);
    };
  }, [socket, onClose]);

  const handleMarkAll = async () => {
    setItems((current) => current.map((entry) => ({ ...entry, read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      await load();
    }
  };

  return (
    <Draggable nodeRef={nodeRef} handle={`.${styles.windowHeader}`}>
      <div ref={nodeRef} className={styles.window}>
        <div className={styles.windowHeader}>
          <span className={styles.title}>{t("notifications.panelTitle")}</span>
          <div className={styles.headerActions}>
            {unreadCount > 0 && (
              <button className={styles.markAll} onClick={() => void handleMarkAll()}>
                {t("notifications.markAllRead")}
              </button>
            )}
            <button className={styles.closeBtn} aria-label={t("notifications.closeAriaLabel")} onClick={onClose}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div className={styles.list}>
          {loading && (
            <>
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
            </>
          )}

          {!loading && items.length === 0 && (
            <div className={styles.empty}>{t("notifications.empty")}</div>
          )}

          {!loading &&
            items.map((notification) => {
              const friendAvatar = notification.metadata?.friend?.avatarUrl;
              const Icon = resolveNotificationIcon(notification.icon);
              const inviteId = notification.metadata?.inviteId as string | undefined;
              const isRoomInvite = notification.type === "ROOM_INVITE" && !!inviteId;
              const inviteState = isRoomInvite ? resolvedInvites[inviteId!] : undefined;
              const isResponding = isRoomInvite && respondingInviteId === inviteId;

              const body = (
                <>
                  {friendAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={styles.avatar} src={friendAvatar} alt="" />
                  ) : (
                    <div className={styles.icon}>
                      <Icon size={17} />
                    </div>
                  )}
                  <div className={styles.itemBody}>
                    <div className={styles.itemTitle}>{notification.title}</div>
                    {notification.body && <div className={styles.itemText}>{notification.body}</div>}
                    {isRoomInvite ? (
                      inviteState ? (
                        <div className={styles.inviteStatus}>
                          {inviteState === "accepted"
                            ? t("notifications.inviteAccepted")
                            : t("notifications.inviteDeclined")}
                        </div>
                      ) : (
                        <div className={styles.inviteActions}>
                          <button
                            type="button"
                            className={`${styles.inviteBtn} ${styles.inviteAccept}`}
                            disabled={isResponding}
                            onClick={() => handleAcceptInvite(notification)}
                          >
                            {isResponding ? t("notifications.inviteJoining") : t("notifications.acceptInvite")}
                          </button>
                          <button
                            type="button"
                            className={`${styles.inviteBtn} ${styles.inviteDecline}`}
                            disabled={isResponding}
                            onClick={() => handleDeclineInvite(notification)}
                          >
                            {t("notifications.declineInvite")}
                          </button>
                        </div>
                      )
                    ) : (
                      <div className={styles.itemTime}>{notification.relativeTime}</div>
                    )}
                  </div>
                  {!notification.read && <div className={styles.unreadDot} />}
                </>
              );

              if (isRoomInvite) {
                return (
                  <div
                    key={notification.id}
                    className={`${styles.item} ${styles.itemStatic} ${!notification.read ? styles.unread : ""}`}
                  >
                    {body}
                  </div>
                );
              }

              return (
                <button
                  key={notification.id}
                  className={`${styles.item} ${!notification.read ? styles.unread : ""}`}
                  onClick={() => void handleItemClick(notification)}
                >
                  {body}
                </button>
              );
            })}
        </div>
      </div>
    </Draggable>
  );
}
