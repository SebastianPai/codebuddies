import {
  Award,
  Bell,
  DoorOpen,
  Gift,
  MessageSquare,
  Target,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

// El backend manda el nombre del ícono como string (ver notificationDefaults()
// en apps/api NotificationsService) — este mapa lo resuelve al componente de
// lucide-react real. "Bell" también es el fallback para tipos no listados.
const ICONS: Record<string, LucideIcon> = {
  Users,
  Target,
  Trophy,
  MessageSquare,
  Award,
  Gift,
  DoorOpen,
  Bell,
};

export function resolveNotificationIcon(name?: string | null): LucideIcon {
  return (name && ICONS[name]) || Bell;
}
