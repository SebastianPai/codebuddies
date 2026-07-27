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

type Props = {
  onClose: () => void;
};

export default function NotificationsPanel({ onClose }: Props) {
  const nodeRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<GameNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

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

  const handleItemClick = async (notification: GameNotification) => {
    if (notification.read) return;
    setItems((current) =>
      current.map((entry) => (entry.id === notification.id ? { ...entry, read: true } : entry)),
    );
    setUnreadCount((current) => Math.max(0, current - 1));
    try {
      await markNotificationRead(notification.id);
    } catch {
      // el contador se corrige solo en el próximo load()
    }
  };

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
          <span className={styles.title}>NOTIFICACIONES</span>
          <div className={styles.headerActions}>
            {unreadCount > 0 && (
              <button className={styles.markAll} onClick={() => void handleMarkAll()}>
                Marcar todo leído
              </button>
            )}
            <button className={styles.closeBtn} aria-label="Cerrar notificaciones" onClick={onClose}>
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
            <div className={styles.empty}>No tienes notificaciones todavía.</div>
          )}

          {!loading &&
            items.map((notification) => {
              const friendAvatar = notification.metadata?.friend?.avatarUrl;
              const Icon = resolveNotificationIcon(notification.icon);
              return (
                <button
                  key={notification.id}
                  className={`${styles.item} ${!notification.read ? styles.unread : ""}`}
                  onClick={() => void handleItemClick(notification)}
                >
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
                    <div className={styles.itemTime}>{notification.relativeTime}</div>
                  </div>
                  {!notification.read && <div className={styles.unreadDot} />}
                </button>
              );
            })}
        </div>
      </div>
    </Draggable>
  );
}
