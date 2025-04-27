"use client";

import { useState } from "react";
import { ChevronDown, Bell, User, Sun, Moon, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const toggleDropdown = (menu: string) => {
    setActiveDropdown(activeDropdown === menu ? null : menu);
  };

  // Enlace dinámico a /profile o /login según autenticación
  const profileLink = user ? "/profile" : "/login";

  return (
    <nav
      className="py-4 px-6 flex items-center justify-between font-mono"
      style={{
        background: theme.colors.background,
        borderBottom: `4px solid ${theme.colors.border}`,
        color: theme.colors.text,
      }}
    >
      <div className="flex items-center space-x-8">
        <Link to="/" className="flex items-center">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center mr-2 border-2"
            style={{
              background: theme.colors.accent,
              borderColor: theme.colors.border,
            }}
          >
            <span
              className="font-bold"
              style={{ color: theme.colors.buttonText }}
            >
              C
            </span>
          </div>
          <span className="text-2xl font-bold tracking-wider">CODEBUDDIES</span>
          <span
            className="text-sm ml-1"
            style={{ color: theme.colors.primary }}
          >
            Altaquer
          </span>
        </Link>

        <div className="hidden md:flex items-center space-x-6">
          <div className="relative">
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
                className="absolute top-full left-0 mt-2 w-48 rounded-md shadow-lg z-10 border-2"
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
                  >
                    HTML & CSS
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
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
                className="absolute top-full left-0 mt-2 w-48 rounded-md shadow-lg z-10 border-2"
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
                  >
                    Desafíos
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link
            to="/construir"
            className="transition-colors"
            style={{ color: theme.colors.text }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = theme.colors.accent)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = theme.colors.text)
            }
          >
            Construir
          </Link>

          <div className="relative">
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
                className="absolute top-full left-0 mt-2 w-48 rounded-md shadow-lg z-10 border-2"
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
                  >
                    Discord
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={() => setTheme("light")}
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
          onClick={() => setTheme("dark")}
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
                theme.name === "dark" ? theme.colors.accent : theme.colors.text,
            }}
          />
        </button>
        <button
          onClick={() => setTheme("pink")}
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
                theme.name === "pink" ? theme.colors.accent : theme.colors.text,
            }}
          />
        </button>
        <button
          className="transition-colors"
          style={{ color: theme.colors.text }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = theme.colors.accent)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = theme.colors.text)
          }
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
        >
          <User size={18} style={{ color: theme.colors.buttonText }} />
        </Link>
      </div>
    </nav>
  );
}
