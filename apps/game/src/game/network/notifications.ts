// network/notifications.ts — cliente REST de /notifications (ver apps/api NotificationsController)

import { apiGet, apiPatch } from "./http";

export type GameNotification = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  category: string;
  priority: string;
  icon: string;
  link?: string | null;
  actionLabel?: string | null;
  relativeTime: string;
  read: boolean;
  metadata?: {
    friend?: { id: string; username: string; avatarUrl: string | null };
    [key: string]: unknown;
  } | null;
};

export function getNotifications() {
  return apiGet<{ items: GameNotification[]; unreadCount: number }>("/notifications");
}

export function markNotificationRead(id: string) {
  return apiPatch(`/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return apiPatch("/notifications/read-all");
}
