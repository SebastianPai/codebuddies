"use client";

// Sin UI propia: monta el <Toaster/> de sileo una sola vez y traduce cada
// `codebuddies:notification:new` (emitido por network/realtime.ts) en un
// toast. Misma lógica de "tipo de notificación -> tono" que
// apps/web/components/notifications/GlobalNotificationsProvider.tsx —
// duplicada intencionalmente: apps/game y apps/web no comparten un paquete
// de UI hoy, así que no vale la pena introducir uno solo para esto.

import { useEffect } from "react";
import { sileo, Toaster } from "sileo";
import { GameNotification, markNotificationRead } from "../../network/notifications";
import { audioManager } from "../../audio/AudioManager";
import { resolveNotificationIcon } from "../../utils/notificationIcons";
import { useTranslation } from "../../../i18n/useTranslation";

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

// Antes TODAS las notificaciones (subir de nivel, desbloquear un logro, que
// te acepten una solicitud de amistad) reproducían el mismo "notify"
// genérico. Ahora los dos eventos de progreso más importantes tienen su
// propio cue distinto; el resto sigue con la campanita de siempre.
function pickSound(type: string): "levelUp" | "achievement" | "notify" {
  if (type === "LEVEL_UPDATED") return "levelUp";
  if (type === "ACHIEVEMENT_UNLOCKED") return "achievement";
  return "notify";
}

export default function NotificationsToastBridge() {
  const t = useTranslation();

  useEffect(() => {
    const handleNotification = (event: Event) => {
      const notification = (event as CustomEvent<{ notification: GameNotification }>).detail
        ?.notification;
      if (!notification) return;

      const sound = pickSound(notification.type);
      audioManager.play(sound);
      if (sound === "levelUp" || sound === "achievement") {
        window.dispatchEvent(new CustomEvent("fx:confetti"));
      }

      const friend = notification.metadata?.friend;
      const Icon = resolveNotificationIcon(notification.icon);

      sileo[pickSileoMethod(notification.type)]({
        title: notification.title,
        description: notification.body ?? undefined,
        icon: friend?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={friend.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: 999, objectFit: "cover" }} />
        ) : (
          <Icon size={18} />
        ),
        button: {
          title: t("notifications.markReadButton"),
          onClick: () => {
            void markNotificationRead(notification.id).catch(() => {});
          },
        },
      });
    };

    window.addEventListener("codebuddies:notification:new", handleNotification);
    return () => window.removeEventListener("codebuddies:notification:new", handleNotification);
  }, [t]);

  return <Toaster position="top-right" offset={{ top: 84 }} theme="dark" />;
}
