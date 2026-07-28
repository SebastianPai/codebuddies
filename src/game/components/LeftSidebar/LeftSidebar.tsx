"use client";

import { memo, useEffect, useState } from "react";
import type { ReactElement } from "react";
import "./LeftSidebar.css";

import AvatarPreview from "../AvatarEditor/AvatarPreview";
import UserBadges from "../shared/UserBadges";
import { useAvatar } from "../../hooks/useAvatar";
import { useSocket } from "../../hooks/useSocket";
import { getNotifications } from "../../network/notifications";
import { getInbox, getMessageRequests } from "../../network/messages";

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

type Props = {
  username: string;
  level: number;
  coins: number;
  diamonds: number;

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
  const socket = useSocket();
  const avatar = useAvatar(socket);

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
    badge?: number;
    icon: ReactElement;
  };

  const menu: MenuItem[] = [
    {
      name: "Abrir PC",
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
      name: "Vestidor",
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
      name: "Amigos",
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
      name: "Mensajes",
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
      name: "Notificaciones",
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
      name: "GitHub",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 4c-.27-.82-1.02-1.4-1.9-1.4-.84 0-1.6.55-1.87 1.38A5.44 5.44 0 0 0 12 2.77a5.44 5.44 0 0 0-5.14 3.23c-.27-.83-1.03-1.4-1.87-1.4-.88 0-1.63.58-1.9 1.4A5.07 5.07 0 0 0 4 4.77c-.28.1-.55.24-.81.4z" />
        </svg>
      ),
    },
    {
      name: "Torneos",
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
      name: "Tienda",
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
      name: "Construir",
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
      name: "Marketplace",
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
      name: "Ajustes",
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
      name: "Salir",
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
            <img
              className="brand-logo"
              src="https://codebuddies-assets.sfo3.cdn.digitaloceanspaces.com/items/1778904692125-bv0f5z.png"
              alt="CodeBuddies"
            />
            <div className="brand-info">
              <div className="brand-main">
                <span className="brand-code">CODE</span>
                <span className="brand-buddies">BUDDIES</span>
              </div>
              <div className="brand-sub">CONECTA · APRENDE · CRECE</div>
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
                <div className="online-dot" /> ONLINE
              </div>
              <div className="special-tag" style={{ background: levelTier.color }}>
                {levelTier.label}
              </div>
            </div>
          </div>

          <div className="profile-bottom">
            <div className="xp-header">
              <span>NIVEL {level}</span>
              <span>
                {currentXp}/{nextXp} XP
              </span>
            </div>
            <div className="xp-bar">
              <div className="xp-fill" style={{ width: `${progress}%` }} />
            </div>

            <div className="currency-row">
              <div className="currency-card">
                <span className="currency-label">COINS</span>
                <strong>{coins.toLocaleString()}</strong>
              </div>
              <div className="currency-card">
                <span className="currency-label">DIAMONDS</span>
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
              className={`menu-btn ${item.danger ? "danger-btn" : ""}`}
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
      </div>
    </div>
  );
}

export default memo(LeftSidebar);
