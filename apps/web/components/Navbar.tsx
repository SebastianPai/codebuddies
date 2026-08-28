"use client";

import Link from "next/link";
import { useAuth } from "../hooks/useAuth";
import {
  Moon,
  Sun,
  Menu,
  X,
  User,
  LogOut,
  LogIn,
  UserPlus,
  Settings,
  BookOpen,
  Sparkles,
  Bell,
  MessageSquare,
  Users,
  Trophy,
  Award,
  Target,
  Gift,
  Home,
  GraduationCap,
  Tag,
  BarChart3,
  Globe,
  ChevronDown,
  Shield,
  Zap,
  Flame,
  Gamepad2,
  CreditCard,
  Ticket,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { useReward } from "../contexts/RewardContext";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "../src/i18n/useTranslation";
import { useLanguage, type Lang } from "../src/i18n/LanguageContext";
import { getRealtimeUrl, getGameUrl } from "@/config/env";
import { useGlobalNotifications } from "./notifications/GlobalNotificationsProvider";
import { useThemeAsset } from "../hooks/useThemeAsset";
import { ThemeImage, THEME_IMAGE_SPRITE_KEYFRAMES } from "./ThemeImage";
import { RainbowButton } from "@/shared/ui/rainbow-button";
import { CurrencyIcon } from "@/shared/ui/currency-icon";
import { RarityText } from "@/shared/ui/rarity-text";

const INACTIVE_MS = 5 * 60 * 1000;
const PRESENCE_SESSION_KEY = "codebuddies:presence-session-id";

const LANGUAGES = [
  { code: "es", short: "ES", flag: "🇪🇸", label: "Español" },
  { code: "en-us", short: "EN", flag: "🇺🇸", label: "English" },
  { code: "de", short: "DE", flag: "🇩🇪", label: "Deutsch" },
];

const mobilePanelVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
};

const mobileItemVariants = {
  hidden: { opacity: 0, y: -8 },
  show: { opacity: 1, y: 0 },
};

type Translate = ReturnType<typeof useTranslation>;

export default function Navbar() {
  const realtimeUrl = getRealtimeUrl();
  const { theme, setTheme } = useTheme();
  const t = useTranslation();

  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [rewardVisible, setRewardVisible] = useState(false);

  const languageContext = useLanguage();
  const lang = languageContext?.lang ?? "es";

  const { user, isAuthenticated, logout, loading } = useAuth();
  const { unreadCount, resetUnread } = useGlobalNotifications();
  const logoAsset = useThemeAsset("LOGO");
  const pathname = usePathname();
  const { reward } = useReward();
  const menuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const presenceRef = useRef<EventSource | null>(null);
  const inactiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const changeLanguage = (newLang: string) => {
    languageContext?.changeLanguage(newLang as Lang);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const mountTimer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(mountTimer);
  }, []);

  // Collapse the pill shell once the page scrolls past the top.
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close every open panel whenever the route changes.
  useEffect(() => {
    setIsMobileOpen(false);
    setIsUserMenuOpen(false);
    setIsLangMenuOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileOpen(false);
        setIsUserMenuOpen(false);
        setIsLangMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getPresenceSessionId = useCallback(() => {
    let sessionId = sessionStorage.getItem(PRESENCE_SESSION_KEY);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(PRESENCE_SESSION_KEY, sessionId);
    }
    return sessionId;
  }, []);

  const markOffline = useCallback(() => {
    const token = localStorage.getItem("token");
    const sessionId = sessionStorage.getItem(PRESENCE_SESSION_KEY);
    presenceRef.current?.close();
    presenceRef.current = null;
    if (token && sessionId) {
      navigator.sendBeacon?.(
        `${realtimeUrl}/realtime/offline?token=${encodeURIComponent(token)}&sessionId=${encodeURIComponent(sessionId)}`,
      );
    }
  }, []);

  const connectPresence = useCallback(() => {
    if (!isAuthenticated || !user) return;
    const token = localStorage.getItem("token");
    if (!token || presenceRef.current) return;

    const sessionId = getPresenceSessionId();
    const source = new EventSource(
      `${realtimeUrl}/realtime/events?token=${encodeURIComponent(token)}&sessionId=${encodeURIComponent(sessionId)}`,
    );
    presenceRef.current = source;

    [
      "presence:update",
      "friendship:request",
      "friendship:accepted",
      "message:new",
      "message:seen",
      "message:delivered",
      "message:typing",
      "message:reaction",
      "conversation:deleted",
      "notification:new",
    ].forEach((eventName) => {
      source.addEventListener(eventName, (event) => {
        window.dispatchEvent(
          new CustomEvent(`codebuddies:${eventName}`, {
            detail: JSON.parse((event as MessageEvent).data),
          }),
        );
      });
    });
  }, [getPresenceSessionId, isAuthenticated, user]);

  const resetPresenceInactivity = useCallback(() => {
    connectPresence();
    if (inactiveTimerRef.current) clearTimeout(inactiveTimerRef.current);
    inactiveTimerRef.current = setTimeout(markOffline, INACTIVE_MS);
  }, [connectPresence, markOffline]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      markOffline();
      return;
    }

    connectPresence();
    resetPresenceInactivity();
    const activityEvents = ["mousemove", "keydown", "click", "touchstart", "visibilitychange"];
    activityEvents.forEach((name) =>
      window.addEventListener(name, resetPresenceInactivity, { passive: true }),
    );
    window.addEventListener("beforeunload", markOffline);

    return () => {
      activityEvents.forEach((name) =>
        window.removeEventListener(name, resetPresenceInactivity),
      );
      window.removeEventListener("beforeunload", markOffline);
      if (inactiveTimerRef.current) clearTimeout(inactiveTimerRef.current);
    };
  }, [
    connectPresence,
    isAuthenticated,
    markOffline,
    resetPresenceInactivity,
    user,
  ]);

  useEffect(() => {
    if (reward) {
      const showTimer = window.setTimeout(() => setRewardVisible(true), 0);

      const timer = setTimeout(() => {
        setRewardVisible(false);
      }, 3500);

      return () => {
        window.clearTimeout(showTimer);
        clearTimeout(timer);
      };
    }
  }, [reward]);

  if (!mounted) return null;

  const displayName = user?.username || user?.email?.split("@")[0] || t("referrals.user");
  const isAdmin = user?.role === "ADMIN";
  const handleLogout = () => {
    markOffline();
    logout();
  };

  const primaryLinks = [
    { href: "/", label: t("navbar.home"), icon: <Home size={16} /> },
    { href: "/courses", label: t("navbar.courses"), icon: <GraduationCap size={16} /> },
    { href: "/pricing", label: t("navbar.pricing"), icon: <Tag size={16} /> },
    { href: "/rankings", label: t("navbar.rankings"), icon: <BarChart3 size={16} /> },
  ];

  const currentLang = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  const shapeClass = isScrolled
    ? "w-[95%] max-w-5xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
    : isMobileOpen
      ? "w-full max-w-7xl rounded-t-[2.6rem] rounded-b-3xl shadow-[0_15px_40px_rgba(0,0,0,0.25)]"
      : "w-full max-w-7xl rounded-[2.6rem] shadow-[0_15px_40px_rgba(0,0,0,0.25)]";

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center pt-6 px-4 pointer-events-none">
      <nav
        className={`
        pointer-events-auto relative flex flex-col transition-[width,border-radius,box-shadow,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
        backdrop-blur-xl
        bg-[rgba(var(--card),0.65)]
        ring-1 ring-white/10
        ${shapeClass}
        ${rewardVisible ? "scale-[1.04] shadow-[0_40px_120px_rgba(255,215,0,0.35)] animate-pulse" : ""}
        `}
      >
        <div className="flex justify-between items-center h-[72px] px-6 sm:px-10">
          <style>{THEME_IMAGE_SPRITE_KEYFRAMES}</style>
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 overflow-hidden">
              <ThemeImage
                asset={logoAsset}
                fallbackSrc="/robot-head.png"
                alt={t("navbar.home")}
                size={40}
                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
              />
            </div>

            <span className="text-xl font-bold tracking-tight text-[rgb(var(--text))]">
              {t("navbar.brandCode")}
              <span className="cb-fx-text-electric">{t("navbar.brandBuddies")}</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {primaryLinks.map((link) => (
              <NavLink key={link.href} href={link.href} active={pathname === link.href}>
                {link.label}
              </NavLink>
            ))}

            <RainbowButton
              href={getGameUrl()}
              text={t("navbar.playGame")}
              icon={<Gamepad2 size={16} className="text-[rgb(var(--text))]" />}
              className="ml-1"
            />

            <div className="w-[1px] h-6 bg-[rgb(var(--border))] mx-3" />

            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setIsLangMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={isLangMenuOpen}
                aria-label={t("navbar.language")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-[rgb(var(--secondary-text))] hover:text-[rgb(var(--text))] hover:bg-[rgba(var(--background),0.6)] transition-colors"
              >
                <Globe size={15} />
                {currentLang.short}
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${isLangMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {isLangMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-40 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-[0_18px_60px_rgba(0,0,0,0.45)] py-1.5 z-50"
                  >
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => {
                          changeLanguage(l.code);
                          setIsLangMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-sm font-semibold transition-colors ${
                          lang === l.code
                            ? "text-[rgb(var(--primary))] bg-[rgb(var(--primary))]/10"
                            : "text-[rgb(var(--text))] hover:bg-[rgba(var(--background),0.6)]"
                        }`}
                      >
                        <span>{l.flag}</span> {l.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {loading ? (
              <div className="flex items-center gap-3 animate-pulse ml-2">
                <div className="w-8 h-8 bg-gray-700 rounded-full" />
                <div className="w-24 h-4 bg-gray-700 rounded" />
              </div>
            ) : isAuthenticated && user ? (
              <div className="relative flex items-center gap-3 ml-1" ref={menuRef}>
                <StatsPill user={user} pulse={rewardVisible} />

                <button
                  onClick={() => setIsUserMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                  className="flex items-center gap-2 px-4 py-2 bg-[rgba(var(--background),0.6)] backdrop-blur-md rounded-full hover:scale-[1.03] transition-all"
                >
                  <User size={14} className="text-[rgb(var(--primary))]" />

                  <RarityText
                    effect={user?.username ? user?.nameEffectId : null}
                    as="span"
                    className="text-xs font-bold uppercase truncate max-w-[120px]"
                  >
                    {displayName}
                  </RarityText>
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-3 w-56 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-[0_18px_60px_rgba(0,0,0,0.45)] py-2 z-50 before:absolute before:-top-2 before:right-8 before:h-3 before:w-3 before:rotate-45 before:border-l before:border-t before:border-[rgb(var(--border))] before:bg-[rgb(var(--card))]"
                    >
                      <AccountMenuContent
                        username={user.username}
                        isAdmin={isAdmin}
                        unreadCount={unreadCount}
                        resetUnread={resetUnread}
                        handleLogout={handleLogout}
                        t={t}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-1">
                <Link
                  href="/login"
                  className="px-5 py-2 text-sm font-semibold hover:text-[rgb(var(--primary))]"
                >
                  {t("navbar.login")}
                </Link>

                <Link
                  href="/register"
                  className="px-6 py-2.5 bg-[rgb(var(--primary))] text-[rgb(var(--button-text))] rounded-full text-sm font-bold shadow-lg"
                >
                  {t("navbar.register")}
                </Link>
              </div>
            )}

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={t("navbar.theme")}
              className="ml-4 p-2.5 bg-[rgba(var(--background),0.6)] backdrop-blur-md rounded-xl hover:scale-[1.05] transition-all"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <button
            onClick={() => setIsMobileOpen((open) => !open)}
            aria-label={isMobileOpen ? t("navbar.closeMenu") : t("navbar.openMenu")}
            aria-expanded={isMobileOpen}
            className="md:hidden p-2 text-[rgb(var(--text))]"
          >
            {isMobileOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {isMobileOpen && (
            <motion.div
              key="mobile-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden overflow-hidden"
            >
              <motion.div
                variants={mobilePanelVariants}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-2 px-4 pb-5 pt-1 max-h-[75vh] overflow-y-auto"
              >
                {isAuthenticated && user && (
                  <motion.div variants={mobileItemVariants}>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-3 rounded-2xl bg-[rgba(var(--background),0.6)] p-3"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--primary))]/15 text-[rgb(var(--primary))]">
                        <User size={18} />
                      </span>
                      <span className="flex flex-col overflow-hidden">
                        <RarityText
                          effect={user?.username ? user?.nameEffectId : null}
                          as="span"
                          className="truncate text-sm font-bold"
                        >
                          {displayName}
                        </RarityText>
                        <span className="text-xs text-[rgb(var(--secondary-text))]">
                          {t("navbar.account")}
                        </span>
                      </span>
                    </Link>
                    <div className="mt-2">
                      <StatsPill user={user} pulse={rewardVisible} fullWidth />
                    </div>
                  </motion.div>
                )}

                <motion.div variants={mobileItemVariants}>
                  <RainbowButton
                    href={getGameUrl()}
                    text={t("navbar.playGame")}
                    icon={<Gamepad2 size={18} className="text-[rgb(var(--text))]" />}
                    className="w-full rounded-2xl py-3"
                  />
                </motion.div>

                <motion.div variants={mobileItemVariants} className="flex flex-col gap-1">
                  <DropdownSection title={t("navbar.navigation")} />
                  {primaryLinks.map((link) => (
                    <MobileNavLink key={link.href} href={link.href} icon={link.icon} active={pathname === link.href}>
                      {link.label}
                    </MobileNavLink>
                  ))}
                </motion.div>

                {isAuthenticated && user ? (
                  <motion.div
                    variants={mobileItemVariants}
                    className="flex flex-col gap-1 rounded-2xl bg-[rgba(var(--background),0.5)] py-1"
                  >
                    <AccountMenuContent
                      username={user.username}
                      isAdmin={isAdmin}
                      unreadCount={unreadCount}
                      resetUnread={resetUnread}
                      handleLogout={handleLogout}
                      t={t}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    variants={mobileItemVariants}
                    className="flex flex-col gap-2 rounded-2xl bg-[rgba(var(--background),0.6)] p-4"
                  >
                    <p className="text-sm font-semibold text-[rgb(var(--secondary-text))]">
                      {t("navbar.guestCta")}
                    </p>
                    <div className="flex gap-2">
                      <Link
                        href="/login"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[rgb(var(--border))] px-4 py-2.5 text-sm font-bold text-[rgb(var(--text))]"
                      >
                        <LogIn size={14} /> {t("navbar.login")}
                      </Link>
                      <Link
                        href="/register"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[rgb(var(--primary))] px-4 py-2.5 text-sm font-bold text-[rgb(var(--button-text))]"
                      >
                        <UserPlus size={14} /> {t("navbar.register")}
                      </Link>
                    </div>
                  </motion.div>
                )}

                <motion.div
                  variants={mobileItemVariants}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[rgba(var(--background),0.5)] p-2"
                >
                  <div className="flex items-center gap-1 rounded-xl bg-[rgba(var(--card),0.8)] p-1">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => changeLanguage(l.code)}
                        className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          lang === l.code
                            ? "bg-[rgb(var(--primary))] text-white"
                            : "text-[rgb(var(--secondary-text))]"
                        }`}
                      >
                        {l.flag} {l.short}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="flex items-center gap-2 rounded-xl bg-[rgba(var(--card),0.8)] px-3 py-2 text-xs font-bold text-[rgb(var(--text))]"
                  >
                    {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                    {t("navbar.theme")}
                  </button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {rewardVisible && reward && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="flex flex-col items-center gap-3 pb-5 pt-2"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-yellow-400">
                <Sparkles size={16} className="animate-spin-slow" />
                {t("navbar.reward")}
              </div>

              <div className="flex gap-8 text-xl font-black items-center">
                <span className="text-[rgb(var(--primary))]">
                  ⚡ +{reward.xp} XP
                </span>

                <span className="text-[rgb(var(--accent))]">
                  🪙 +{reward.coins}
                </span>

                {reward.levelUp && (
                  <span className="text-green-400 animate-pulse">
                    🚀 {t("navbar.levelUp")}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </div>
  );
}

// Total en vivo de nivel/XP/monedas/racha, siempre visible en el navbar
// (antes solo existía en /dashboard y /u/[username], lejos del momento en
// que se gana algo). `pulse` reacciona al mismo estado que ya usa el banner
// de recompensa para que el número "salte" cuando cambia.
function StatsPill({
  user,
  pulse,
  fullWidth,
}: {
  user: { level?: number; experience?: number; coins?: number; streak?: number };
  pulse: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`
        hidden lg:flex items-center gap-2 px-3 py-1.5
        bg-[rgba(var(--background),0.6)] backdrop-blur-md rounded-full
        text-xs font-black transition-all duration-300
        ${fullWidth ? "!flex w-full justify-center" : ""}
        ${pulse ? "scale-110 ring-2 ring-yellow-400/70 shadow-[0_0_20px_rgba(250,204,21,0.4)]" : ""}
      `}
    >
      <span className="flex items-center gap-1 text-[rgb(var(--primary))]">
        <Trophy size={13} /> {user.level ?? 1}
      </span>
      <span className="w-px h-3 bg-[rgb(var(--border))]" />
      <span className="flex items-center gap-1 text-yellow-400">
        <Zap size={13} /> {(user.experience ?? 0).toLocaleString()}
      </span>
      <span className="w-px h-3 bg-[rgb(var(--border))]" />
      <span className="flex items-center gap-1">
        <CurrencyIcon currency="coins" size={13} />
        <RarityText effect="goldRank">{(user.coins ?? 0).toLocaleString()}</RarityText>
      </span>
      {(user.streak ?? 0) > 0 && (
        <>
          <span className="w-px h-3 bg-[rgb(var(--border))]" />
          <span className="flex items-center gap-1 text-orange-400">
            <Flame size={13} /> {user.streak}
          </span>
        </>
      )}
    </div>
  );
}

function AccountMenuContent({
  username,
  isAdmin,
  unreadCount,
  resetUnread,
  handleLogout,
  t,
}: {
  username: string;
  isAdmin: boolean;
  unreadCount: number;
  resetUnread: () => void;
  handleLogout: () => void;
  t: Translate;
}) {
  return (
    <>
      <DropdownSection title={t("navbar.account")} />
      <DropdownItem href="/dashboard" icon={<User size={16} />} label={t("navbar.profile")} />
      <DropdownItem href={`/u/${username}`} icon={<User size={16} />} label={t("navbar.publicProfile")} />
      <DropdownItem href="/certificates" icon={<Award size={16} />} label={t("navbar.certificates")} />
      <DropdownItem href="/account/billing" icon={<CreditCard size={16} />} label={t("navbar.billing")} />

      <DropdownSection title={t("navbar.preferences")} />
      <DropdownItem href="/settings" icon={<Settings size={16} />} label={t("navbar.settings")} />
      <DropdownItem
        href="/notifications"
        icon={<Bell size={16} />}
        label={t("navbar.notifications")}
        badge={unreadCount}
        onClick={resetUnread}
      />
      <DropdownItem href="/battle-pass" icon={<Ticket size={16} />} label={t("navbar.battlePass")} />
      <DropdownItem href="/missions" icon={<Target size={16} />} label={t("navbar.missions")} />
      <DropdownItem href="/achievements" icon={<Trophy size={16} />} label={t("navbar.achievements")} />
      <DropdownItem href="/badges" icon={<Award size={16} />} label={t("navbar.badges")} />
      <DropdownItem href="/rewards" icon={<Gift size={16} />} label={t("navbar.rewardCenter")} />
      <DropdownItem href="/referrals" icon={<Users size={16} />} label={t("navbar.referrals")} />
      {isAdmin && <DropdownItem href="/admin" icon={<Shield size={16} />} label={t("navbar.adminPanel")} />}

      <DropdownSection title={t("navbar.actions")} />
      <DropdownItem href="/friends" icon={<Users size={16} />} label={t("navbar.friends")} />
      <DropdownItem href="/messages" icon={<MessageSquare size={16} />} label={t("navbar.messages")} />
      <DropdownItem href="/mis-cursos" icon={<BookOpen size={16} />} label={t("navbar.myCourses")} />

      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors"
      >
        <LogOut size={16} /> {t("navbar.logout")}
      </button>
    </>
  );
}

function DropdownItem({
  href,
  icon,
  label,
  badge,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-[rgb(var(--text))] hover:bg-[rgb(var(--primary))]/10 hover:text-[rgb(var(--primary))] transition-colors"
    >
      {icon} {label}
      {badge ? (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-1.5 text-xs font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function DropdownSection({ title }: { title: string }) {
  return (
    <div className="px-4 pb-1 pt-2 text-[10px] font-black uppercase tracking-wide text-[rgb(var(--secondary-text))]">
      {title}
    </div>
  );
}

function NavLink({
  href,
  children,
  active,
}: {
  href: string;
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
        active
          ? "bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]"
          : "text-[rgb(var(--secondary-text))] hover:text-[rgb(var(--text))] hover:bg-[rgb(var(--background))]"
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  icon,
  children,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
        active
          ? "bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]"
          : "text-[rgb(var(--text))] hover:bg-[rgba(var(--background),0.6)]"
      }`}
    >
      <span className={active ? "text-[rgb(var(--primary))]" : "text-[rgb(var(--secondary-text))]"}>{icon}</span>
      {children}
    </Link>
  );
}
