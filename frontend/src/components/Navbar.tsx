"use client";

import { useState } from "react";
import { ChevronDown, Bell, User, Sun, Moon, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const toggleDropdown = (menu: string) => {
    setActiveDropdown(activeDropdown === menu ? null : menu);
  };

  return (
    <nav
      className="py-4 px-6 flex items-center justify-between"
      style={{ background: theme.colors.card, color: theme.colors.text }}
    >
      <div className="flex items-center space-x-8">
        <Link to="/" className="flex items-center">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center mr-2"
            style={{ background: theme.colors.accent }}
          >
            <span
              className="font-bold"
              style={{ color: theme.colors.buttonText }}
            >
              C
            </span>
          </div>
          <span className="font-mono text-2xl font-bold">CODEBUDDIES</span>
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
              style={{ color: theme.colors.text }}
              onClick={() => toggleDropdown("aprender")}
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
                className="absolute top-full left-0 mt-2 w-48 rounded-md shadow-lg z-10"
                style={{ background: theme.colors.card }}
              >
                <div className="py-1">
                  <Link
                    to="/python"
                    className="block px-4 py-2"
                    style={{
                      color: theme.colors.text,
                      background: theme.colors.card,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = theme.colors.border)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = theme.colors.card)
                    }
                  >
                    Python
                  </Link>
                  <Link
                    to="/javascript"
                    className="block px-4 py-2"
                    style={{
                      color: theme.colors.text,
                      background: theme.colors.card,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = theme.colors.border)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = theme.colors.card)
                    }
                  >
                    JavaScript
                  </Link>
                  <Link
                    to="/html-css"
                    className="block px-4 py-2"
                    style={{
                      color: theme.colors.text,
                      background: theme.colors.card,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = theme.colors.border)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = theme.colors.card)
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
              style={{ color: theme.colors.text }}
              onClick={() => toggleDropdown("practica")}
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
                className="absolute top-full left-0 mt-2 w-48 rounded-md shadow-lg z-10"
                style={{ background: theme.colors.card }}
              >
                <div className="py-1">
                  <Link
                    to="/ejercicios"
                    className="block px-4 py-2"
                    style={{
                      color: theme.colors.text,
                      background: theme.colors.card,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = theme.colors.border)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = theme.colors.card)
                    }
                  >
                    Ejercicios
                  </Link>
                  <Link
                    to="/desafios"
                    className="block px-4 py-2"
                    style={{
                      color: theme.colors.text,
                      background: theme.colors.card,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = theme.colors.border)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = theme.colors.card)
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
              style={{ color: theme.colors.text }}
              onClick={() => toggleDropdown("comunidad")}
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
                className="absolute top-full left-0 mt-2 w-48 rounded-md shadow-lg z-10"
                style={{ background: theme.colors.card }}
              >
                <div className="py-1">
                  <Link
                    to="/foro"
                    className="block px-4 py-2"
                    style={{
                      color: theme.colors.text,
                      background: theme.colors.card,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = theme.colors.border)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = theme.colors.card)
                    }
                  >
                    Foro
                  </Link>
                  <Link
                    to="/eventos"
                    className="block px-4 py-2"
                    style={{
                      color: theme.colors.text,
                      background: theme.colors.card,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = theme.colors.border)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = theme.colors.card)
                    }
                  >
                    Eventos
                  </Link>
                  <Link
                    to="/discord"
                    className="block px-4 py-2"
                    style={{
                      color: theme.colors.text,
                      background: theme.colors.card,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = theme.colors.border)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = theme.colors.card)
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
            theme.name === "light" ? "bg-opacity-20" : ""
          }`}
          style={{
            background:
              theme.name === "light" ? theme.colors.accent : "transparent",
            color: theme.colors.text,
          }}
        >
          <Sun size={20} />
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`p-2 rounded-md ${
            theme.name === "dark" ? "bg-opacity-20" : ""
          }`}
          style={{
            background:
              theme.name === "dark" ? theme.colors.accent : "transparent",
            color: theme.colors.text,
          }}
        >
          <Moon size={20} />
        </button>
        <button
          onClick={() => setTheme("pink")}
          className={`p-2 rounded-md ${
            theme.name === "pink" ? "bg-opacity-20" : ""
          }`}
          style={{
            background:
              theme.name === "pink" ? theme.colors.accent : "transparent",
            color: theme.colors.text,
          }}
        >
          <Heart size={20} />
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
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: theme.colors.primary }}
        >
          <User size={18} style={{ color: theme.colors.buttonText }} />
        </div>
      </div>
    </nav>
  );
}
