"use client";

import { memo, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { sileo } from "sileo";
import "./LeftSidebar.css";

import AvatarPreview from "../AvatarEditor/AvatarPreview";
import UserBadges from "../shared/UserBadges";
import { useAvatar } from "../../hooks/useAvatar";
import { useSocket } from "../../hooks/useSocket";
import { getNotifications } from "../../network/notifications";
import { getInbox, getMessageRequests } from "../../network/messages";
import { useThemeAsset } from "../../network/themeAssets";
import { ThemeImage } from "../ThemeImage/ThemeImage";
import { useTranslation } from "../../../i18n/useTranslation";

const DEFAULT_LOGO_URL =
  "https://codebuddies-assets.sfo3.cdn.digitaloceanspaces.com/items/1778904692125-bv0f5z.png";

// TODO(producto): reemplazar por el link real de invitación — no hay ninguno
// configurado todavía en ningún .env del monorepo. Mientras tanto el botón
// es funcional (abre un link real) pero apunta a un invite de ejemplo.
const DISCORD_INVITE_URL =
  process.env.NEXT_PUBLIC_DISCORD_URL || "https://discord.gg/codebuddies";

// Anillo alrededor del avatar tipo "battle pass": el color cambia de rango
// cada 10 niveles (bronce/plata/oro/diamante) además de llenarse con el
// progreso hacia el próximo nivel, en vez de solo texto "NIVEL X".
const LEVEL_TIERS = [
  { min: 30, color: "#5eead4", label: "DIAMANTE" },
  { min: 20, color: "#facc15", label: "ORO" },
  { min: 10, color: "#cbd5e1", label: "PLATA" },
  { min: 0, color: "#cd7f32", label: "BRONCE" },
];

function getLevelTier(level: number) {
  return LEVEL_TIERS.find((tier) => level >= tier.min) ?? LEVEL_TIERS[LEVEL_TIERS.length - 1];
}

const LEVEL_TIER_LABEL_KEYS: Record<string, string> = {
  DIAMANTE: "hud.sidebar.tierDiamond",
  ORO: "hud.sidebar.tierGold",
  PLATA: "hud.sidebar.tierSilver",
  BRONCE: "hud.sidebar.tierBronze",
};

type Props = {
  username: string;
  level: number;
  coins: number;
  diamonds: number;

  onGoHome: () => void;
  onOpenPc: () => void;
  onCustomize: () => void;
  onOpenFriends: () => void;
  onOpenMessages: () => void;
  onOpenNotifications: () => void;
  onOpenShop: () => void;
  onOpenMarketplace: () => void;
  onOpenBuildMode: () => void;
  onOpenSettings: () => void;
  onExitGame: () => void;
};

function LeftSidebar({
  username,
  level,
  coins,
  diamonds,
  onGoHome,
  onOpenPc,
  onCustomize,
  onOpenFriends,
  onOpenMessages,
  onOpenNotifications,
  onOpenShop,
  onOpenMarketplace,
  onOpenBuildMode,
  onOpenSettings,
  onExitGame,
}: Props) {
  const t = useTranslation();
  const socket = useSocket();
  const avatar = useAvatar(socket);
  const logoAsset = useThemeAsset("LOGO");

  const progress = (level % 10) * 10;
  const currentXp = progress * 10;
  const nextXp = 1000;
  const levelTier = getLevelTier(level);
  const ringDeg = (progress / 100) * 360;
  const ringStyle = {
    background: `conic-gradient(${levelTier.color} ${ringDeg}deg, rgba(255,255,255,0.14) ${ringDeg}deg)`,
  };

  // =========================
  // BADGES: mensajes / notificaciones sin leer
  // =========================

  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [notifData, inbox, requests] = await Promise.all([
          getNotifications(),
          getInbox(),
          getMessageRequests(),
        ]);
        setUnreadNotifications(notifData.unreadCount);
        setUnreadMessages(
          inbox.reduce((total, conversation) => total + conversation.unreadCount, 0) + requests.length,
        );
      } catch {
        // los badges simplemente no se actualizan este ciclo
      }
    };

    void loadCounts();

    window.addEventListener("codebuddies:notification:new", loadCounts);
    window.addEventListener("codebuddies:message:new", loadCounts);
    window.addEventListener("codebuddies:message:seen", loadCounts);
    window.addEventListener("codebuddies:conversation:deleted", loadCounts);

    return () => {
      window.removeEventListener("codebuddies:notification:new", loadCounts);
      window.removeEventListener("codebuddies:message:new", loadCounts);
      window.removeEventListener("codebuddies:message:seen", loadCounts);
      window.removeEventListener("codebuddies:conversation:deleted", loadCounts);
    };
  }, []);

  type MenuItem = {
    name: string;
    onClick?: () => void;
    danger?: boolean;
    accent?: boolean;
    badge?: number;
    icon: ReactElement;
  };

  const menu: MenuItem[] = [
    {
      name: t("hud.sidebar.home"),
      onClick: onGoHome,
      accent: true,
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
        </svg>
      ),
    },
    {
      name: t("hud.sidebar.openPc"),
      onClick: onOpenPc,
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="4" width="20" height="14" rx="2" />
          <line x1="8" y1="20" x2="16" y2="20" />
        </svg>
      ),
    },
    {
      name: t("hud.sidebar.wardrobe"),
      onClick: onCustomize,
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="5" />
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        </svg>
      ),
    },
    {
      name: t("hud.sidebar.friends"),
      onClick: onOpenFriends,
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      ),
    },
    {
      name: t("hud.sidebar.messages"),
      onClick: onOpenMessages,
      badge: unreadMessages,
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      ),
    },
    {
      name: t("hud.sidebar.notifications"),
      onClick: onOpenNotifications,
      badge: unreadNotifications,
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
    {
      name: t("hud.sidebar.tournaments"),
      // Todavía no existe ningún backend de torneos (sin controller, sin
      // modelo Prisma) — antes este botón no hacía absolutamente nada al
      // clickearlo (ni siquiera un onClick). Este aviso es honesto: informa
      // que viene pronto en vez de fingir que el clic hizo algo.
      onClick: () =>
        sileo.info({
          title: t("hud.sidebar.tournamentsComingSoonTitle"),
          description: t("hud.sidebar.tournamentsComingSoonMessage"),
        }),
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
          <path d="M12 3v18" />
        </svg>
      ),
    },
    {
      name: t("hud.sidebar.shop"),
      onClick: onOpenShop,
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 2L3 7v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-3-5z" />
          <path d="M3 7h18" />
        </svg>
      ),
    },
    {
      name: t("hud.sidebar.build"),
      onClick: onOpenBuildMode,
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 21h18" />
          <path d="M6 21V9l6-4 6 4v12" />
          <path d="M9 21v-6h6v6" />
        </svg>
      ),
    },
    {
      name: t("hud.sidebar.marketplace"),
      onClick: onOpenMarketplace,
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 7h16l-1.5 13h-13L4 7Z" />
          <path d="M8 7a4 4 0 0 1 8 0" />
          <path d="M9 13h6" />
        </svg>
      ),
    },
    {
      name: t("hud.sidebar.settings"),
      onClick: onOpenSettings,
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98" />
        </svg>
      ),
    },
    {
      name: t("hud.sidebar.exit"),
      onClick: onExitGame,
      danger: true,
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 19l-7-7 7-7" />
          <path d="M22 12H10" />
        </svg>
      ),
    },
  ];

  return (
    <div className="left-sidebar">
      <div className="sidebar-shell top-shell">
        {/* HEADER */}
        <div className="sidebar-header">
          <div className="brand-group">
            <ThemeImage
              asset={logoAsset}
              fallbackSrc={DEFAULT_LOGO_URL}
              alt="CodeBuddies"
              size={46}
              className="brand-logo"
            />
            <div className="brand-info">
              <div className="brand-main">
                <span className="brand-code">CODE</span>
                <span className="brand-buddies">BUDDIES</span>
              </div>
              <div className="brand-sub">{t("hud.sidebar.tagline")}</div>
            </div>
          </div>
        </div>

        {/* PROFILE */}
        <div className="profile-card">
          <div className="profile-top">
            <div className="avatar-container">
              <div className="avatar-ring" style={ringStyle}>
                <div className="avatar-ring-inner">
                  <div className="avatar-zoom">
                    <AvatarPreview
                      avatarSlots={avatar?.slots || []}
                      skinColor={avatar?.skinColor}
                      width={78}
                      height={78}
                    />
                  </div>
                </div>
              </div>
              <div className="level-chip" style={{ background: levelTier.color }}>
                {level}
              </div>
            </div>

            <div className="profile-info">
              <h2>
                {username}
                <UserBadges username={username} size={13} />
              </h2>
              <div className="online-row">
                <div className="online-dot" /> {t("hud.sidebar.online")}
              </div>
              <div className="special-tag" style={{ background: levelTier.color }}>
                {t(LEVEL_TIER_LABEL_KEYS[levelTier.label] ?? "hud.sidebar.tierBronze")}
              </div>
            </div>
          </div>

          <div className="profile-bottom">
            <div className="xp-header">
              <span>{t("hud.sidebar.level", { level })}</span>
              <span>
                {currentXp}/{nextXp} XP
              </span>
            </div>
            <div className="xp-bar">
              <div className="xp-fill" style={{ width: `${progress}%` }} />
            </div>

            <div className="currency-row">
              <div className="currency-card">
                <span className="currency-label">{t("hud.sidebar.coins")}</span>
                <strong>{coins.toLocaleString()}</strong>
              </div>
              <div className="currency-card">
                <span className="currency-label">{t("hud.sidebar.diamonds")}</span>
                <strong>{diamonds.toLocaleString()}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MENU */}
      <div className="sidebar-shell menu-shell">
        <div className="menu-card">
          {menu.map((item) => (
            <button
              key={item.name}
              className={`menu-btn ${item.danger ? "danger-btn" : ""} ${item.accent ? "accent-btn" : ""}`}
              onClick={item.onClick}
            >
              <div className="menu-icon">
                {item.icon}
                {!!item.badge && (
                  <span className="menu-badge">{item.badge > 99 ? "99+" : item.badge}</span>
                )}
              </div>
              <span>{item.name}</span>
            </button>
          ))}
        </div>

        {/* COMUNIDAD — antes este espacio lo ocupaba un botón "GitHub" sin
            onClick (no hacía nada al clickearlo); ahora es un link real
            externo a Discord, aparte del menú de navegación interna. */}
        <a
          className="discord-card"
          href={DISCORD_INVITE_URL}
          target="_blank"
          rel="noreferrer"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="discord-icon">
            <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.076.076 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419z" />
          </svg>
          <div className="discord-info">
            <span className="discord-cta">{t("hud.sidebar.discordCta")}</span>
            <strong>{t("hud.sidebar.discordLabel")}</strong>
          </div>
        </a>
      </div>
    </div>
  );
}

export default memo(LeftSidebar);
