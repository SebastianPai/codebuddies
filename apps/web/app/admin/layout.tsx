"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  Code,
  Terminal,
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
  DollarSign,
  GitBranch,
  Shield,
  AlertTriangle,
  Activity,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Coins,
  CreditCard,
  Webhook,
  GitCompare,
  ShoppingBag,
  Search,
  ChevronRight,
  ShieldAlert,
  Gift,
} from "lucide-react";
import { useTranslation } from "../../src/i18n/useTranslation";
import { useDisclosure } from "../../src/shared/hooks/use-disclosure";
import { CommandPalette } from "../../src/features/admin/command-palette";

interface AdminNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface AdminNavSection {
  id: string;
  title: string;
  items: AdminNavItem[];
}

const COMPACT_STORAGE_KEY = "admin-sidebar-compact";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslation();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

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

  useEffect(() => {
    const stored = window.localStorage.getItem(COMPACT_STORAGE_KEY);
    if (stored !== null) setCompact(stored === "1");
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggleCompact = () => {
    setCompact((prev) => {
      const next = !prev;
      window.localStorage.setItem(COMPACT_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  // Estructura jerárquica del panel: 8 grupos temáticos en vez de una lista
  // plana de ~35 links al mismo nivel. Cada href apunta a una ruta real que
  // ya existe -- no hay entradas a páginas que todavía no se construyeron
  // (Roles/Permisos, Incidencias, Salud del sistema, etc. quedan afuera
  // hasta que existan, no como links rotos).
  const sections: AdminNavSection[] = useMemo(
    () => [
      {
        id: "users",
        title: t("admin.navUsers"),
        items: [
          { href: "/admin/users", label: t("site.users"), icon: <User size={18} /> },
          {
            href: "/admin/referrals",
            label: t("dashboard.referrals"),
            icon: <Users size={18} />,
          },
        ],
      },
      {
        id: "monetization",
        title: t("admin.navMonetization"),
        items: [
          {
            href: "/admin/payments",
            label: t("admin.paymentsNav"),
            icon: <CreditCard size={18} />,
          },
          {
            href: "/admin/coins",
            label: t("admin.coinsEconomyNav"),
            icon: <Coins size={18} />,
          },
          {
            href: "/admin/premium",
            label: t("admin.premiumSubscriptionsNav"),
            icon: <Crown size={18} />,
          },
          {
            href: "/admin/pricing",
            label: t("admin.pricingPlansNav"),
            icon: <DollarSign size={18} />,
          },
          {
            href: "/admin/webhook-events",
            label: t("admin.webhooksNav"),
            icon: <Webhook size={18} />,
          },
          {
            href: "/admin/reconciliation",
            label: t("admin.reconciliationNav"),
            icon: <GitCompare size={18} />,
          },
          {
            href: "/admin/promo-codes",
            label: t("admin.promoCodesTitle"),
            icon: <Gift size={18} />,
          },
        ],
      },
      {
        id: "content",
        title: t("admin.navContent"),
        items: [
          { href: "/admin/items", label: t("items.itemsTitle"), icon: <Palette size={18} /> },
          {
            href: "/admin/animations",
            label: t("admin.animationsNav"),
            icon: <Image size={18} />,
          },
          {
            href: "/admin/textures",
            label: t("admin.texturesNav"),
            icon: <Palette size={18} />,
          },
          {
            href: "/admin/world-items",
            label: t("items.worldItems"),
            icon: <MapPin size={18} />,
          },
          {
            href: "/admin/item-sprites",
            label: t("admin.itemSpritesNav"),
            icon: <User size={18} />,
          },
          {
            href: "/admin/marketplace",
            label: t("site.marketplaceTitleNav"),
            icon: <ShoppingBag size={18} />,
          },
          { href: "/admin/badges", label: t("gamification.achievements"), icon: <Award size={18} /> },
          {
            href: "/admin/theme-assets",
            label: t("admin.themeAssetsNav"),
            icon: <Image size={18} />,
          },
          { href: "/admin/codestudio", label: "CodeStudio", icon: <BarChart3 size={18} /> },
        ],
      },
      {
        id: "companions",
        title: t("admin.navCompanions"),
        items: [
          { href: "/admin/pets", label: t("admin.petsTitle"), icon: <Gift size={18} /> },
          { href: "/admin/butler", label: t("admin.butlerTitle"), icon: <Users size={18} /> },
        ],
      },
      {
        id: "education",
        title: t("admin.navEducation"),
        items: [
          { href: "/admin/modules", label: t("admin.modules"), icon: <Layers size={18} /> },
          { href: "/admin/courses", label: t("admin.courses"), icon: <BookOpen size={18} /> },
          {
            href: "/admin/lessons",
            label: t("admin.lessonsPage"),
            icon: <Terminal size={18} />,
          },
          { href: "/admin/exercises", label: t("admin.exercises"), icon: <Code size={18} /> },
          {
            href: "/admin/learning-paths",
            label: t("admin.learningPathsNav"),
            icon: <GitBranch size={18} />,
          },
          {
            href: "/admin/course-categories",
            label: t("admin.courseCategoriesNav"),
            icon: <Layers size={18} />,
          },
          {
            href: "/admin/certificates",
            label: t("site.certificates"),
            icon: <Award size={18} />,
          },
          {
            href: "/admin/student-experience",
            label: t("admin.studentExperienceNav"),
            icon: <Activity size={18} />,
          },
        ],
      },
      {
        id: "communication",
        title: t("admin.navCommunication"),
        items: [
          {
            href: "/admin/email-templates",
            label: t("admin.emailTemplatesTitle"),
            icon: <Mail size={18} />,
          },
          {
            href: "/admin/email-campaigns",
            label: t("admin.emailCampaignsTitle"),
            icon: <Mail size={18} />,
          },
          {
            href: "/admin/email-history",
            label: t("site.emailHistory"),
            icon: <Mail size={18} />,
          },
          {
            href: "/admin/notifications",
            label: t("admin.notificationsStubTitle"),
            icon: <Bell size={18} />,
          },
          {
            href: "/admin/community",
            label: t("admin.communityStubTitle"),
            icon: <Users size={18} />,
          },
        ],
      },
      {
        id: "support",
        title: t("admin.navSupport"),
        items: [
          {
            href: "/admin/content-reports",
            label: t("admin.contentReportsNav"),
            icon: <AlertTriangle size={18} />,
          },
          {
            href: "/admin/fraud-alerts",
            label: t("admin.fraudAlertsNav"),
            icon: <ShieldAlert size={18} />,
          },
        ],
      },
      {
        id: "system",
        title: t("admin.navSystem"),
        items: [
          {
            href: "/admin/gamification",
            label: t("gamification.title"),
            icon: <Target size={18} />,
          },
          {
            href: "/admin/rankings",
            label: t("admin.rankingsStubTitle"),
            icon: <BarChart3 size={18} />,
          },
          {
            href: "/admin/audit-log",
            label: t("admin.auditLogNav"),
            icon: <Shield size={18} />,
          },
          {
            href: "/admin/layouts",
            label: t("admin.layoutsTitle"),
            icon: <MapPin size={18} />,
          },
          {
            href: "/admin/backgrounds",
            label: t("admin.backgroundsNav"),
            icon: <Image size={18} />,
          },
          {
            href: "/admin/settings",
            label: t("admin.settingsNav"),
            icon: <Settings size={18} />,
          },
        ],
      },
    ],
    [t],
  );

  const flatItems = useMemo(
    () => sections.flatMap((section) => section.items.map((item) => ({ ...item, section }))),
    [sections],
  );

  const activeItem = useMemo(
    () =>
      flatItems.find(
        (item) => pathname === item.href || pathname?.startsWith(`${item.href}/`),
      ),
    [flatItems, pathname],
  );

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
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        sections={sections}
      />

      {/* SIDEBAR */}

      <aside
        className={`${compact ? "w-16" : "w-72"} border-r border-zinc-800 bg-black flex flex-col transition-[width] duration-150`}
      >
        {/* Logo */}

        <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-2">
          {!compact && (
            <div>
              <h1 className="text-xl font-bold text-yellow-400">CodeBuddies</h1>
              <p className="text-xs text-zinc-400">{t("admin.panel")}</p>
            </div>
          )}
          <button
            type="button"
            onClick={toggleCompact}
            title={compact ? t("admin.expandModeLabel") : t("admin.compactModeLabel")}
            className="p-1.5 rounded text-zinc-500 hover:bg-zinc-900 hover:text-yellow-400 transition"
          >
            {compact ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>
        </div>

        {/* SEARCH / COMMAND PALETTE TRIGGER */}

        <div className="p-3 border-b border-zinc-800">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            title={t("admin.searchAdminPlaceholder")}
            className={`flex items-center gap-2 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 transition ${compact ? "justify-center" : ""}`}
          >
            <Search size={14} />
            {!compact && (
              <>
                <span className="flex-1 text-left">{t("admin.searchAdminPlaceholder")}</span>
                <kbd className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-500">
                  Ctrl K
                </kbd>
              </>
            )}
          </button>
        </div>

        {/* NAV */}

        <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
          <SidebarLink
            href="/admin"
            icon={<LayoutDashboard size={18} />}
            label={t("admin.dashboard")}
            compact={compact}
          />

          {sections.map((section) => (
            <SidebarSection
              key={section.id}
              id={section.id}
              title={section.title}
              compact={compact}
            >
              {section.items.map((item) => (
                <SidebarLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  compact={compact}
                />
              ))}
            </SidebarSection>
          ))}
        </nav>

        {/* USER */}

        <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
          {!compact && (
            <div>
              <p className="text-sm font-medium">{user.username}</p>
              <p className="text-xs text-zinc-500">{t("admin.adminBadgeLabel")}</p>
            </div>
          )}

          <button
            onClick={logout}
            title={t("dashboard.logout")}
            className="p-2 hover:text-red-400 transition"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* CONTENT */}

      <div className="flex-1 flex flex-col overflow-hidden">
        {activeItem && (
          <div className="flex items-center gap-1.5 border-b border-zinc-900 bg-black/60 px-6 py-2.5 text-xs text-zinc-500">
            <span>{t("admin.breadcrumbHome")}</span>
            <ChevronRight size={12} />
            <span>{activeItem.section.title}</span>
            <ChevronRight size={12} />
            <span className="text-zinc-300">{activeItem.label}</span>
          </div>
        )}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function SidebarSection({
  id,
  title,
  compact,
  children,
}: {
  id: string;
  title: string;
  compact: boolean;
  children: React.ReactNode;
}) {
  const storageKey = `admin-sidebar-section:${id}`;
  const { isOpen, setIsOpen } = useDisclosure(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored !== null) setIsOpen(stored === "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      window.localStorage.setItem(storageKey, next ? "1" : "0");
      return next;
    });
  };

  if (compact) {
    // En modo compacto no hay lugar para el encabezado de sección -- se
    // muestran todos los items siempre, cada uno con tooltip vía title.
    return <div className="space-y-1">{children}</div>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        className="mb-1 flex w-full items-center justify-between px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 transition hover:text-zinc-300"
      >
        {title}
        <ChevronDown
          size={14}
          className={`transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}
        />
      </button>

      {isOpen && <div className="space-y-1">{children}</div>}
    </div>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  compact,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  compact: boolean;
}) {
  const pathname = usePathname();
  const active =
    pathname === href || (href !== "/admin" && pathname?.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      title={compact ? label : undefined}
      className={`
      flex items-center gap-3
      px-3 py-2
      rounded-md
      text-sm
      transition
      ${compact ? "justify-center" : ""}
      ${
        active
          ? "bg-yellow-400/10 text-yellow-400 font-medium"
          : "text-zinc-300 hover:bg-zinc-900 hover:text-yellow-400"
      }
      `}
    >
      {icon}
      {!compact && label}
    </Link>
  );
}
