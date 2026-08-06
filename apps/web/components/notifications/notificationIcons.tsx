import {
  Award,
  Bell,
  BookOpen,
  Flame,
  Gift,
  MessageSquare,
  Target,
  Trophy,
  Users,
} from "lucide-react";

export const notificationIconByName: Record<string, React.ReactNode> = {
  Bell: <Bell size={18} />,
  Target: <Target size={18} />,
  Trophy: <Trophy size={18} />,
  Users: <Users size={18} />,
  Gift: <Gift size={18} />,
  Award: <Award size={18} />,
  BookOpen: <BookOpen size={18} />,
  MessageSquare: <MessageSquare size={18} />,
  Flame: <Flame size={18} />,
};

export function getNotificationIcon(name: string): React.ReactNode {
  return notificationIconByName[name] ?? notificationIconByName.Bell;
}
