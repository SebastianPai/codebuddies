"use client";

import { useState } from "react";
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

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleDropdown = (menu: string) => {
    setActiveDropdown(activeDropdown === menu ? null : menu);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const profileLink = user ? "/perfil" : "/login";

  return (
    <nav
      className="py-4 px-6 flex items-center justify-between font-mono"
      style={{
        background: theme.colors.background,
        borderBottom: `4px solid ${theme.colors.border}`,
        color: theme.colors.text,
      }}
    >
      <div className="flex items-center justify-between w-full">
        <Link to="/" className="flex items-center">
          <span className="text-2xl font-bold tracking-wider">CODEBUDDIES</span>
          <span
            className="text-sm ml-1"
            style={{ color: theme.colors.primary }}
          >
            Altaquer
          </span>
        </Link>
        <button
          className="md:hidden p-2"
          onClick={toggleMobileMenu}
          style={{ color: theme.colors.text }}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div
        className={`${
          isMobileMenuOpen ? "flex" : "hidden"
        } md:flex flex-col md:flex-row md:items-center md:space-x-6 absolute md:static top-16 left-0 w-full md:w-auto p-4 md:p-0 z-20 transition-all duration-300 ease-in-out`}
        style={{
          background: theme.colors.background,
          borderBottom: isMobileMenuOpen
            ? `2px solid ${theme.colors.border}`
            : "none",
        }}
      >
        {/* Menú Aprender */}
        <div className="relative mb-4 md:mb-0">
          <button
            className="flex items-center space-x-1 transition-colors"
            onClick={() => toggleDropdown("aprender")}
            style={{ color: theme.colors.text }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = theme.colors.accent)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = theme.colors.text)
            }
          >
            <span>Aprender</span>
            <ChevronDown size={16} />
          </button>
          {activeDropdown === "aprender" && (
            <div
              className="mt-2 w-full md:w-48 rounded-md shadow-lg z-10 border-2 md:absolute"
              style={{
                background: theme.colors.card,
                borderColor: theme.colors.border,
              }}
            >
              <div className="py-1">
                <Link
                  to="/learn/python"
                  className="block px-4 py-2 border-l-2"
                  style={{
                    color: theme.colors.text,
                    borderColor: theme.colors.success,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = theme.colors.border)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Python
                </Link>
                <Link
                  to="/learn/javascript"
                  className="block px-4 py-2 border-l-2"
                  style={{
                    color: theme.colors.text,
                    borderColor: theme.colors.success,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = theme.colors.border)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  JavaScript
                </Link>
                <Link
                  to="/learn/html-css"
                  className="block px-4 py-2 border-l-2"
                  style={{
                    color: theme.colors.text,
                    borderColor: theme.colors.success,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = theme.colors.border)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  HTML & CSS
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Menú Práctica */}
        <div className="relative mb-4 md:mb-0">
          <button
            className="flex items-center space-x-1 transition-colors"
            onClick={() => toggleDropdown("practica")}
            style={{ color: theme.colors.text }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = theme.colors.accent)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = theme.colors.text)
            }
          >
            <span>Práctica</span>
            <ChevronDown size={16} />
          </button>
          {activeDropdown === "practica" && (
            <div
              className="mt-2 w-full md:w-48 rounded-md shadow-lg z-10 border-2 md:absolute"
              style={{
                background: theme.colors.card,
                borderColor: theme.colors.border,
              }}
            >
              <div className="py-1">
                <Link
                  to="/practica/ejercicios"
                  className="block px-4 py-2 border-l-2"
                  style={{
                    color: theme.colors.text,
                    borderColor: theme.colors.success,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = theme.colors.border)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Ejercicios
                </Link>
                <Link
                  to="/practica/desafios"
                  className="block px-4 py-2 border-l-2"
                  style={{
                    color: theme.colors.text,
                    borderColor: theme.colors.success,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = theme.colors.border)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Desafíos
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Enlace Construir */}
        <Link
          to="/construir"
          className="transition-colors mb-4 md:mb-0"
          style={{ color: theme.colors.text }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = theme.colors.accent)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = theme.colors.text)
          }
          onClick={() => setIsMobileMenuOpen(false)}
        >
          Construir
        </Link>

        {/* Menú Comunidad */}
        <div className="relative mb-4 md:mb-0">
          <button
            className="flex items-center space-x-1 transition-colors"
            onClick={() => toggleDropdown("comunidad")}
            style={{ color: theme.colors.text }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = theme.colors.accent)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = theme.colors.text)
            }
          >
            <span>Comunidad</span>
            <ChevronDown size={16} />
          </button>
          {activeDropdown === "comunidad" && (
            <div
              className="mt-2 w-full md:w-48 rounded-md shadow-lg z-10 border-2 md:absolute"
              style={{
                background: theme.colors.card,
                borderColor: theme.colors.border,
              }}
            >
              <div className="py-1">
                <Link
                  to="/comunidad/foro"
                  className="block px-4 py-2 border-l-2"
                  style={{
                    color: theme.colors.text,
                    borderColor: theme.colors.success,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = theme.colors.border)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Foro
                </Link>
                <Link
                  to="/comunidad/eventos"
                  className="block px-4 py-2 border-l-2"
                  style={{
                    color: theme.colors.text,
                    borderColor: theme.colors.success,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = theme.colors.border)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Eventos
                </Link>
                <Link
                  to="/comunidad/discord"
                  className="block px-4 py-2 border-l-2"
                  style={{
                    color: theme.colors.text,
                    borderColor: theme.colors.success,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = theme.colors.border)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Discord
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Botones de temas y notificaciones */}
        <div
          className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4 mt-4 md:mt-0 border-t-2 md:border-t-0 pt-4 md:pt-0"
          style={{ borderColor: theme.colors.border }}
        >
          <div className="flex space-x-4">
            <button
              onClick={() => {
                setTheme("light");
                setIsMobileMenuOpen(false);
              }}
              className={`p-2 rounded-md ${
                theme.name === "light" ? "bg-[#374151]" : ""
              }`}
              style={{
                background:
                  theme.name === "light" ? theme.colors.border : "transparent",
              }}
            >
              <Sun
                size={20}
                style={{
                  color:
                    theme.name === "light"
                      ? theme.colors.accent
                      : theme.colors.text,
                }}
              />
            </button>
            <button
              onClick={() => {
                setTheme("dark");
                setIsMobileMenuOpen(false);
              }}
              className={`p-2 rounded-md ${
                theme.name === "dark" ? "bg-[#374151]" : ""
              }`}
              style={{
                background:
                  theme.name === "dark" ? theme.colors.border : "transparent",
              }}
            >
              <Moon
                size={20}
                style={{
                  color:
                    theme.name === "dark"
                      ? theme.colors.accent
                      : theme.colors.text,
                }}
              />
            </button>
            <button
              onClick={() => {
                setTheme("pink");
                setIsMobileMenuOpen(false);
              }}
              className={`p-2 rounded-md ${
                theme.name === "pink" ? "bg-[#374151]" : ""
              }`}
              style={{
                background:
                  theme.name === "pink" ? theme.colors.border : "transparent",
              }}
            >
              <Heart
                size={20}
                style={{
                  color:
                    theme.name === "pink"
                      ? theme.colors.accent
                      : theme.colors.text,
                }}
              />
            </button>
          </div>
          <button
            className="transition-colors"
            style={{ color: theme.colors.text }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = theme.colors.accent)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = theme.colors.text)
            }
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Bell size={20} />
          </button>
          <Link
            to={profileLink}
            className="w-8 h-8 rounded-md flex items-center justify-center border-2 transition-colors"
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
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <User size={18} style={{ color: theme.colors.buttonText }} />
          </Link>
        </div>
      </div>
    </nav>
  );
}
