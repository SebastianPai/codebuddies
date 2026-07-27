"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  Code,
  Terminal,
  Zap,
  Tag,
  Award,
  User,
  Image,
  Palette,
  BarChart3,
  Settings,
  LogOut,
  MapPin,
  Mail,
  Bell,
  Crown,
  Users,
  Target,
} from "lucide-react";
import { useTranslation } from "../../src/i18n/useTranslation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslation();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace("/login?redirect=/admin");
        return;
      }

      if (user?.role !== "ADMIN") {
        router.replace("/");
      }
    }
  }, [loading, isAuthenticated, user, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        {t("admin.loadingAccess")}
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div className="flex h-screen bg-black text-white">
      {/* SIDEBAR */}

      <aside className="w-72 border-r border-zinc-800 bg-black flex flex-col">
        {/* Logo */}

        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-bold text-yellow-400">CodeBuddies</h1>
          <p className="text-xs text-zinc-400">{t("admin.panel")}</p>
        </div>

        {/* NAV */}

        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {/* DASHBOARD */}

          <SidebarLink
            href="/admin"
            icon={<LayoutDashboard size={18} />}
            label={t("admin.dashboard")}
          />

          {/* CONTENIDO */}

          <SidebarSection title={t("admin.content")}>
            <SidebarLink
              href="/admin/modules"
              icon={<Layers size={18} />}
              label={t("admin.modules")}
            />

            <SidebarLink
              href="/admin/courses"
              icon={<BookOpen size={18} />}
              label={t("admin.courses")}
            />

            <SidebarLink
              href="/admin/lessons"
              icon={<Terminal size={18} />}
              label={t("admin.lessonsPage")}
            />

            <SidebarLink
              href="/admin/exercises"
              icon={<Code size={18} />}
              label={t("admin.exercises")}
            />

            <SidebarLink
              href="/admin/languages"
              icon={<Terminal size={18} />}
              label={t("admin.languagesNav")}
            />
          </SidebarSection>

          {/* GAMIFICACION */}

          <SidebarSection title={t("gamification.title")}>
            <SidebarLink
              href="/admin/gamification"
              icon={<Target size={18} />}
              label={t("gamification.title")}
            />

            <SidebarLink
              href="/admin/powers"
              icon={<Zap size={18} />}
              label={t("admin.powersNav")}
            />

            <SidebarLink
              href="/admin/badges"
              icon={<Award size={18} />}
              label={t("gamification.achievements")}
            />

            <SidebarLink
              href="/admin/tags"
              icon={<Tag size={18} />}
              label={t("admin.tagsNav")}
            />
          </SidebarSection>

          {/* PERSONALIZACION */}

          <SidebarSection title={t("admin.personalizationNav")}>
            <SidebarLink
              href="/admin/animations"
              icon={<Image size={18} />}
              label={t("admin.animationsNav")}
            />

            <SidebarLink
              href="/admin/items"
              icon={<Palette size={18} />}
              label={t("items.itemsTitle")}
            />

            <SidebarLink
              href="/admin/textures"
              icon={<Palette size={18} />}
              label={t("admin.texturesNav")}
            />

            <SidebarLink
              href="/admin/world-items"
              icon={<MapPin size={18} />}
              label={t("items.worldItems")}
            />

            <SidebarLink
              href="/admin/item-sprites"
              icon={<User size={18} />}
              label={t("admin.itemSpritesNav")}
            />

            <SidebarLink
              href="/admin/marketplace"
              icon={<Palette size={18} />}
              label={t("site.marketplaceTitleNav")}
            />

            <SidebarLink
              href="/admin/badges"
              icon={<Award size={18} />}
              label="Insignias"
            />

            <SidebarLink
              href="/admin/codestudio"
              icon={<BarChart3 size={18} />}
              label="CodeStudio"
            />
          </SidebarSection>

          {/* SISTEMA */}

          <SidebarSection title={t("admin.system")}>
            <SidebarLink
              href="/admin/users"
              icon={<User size={18} />}
              label={t("site.users")}
            />

            <SidebarLink
              href="/admin/certificates"
              icon={<Award size={18} />}
              label={t("site.certificates")}
            />

            <SidebarLink
              href="/admin/premium"
              icon={<Crown size={18} />}
              label={t("admin.premiumStubTitle")}
            />

            <SidebarLink
              href="/admin/rankings"
              icon={<BarChart3 size={18} />}
              label={t("admin.rankingsStubTitle")}
            />

            <SidebarLink
              href="/admin/referrals"
              icon={<Users size={18} />}
              label={t("dashboard.referrals")}
            />

            <SidebarLink
              href="/admin/email-templates"
              icon={<Mail size={18} />}
              label={t("admin.emailTemplatesTitle")}
            />

            <SidebarLink
              href="/admin/email-campaigns"
              icon={<Mail size={18} />}
              label={t("admin.emailCampaignsTitle")}
            />

            <SidebarLink
              href="/admin/email-history"
              icon={<Mail size={18} />}
              label={t("site.emailHistory")}
            />

            <SidebarLink
              href="/admin/community"
              icon={<Users size={18} />}
              label={t("admin.communityStubTitle")}
            />

            <SidebarLink
              href="/admin/notifications"
              icon={<Bell size={18} />}
              label={t("admin.notificationsStubTitle")}
            />

            <SidebarLink
              href="/admin/stats"
              icon={<BarChart3 size={18} />}
              label={t("admin.statsNav")}
            />

            <SidebarLink
              href="/admin/settings"
              icon={<Settings size={18} />}
              label={t("admin.settingsNav")}
            />
          </SidebarSection>

          <SidebarSection title={t("admin.maps")}>
            <SidebarLink
              href="/admin/layouts"
              icon={<MapPin size={18} />}
              label={t("admin.layoutsTitle")}
            />
            <SidebarLink
              href="/admin/backgrounds"
              icon={<Image size={18} />}
              label={t("admin.backgroundsNav")}
            />
          </SidebarSection>
        </nav>

        {/* USER */}

        <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{user.username}</p>
            <p className="text-xs text-zinc-500">{t("admin.adminBadgeLabel")}</p>
          </div>

          <button onClick={logout} className="p-2 hover:text-red-400">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* CONTENT */}

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase text-zinc-500 mb-2 px-3">{title}</p>

      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SidebarLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="
      flex items-center gap-3
      px-3 py-2
      rounded-md
      text-sm
      text-zinc-300
      hover:bg-zinc-900
      hover:text-yellow-400
      transition
      "
    >
      {icon}
      {label}
    </Link>
  );
}
