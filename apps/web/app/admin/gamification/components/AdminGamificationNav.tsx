"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Calendar, FolderTree, Gift, Settings, Target, Trophy } from "lucide-react";
import { useTranslation } from "../../../../src/i18n/useTranslation";

const links = [
  { href: "/admin/gamification", labelKey: "site.navDashboard", icon: <BarChart3 size={16} /> },
  { href: "/admin/gamification/missions", labelKey: "gamification.missions", icon: <Target size={16} /> },
  { href: "/admin/gamification/achievements", labelKey: "gamification.achievements", icon: <Trophy size={16} /> },
  { href: "/admin/gamification/rewards", labelKey: "gamification.rewardsNav", icon: <Gift size={16} /> },
  { href: "/admin/gamification/categories", labelKey: "gamification.categories", icon: <FolderTree size={16} /> },
  { href: "/admin/gamification/events", labelKey: "gamification.events", icon: <Calendar size={16} /> },
  { href: "/admin/gamification/seasons", labelKey: "gamification.seasons", icon: <Calendar size={16} /> },
  { href: "/admin/gamification/settings", labelKey: "admin.settingsNav", icon: <Settings size={16} /> },
];

export default function AdminGamificationNav() {
  const pathname = usePathname();
  const t = useTranslation();

  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-zinc-800 bg-black px-6 py-3">
      {links.map((link) => {
        const active = pathname === link.href || (link.href !== "/admin/gamification" && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition ${
              active ? "bg-yellow-400 text-black" : "border border-zinc-800 text-zinc-300 hover:text-yellow-400"
            }`}
          >
            {link.icon}
            {t(link.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
