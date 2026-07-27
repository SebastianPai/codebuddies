"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { sileo, Toaster } from "sileo";
import { Coins, Zap, Gift } from "lucide-react";
import { api } from "../../utils/api";
import { useAuth } from "../../hooks/useAuth";
import { getNotificationIcon } from "./notificationIcons";

type RewardsSummary = {
  xp: number;
  coins: number;
  items: Array<{ label: string; itemId: string | null }>;
};

type NotificationFriend = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

type RealtimeNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  category: string;
  priority: string;
  icon: string;
  link?: string | null;
  actionLabel?: string | null;
  metadata?: {
    rewards?: RewardsSummary;
    friend?: NotificationFriend;
  } | null;
};

const SUCCESS_TYPES = new Set([
  "ACHIEVEMENT_UNLOCKED",
  "MISSION_REWARD_CLAIMED",
  "REWARD_GRANTED",
  "FRIEND_REQUEST_ACCEPTED",
  "CERTIFICATE_ISSUED",
  "PREMIUM_ACTIVATED",
  "LEVEL_UPDATED",
  "REFERRAL_VALIDATED",
  "REFERRAL_REWARD_UNLOCKED",
]);

const WARNING_TYPES = new Set(["REFERRAL_FRAUD_FLAGGED"]);

function pickSileoMethod(type: string): "success" | "warning" | "info" {
  if (SUCCESS_TYPES.has(type)) return "success";
  if (WARNING_TYPES.has(type)) return "warning";
  return "info";
}

function NotificationDescription({ notification }: { notification: RealtimeNotification }) {
  const rewards = notification.metadata?.rewards;
  if (rewards && (rewards.xp > 0 || rewards.coins > 0 || rewards.items.length > 0)) {
    return (
      <span className="flex flex-wrap items-center gap-2.5 text-xs font-bold">
        {rewards.xp > 0 ? (
          <span className="inline-flex items-center gap-1 text-amber-500">
            <Zap size={14} /> +{rewards.xp} XP
          </span>
        ) : null}
        {rewards.coins > 0 ? (
          <span className="inline-flex items-center gap-1 text-yellow-500">
            <Coins size={14} /> +{rewards.coins}
          </span>
        ) : null}
        {rewards.items.map((item, index) => (
          <span key={item.itemId ?? index} className="inline-flex items-center gap-1">
            <Gift size={14} /> {item.label}
          </span>
        ))}
      </span>
    );
  }

  const friend = notification.metadata?.friend;
  if (friend) {
    return (
      <span className="flex items-center gap-2">
        {friend.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={friend.avatarUrl}
            alt=""
            className="h-5 w-5 rounded-full object-cover"
          />
        ) : null}
        {notification.body ?? friend.username}
      </span>
    );
  }

  return notification.body ?? undefined;
}

function notificationIcon(notification: RealtimeNotification) {
  const friend = notification.metadata?.friend;
  if (friend?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={friend.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
    );
  }
  return getNotificationIcon(notification.icon);
}

type NotificationsContextType = {
  unreadCount: number;
  resetUnread: () => void;
};

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function useGlobalNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useGlobalNotifications must be used inside GlobalNotificationsProvider");
  }
  return context;
}

export default function GlobalNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const myId = user?.userId || user?.id || "";
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!myId) return;

    let cancelled = false;
    api
      .get<{ unreadCount: number }>("/notifications")
      .then((data) => {
        if (!cancelled) setUnreadCount(data.unreadCount);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [myId]);

  const handleNotification = useCallback(
    (event: Event) => {
      const notification = (
        event as CustomEvent<{ notification: RealtimeNotification }>
      ).detail?.notification;
      if (!notification) return;

      setUnreadCount((prev) => prev + 1);

      const options = {
        title: notification.title,
        description: <NotificationDescription notification={notification} />,
        icon: notificationIcon(notification),
        button: notification.link
          ? {
              title: notification.actionLabel || "Ver",
              onClick: () => {
                router.push(notification.link!);
                if (notification.id) {
                  void api.patch(`/notifications/${notification.id}/read`).catch(() => {});
                }
              },
            }
          : undefined,
      };

      sileo[pickSileoMethod(notification.type)](options);
    },
    [router],
  );

  useEffect(() => {
    if (!myId) return;

    window.addEventListener("codebuddies:notification:new", handleNotification);
    return () => {
      window.removeEventListener("codebuddies:notification:new", handleNotification);
    };
  }, [myId, handleNotification]);

  const resetUnread = useCallback(() => setUnreadCount(0), []);

  return (
    <NotificationsContext.Provider value={{ unreadCount, resetUnread }}>
      {children}
      <Toaster
        position="top-right"
        offset={{ top: 112 }}
        theme={resolvedTheme === "light" || resolvedTheme === "pink" ? "light" : "dark"}
      />
    </NotificationsContext.Provider>
  );
}
