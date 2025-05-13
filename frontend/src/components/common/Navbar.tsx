"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  Bell,
  User,
  Sun,
  Moon,
  Heart,
  Menu,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";

interface Notification {
  _id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data: { [key: string]: any };
}

interface ThemeOption {
  name: "pink" | "dark" | "light";
  icon: React.ComponentType<any>;
}

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const { user, fetchWithAuth } = useAuth();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const response = await fetchWithAuth(
        "/api/notifications?unreadOnly=true"
      );
      if (!response.ok) {
        throw new Error("Error al obtener notificaciones");
      }
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(
        data.notifications.filter((n: Notification) => !n.isRead).length
      );
    } catch (error) {
      toast.error("Error al cargar notificaciones", {
        style: {
          background: theme.colors.card,
          color: theme.colors.text,
          border: `2px solid ${theme.colors.error}`,
        },
      });
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetchWithAuth(
        `/api/notifications/${notificationId}/read`,
        { method: "PUT" }
      );
      if (!response.ok) {
        throw new Error("Error al marcar notificación como leída");
      }
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => prev - 1);
    } catch (error) {
      toast.error("Error al marcar notificación", {
        style: {
          background: theme.colors.card,
          color: theme.colors.text,
          border: `2px solid ${theme.colors.error}`,
        },
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetchWithAuth("/api/notifications/read-all", {
        method: "PUT",
      });
      if (!response.ok) {
        throw new Error("Error al marcar todas las notificaciones como leídas");
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      toast.error("Error al marcar todas las notificaciones", {
        style: {
          background: theme.colors.card,
          color: theme.colors.text,
          border: `2px solid ${theme.colors.error}`,
        },
      });
    }
  };

  const toggleDropdown = (menu: string) => {
    setActiveDropdown(activeDropdown === menu ? null : menu);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    if (isMobileMenuOpen) setActiveDropdown(null);
  };

  const profileLink = user ? "/perfil" : "/login";

  const themeOptions: ThemeOption[] = [
    { name: "light", icon: Sun },
    { name: "dark", icon: Moon },
    { name: "pink", icon: Heart },
  ];

  return (
    <nav
      className="py-4 px-6 flex items-center justify-between font-mono"
      style={{
        background: theme.colors.background,
        borderBottom: `4px solid ${theme.colors.border}`,
        color: theme.colors.text,
      }}
    >
      <style>
        {`
          @keyframes spark {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(25px, -25px) scale(0); opacity: 0; }
          }
          .spark-button::after {
            content: '';
            position: absolute;
            width: 12px;
            height: 12px;
            background: ${theme.colors.accent};
            border-radius: 50%;
            opacity: 0;
            pointer-events: none;
          }
          .spark-button:active::after {
            animation: spark 0.5s ease-out;
          }
          @keyframes rotate-icon {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .rotate-icon {
            transition: transform 0.5s ease;
          }
          .spark-button:hover .rotate-icon {
            transform: rotate(360deg);
          }
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .fade-in {
            animation: fade-in 0.3s ease-in;
          }
          @media (prefers-reduced-motion) {
            .spark-button::after, .rotate-icon, .fade-in {
              animation: none;
              transition: none;
            }
          }
          @media (max-width: 640px) {
            .spark-button {
              font-size: 0.875rem;
              padding: 0.5rem 0.75rem;
            }
            .text-2xl { font-size: 1.5rem; }
            .text-sm { font-size: 0.75rem; }
            .px-6 { padding-left: 1rem; padding-right: 1rem; }
            .py-4 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
          }
        `}
      </style>

      {/* Logo y botón de menú móvil */}
      <div className="flex items-center justify-between w-full">
        <Link to="/" className="flex items-center" onClick={toggleMobileMenu}>
          <span
            className="text-2xl font-bold tracking-wider"
            style={{ color: theme.colors.text }}
          >
            CODEBUDDIES
          </span>
          <span
            className="text-sm ml-1"
            style={{ color: theme.colors.primary }}
          >
            Altaquer
          </span>
        </Link>
        <button
          className="md:hidden p-2 spark-button"
          onClick={toggleMobileMenu}
          style={{
            background: `linear-gradient(90deg, ${theme.colors.accent} 0%, ${theme.colors.accenttwo} 100%)`,
            color: theme.colors.buttonText,
          }}
        >
          {isMobileMenuOpen ? (
            <X size={24} className="rotate-icon" />
          ) : (
            <Menu size={24} className="rotate-icon" />
          )}
        </button>
      </div>

      {/* Menú principal */}
      <div
        className={`${
          isMobileMenuOpen ? "flex" : "hidden"
        } md:flex flex-col md:flex-row md:items-center md:space-x-6 absolute md:static top-16 left-0 w-full md:w-auto p-4 md:p-0 z-20 transition-all duration-300 ease-in-out`}
        style={{
          background: isMobileMenuOpen
            ? theme.colors.card
            : theme.colors.background,
          borderBottom: isMobileMenuOpen
            ? `2px solid ${theme.colors.border}`
            : "none",
        }}
      >
        {/* Menú Aprender */}
        <div className="relative mb-4 md:mb-0">
          <button
            className="flex items-center space-x-1 px-4 py-2 rounded-md spark-button"
            onClick={() => toggleDropdown("aprender")}
            style={{
              background:
                activeDropdown === "aprender"
                  ? `linear-gradient(90deg, ${theme.colors.accent} 0%, ${theme.colors.accenttwo} 100%)`
                  : "transparent",
              color:
                activeDropdown === "aprender"
                  ? theme.colors.buttonText
                  : theme.colors.text,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = theme.colors.accenttwo)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background =
                activeDropdown === "aprender"
                  ? `linear-gradient(90deg, ${theme.colors.accent} 0%, ${theme.colors.accenttwo} 100%)`
                  : "transparent")
            }
          >
            <span>Aprender</span>
            <ChevronDown size={16} className="rotate-icon" />
          </button>
          {activeDropdown === "aprender" && (
            <div
              className="mt-2 w-full md:w-48 rounded-md shadow-lg z-10 border-2 md:absolute fade-in"
              style={{
                background: theme.colors.card,
                borderColor: theme.colors.border,
              }}
            >
              <div className="py-1">
                {["python", "javascript", "html-css"].map((lang) => (
                  <Link
                    key={lang}
                    to={`/learn/${lang}`}
                    className="block px-4 py-2 border-l-2 text-sm spark-button"
                    style={{
                      color: theme.colors.text,
                      borderColor: theme.colors.success,
                      background: "transparent",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = theme.colors.border)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setActiveDropdown(null);
                    }}
                  >
                    {lang === "html-css"
                      ? "HTML & CSS"
                      : lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Menú Práctica */}
        <div className="relative mb-4 md:mb-0">
          <button
            className="flex items-center space-x-1 px-4 py-2 rounded-md spark-button"
            onClick={() => toggleDropdown("practica")}
            style={{
              background:
                activeDropdown === "practica"
                  ? `linear-gradient(90deg, ${theme.colors.accent} 0%, ${theme.colors.accenttwo} 100%)`
                  : "transparent",
              color:
                activeDropdown === "practica"
                  ? theme.colors.buttonText
                  : theme.colors.text,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = theme.colors.accenttwo)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background =
                activeDropdown === "practica"
                  ? `linear-gradient(90deg, ${theme.colors.accent} 0%, ${theme.colors.accenttwo} 100%)`
                  : "transparent")
            }
          >
            <span>Práctica</span>
            <ChevronDown size={16} className="rotate-icon" />
          </button>
          {activeDropdown === "practica" && (
            <div
              className="mt-2 w-full md:w-48 rounded-md shadow-lg z-10 border-2 md:absolute fade-in"
              style={{
                background: theme.colors.card,
                borderColor: theme.colors.border,
              }}
            >
              <div className="py-1">
                {["ejercicios", "desafios"].map((item) => (
                  <Link
                    key={item}
                    to={`/practica/${item}`}
                    className="block px-4 py-2 border-l-2 text-sm spark-button"
                    style={{
                      color: theme.colors.text,
                      borderColor: theme.colors.success,
                      background: "transparent",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = theme.colors.border)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setActiveDropdown(null);
                    }}
                  >
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Enlace Tienda */}
        <Link
          to="/shop"
          className="px-4 py-2 rounded-md spark-button mb-4 md:mb-0"
          style={{
            background: "transparent",
            color: theme.colors.text,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = theme.colors.accenttwo)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
          onClick={() => {
            setIsMobileMenuOpen(false);
            setActiveDropdown(null);
          }}
        >
          Tienda
        </Link>

        {/* Menú Comunidad */}
        <div className="relative mb-4 md:mb-0">
          <button
            className="flex items-center space-x-1 px-4 py-2 rounded-md spark-button"
            onClick={() => toggleDropdown("comunidad")}
            style={{
              background:
                activeDropdown === "comunidad"
                  ? `linear-gradient(90deg, ${theme.colors.accent} 0%, ${theme.colors.accenttwo} 100%)`
                  : "transparent",
              color:
                activeDropdown === "comunidad"
                  ? theme.colors.buttonText
                  : theme.colors.text,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = theme.colors.accenttwo)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background =
                activeDropdown === "comunidad"
                  ? `linear-gradient(90deg, ${theme.colors.accent} 0%, ${theme.colors.accenttwo} 100%)`
                  : "transparent")
            }
          >
            <span>Comunidad</span>
            <ChevronDown size={16} className="rotate-icon" />
          </button>
          {activeDropdown === "comunidad" && (
            <div
              className="mt-2 w-full md:w-48 rounded-md shadow-lg z-10 border-2 md:absolute fade-in"
              style={{
                background: theme.colors.card,
                borderColor: theme.colors.border,
              }}
            >
              <div className="py-1">
                {["rankings", "eventos", "discord"].map((item) => (
                  <Link
                    key={item}
                    to={item === "discord" ? "/comunidad/discord" : `/${item}`}
                    className="block px-4 py-2 border-l-2 text-sm spark-button"
                    style={{
                      color: theme.colors.text,
                      borderColor: theme.colors.success,
                      background: "transparent",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = theme.colors.border)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setActiveDropdown(null);
                    }}
                  >
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Enlace Admin (solo para administradores) */}
        {user?.role === "admin" && (
          <Link
            to="/admin"
            className="px-4 py-2 rounded-md spark-button mb-4 md:mb-0"
            style={{
              background: "transparent",
              color: theme.colors.text,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = theme.colors.accenttwo)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
            onClick={() => {
              setIsMobileMenuOpen(false);
              setActiveDropdown(null);
            }}
          >
            Admin
          </Link>
        )}

        {/* Botones de temas y notificaciones */}
        <div
          className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4 mt-4 md:mt-0 border-t-2 md:border-t-0 pt-4 md:pt-0"
          style={{
            background: theme.colors.background,
            borderColor: theme.colors.border,
          }}
        >
          <div className="flex space-x-4">
            {themeOptions.map((themeOption) => (
              <button
                key={themeOption.name}
                onClick={() => {
                  setTheme(themeOption.name);
                  setIsMobileMenuOpen(false);
                  setActiveDropdown(null);
                }}
                className="p-2 rounded-md spark-button"
                style={{
                  background:
                    theme.name === themeOption.name
                      ? `linear-gradient(90deg, ${theme.colors.accent} 0%, ${theme.colors.accenttwo} 100%)`
                      : "transparent",
                  color:
                    theme.name === themeOption.name
                      ? theme.colors.buttonText
                      : theme.colors.text,
                  minWidth: "48px",
                  minHeight: "48px",
                }}
              >
                <themeOption.icon size={20} className="rotate-icon" />
              </button>
            ))}
          </div>
          <div className="relative">
            <button
              className="p-2 rounded-md spark-button relative"
              onClick={() => toggleDropdown("notifications")}
              style={{
                background:
                  activeDropdown === "notifications"
                    ? `linear-gradient(90deg, ${theme.colors.accent} 0%, ${theme.colors.accenttwo} 100%)`
                    : "transparent",
                color:
                  activeDropdown === "notifications"
                    ? theme.colors.buttonText
                    : theme.colors.text,
                minWidth: "48px",
                minHeight: "48px",
              }}
            >
              <Bell size={20} className="rotate-icon" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {activeDropdown === "notifications" && (
              <div
                className="mt-2 w-full md:w-80 rounded-md shadow-lg z-10 border-2 md:absolute right-0 fade-in"
                style={{
                  background: theme.colors.card,
                  borderColor: theme.colors.border,
                }}
              >
                <div
                  className="p-2 flex justify-between items-center border-b-2"
                  style={{ borderColor: theme.colors.border }}
                >
                  <span
                    className="text-sm"
                    style={{ color: theme.colors.text }}
                  >
                    Notificaciones
                  </span>
                  <button
                    onClick={markAllAsRead}
                    className="text-xs px-2 py-1 rounded-md spark-button"
                    style={{
                      background: theme.colors.accent,
                      color: theme.colors.buttonText,
                    }}
                  >
                    Marcar todas como leídas
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification._id}
                        className="px-4 py-2 border-b text-sm spark-button"
                        style={{
                          background: notification.isRead
                            ? theme.colors.background
                            : theme.colors.border,
                          borderColor: theme.colors.border,
                        }}
                        onClick={() =>
                          !notification.isRead && markAsRead(notification._id)
                        }
                      >
                        <p style={{ color: theme.colors.text }}>
                          {notification.message}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: theme.colors.secondaryText }}
                        >
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p
                      className="px-4 py-2 text-center text-sm"
                      style={{ color: theme.colors.secondaryText }}
                    >
                      No hay notificaciones
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <Link
            to={profileLink}
            className="w-8 h-8 rounded-md flex items-center justify-center border-2 spark-button"
            style={{
              background: theme.colors.primary,
              borderColor: theme.colors.border,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = theme.colors.accent)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = theme.colors.primary)
            }
            onClick={() => {
              setIsMobileMenuOpen(false);
              setActiveDropdown(null);
            }}
          >
            <User
              size={18}
              className="rotate-icon"
              style={{ color: theme.colors.buttonText }}
            />
          </Link>
        </div>
      </div>
    </nav>
  );
}
