// src/components/Rankings.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "react-toastify";
import Navbar from "@/components/common/Navbar";
import { useNavigate } from "react-router-dom";
import { Trophy, User, Zap } from "lucide-react";
import BorderPreview from "@/components/BorderPreview";
import { Border } from "@/types";
import "@/index.css";

interface Ranking {
  rank: number;
  userId: string;
  name: string;
  xp: number;
  level: number;
  profilePicture: string;
  activeBorder?: Border | null;
  isCurrentUser?: boolean;
}

interface ThemeColors {
  background: string;
  text: string;
  card: string;
  border: string;
  accent: string;
  secondaryText: string;
  primary: string;
  success: string;
  error: string;
  buttonText: string;
  accenttwo: string;
}

interface ThemeContext {
  theme: { colors: ThemeColors };
}

const Rankings: React.FC = () => {
  const { fetchWithAuth, user } = useAuth();
  const { theme } = useTheme() as ThemeContext;
  const navigate = useNavigate();
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [period, setPeriod] = useState<"global" | "weekly" | "monthly">(
    "weekly"
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchWithAuth(`/api/rankings/${period}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Error al obtener rankings");
        }
        const data = await response.json();
        const formattedRankings = (data.rankings || []).map(
          (rank: Ranking) => ({
            ...rank,
            isCurrentUser: rank.userId === user?.id,
          })
        );
        setRankings(formattedRankings);
      } catch (error: any) {
        setError(error.message || "Error al cargar rankings");
        toast.error(error.message || "Error al cargar rankings");
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [period, fetchWithAuth, user]);

  const handleViewProfile = (userId: string) => {
    if (!userId) {
      toast.error("ID de usuario inválido");
      return;
    }
    navigate(`/profile/${userId}`);
  };

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)"; // Oro
      case 2:
        return "linear-gradient(135deg, #C0C0C0 0%, #A9A9A9 100%)"; // Plata
      case 3:
        return "linear-gradient(135deg, #CD7F32 0%, #A0522D 100%)"; // Bronce
      default:
        return theme.colors.accent;
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col font-mono"
        style={{ background: theme.colors.background }}
      >
        <Navbar />
        <div className="flex justify-center items-center flex-grow">
          <div
            className="animate-spin rounded-full h-12 w-12 border-4 spin-glow"
            style={{
              borderTopColor: theme.colors.accent,
              borderRightColor: theme.colors.accent,
              borderBottomColor: "transparent",
              borderLeftColor: "transparent",
              boxShadow: `0 0 15px ${theme.colors.accent}50`,
            }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col font-mono relative z-10"
      style={{ background: theme.colors.background, color: theme.colors.text }}
    >
      <style>
        {`
          @keyframes background-flow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .bg-flow {
            background: linear-gradient(
              45deg,
              ${theme.colors.accent}20,
              ${theme.colors.primary}20,
              ${theme.colors.accenttwo}20,
              ${theme.colors.accent}20
            );
            background-size: 400% 400%;
            animation: background-flow 15s ease-in-out infinite;
          }
          @keyframes gradient-shift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .gradient-title {
            background: linear-gradient(
              90deg,
              ${theme.colors.accent} 0%,
              ${theme.colors.primary} 50%,
              ${theme.colors.accent} 100%
            );
            background-size: 200% 200%;
            animation: gradient-shift 10s ease-in-out infinite;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          @keyframes neon-pulse {
            0%, 100% { text-shadow: 0 0 10px ${theme.colors.accent}50; }
            50% { text-shadow: 0 0 20px ${theme.colors.accent}80, 0 0 30px ${theme.colors.accent}50; }
          }
          .neon-title {
            animation: neon-pulse 3s ease-in-out;
          }
          @keyframes medal-spin {
            0% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(10deg) scale(1.1); }
            100% { transform: rotate(0deg) scale(1); }
          }
          .medal-spin {
            animation: medal-spin 2s ease-in-out;
          }
          @keyframes glow-pulse {
            0%, 100% { box-shadow: 0 0 5px ${theme.colors.accent}50; }
            50% { box-shadow: 0 0 15px ${theme.colors.accent}80; }
          }
          .glow-pulse {
            animation: glow-pulse 2s ease-in-out infinite;
          }
          @keyframes border-pulse {
            0%, 100% { border-color: ${theme.colors.accent}50; }
            50% { border-color: ${theme.colors.accent}; }
          }
          .border-pulse {
            animation: border-pulse 2s ease-in-out infinite;
          }
          @keyframes icon-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
          }
          .icon-pulse {
            animation: icon-pulse 2s ease-in-out infinite;
          }
          @keyframes spark {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(20px, -20px) scale(0); opacity: 0; }
          }
          .spark-button::after {
            content: '';
            position: absolute;
            width: 10px;
            height: 10px;
            background: ${theme.colors.accent};
            border-radius: 50%;
            opacity: 0;
            pointer-events: none;
          }
          .spark-button:active::after {
            animation: spark 0.5s ease-out;
          }
          @keyframes hero-item {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .hero-item {
            animation: hero-item 0.8s ease-out forwards;
          }
          @keyframes slide-in {
            0% { opacity: 0; transform: translateX(10px); }
            100% { opacity: 1; transform: translateX(0); }
          }
          .slide-in {
            animation: slide-in 0.5s ease-out;
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }
          .shake {
            animation: shake 0.5s ease-in-out;
          }
          @keyframes spin-glow {
            0% { transform: rotate(0deg); box-shadow: 0 0 10px ${theme.colors.accent}50; }
            100% { transform: rotate(360deg); box-shadow: 0 0 20px ${theme.colors.accent}80; }
          }
          .spin-glow {
            animation: spin-glow 1.5s linear infinite;
          }
          @media (prefers-reduced-motion) {
            .bg-flow, .gradient-title, .neon-title, .medal-spin, .glow-pulse, .border-pulse, .icon-pulse, .spin-glow {
              animation: none;
            }
            .gradient-title {
              background: ${theme.colors.text};
              -webkit-background-clip: initial;
              -webkit-text-fill-color: ${theme.colors.text};
            }
            .neon-title {
              text-shadow: none;
            }
            .glow-pulse, .border-pulse {
              box-shadow: none;
              border-color: ${theme.colors.accent};
            }
          }
        `}
      </style>
      <Navbar />
      <div className="relative z-0">
        <div className="bg-flow absolute inset-0 z-0" />
        <div className="flex justify-center items-center flex-grow p-4 sm:p-6 relative z-10">
          <div
            className="w-full max-w-5xl rounded-xl shadow-2xl p-6 sm:p-8"
            style={{
              background: `linear-gradient(135deg, ${theme.colors.card} 0%, ${theme.colors.background}80 100%)`,
              border: `4px solid ${theme.colors.border}`,
            }}
          >
            <h1
              className="text-4xl sm:text-5xl font-bold mb-8 text-center gradient-title neon-title hero-item"
              style={{ animationDelay: "0.2s" }}
            >
              Tabla de Clasificación
            </h1>
            {error && (
              <div
                className="p-4 rounded-lg text-center mb-6 shake hero-item"
                style={{
                  background: theme.colors.error,
                  color: theme.colors.buttonText,
                  border: `2px solid ${theme.colors.border}`,
                  animationDelay: "0.4s",
                }}
              >
                {error}
              </div>
            )}
            <div
              className="flex flex-wrap gap-3 mb-8 justify-center hero-item"
              style={{ animationDelay: "0.6s" }}
            >
              {["weekly", "monthly", "global"].map((p, index) => (
                <button
                  key={p}
                  className={`flex-1 min-w-[100px] px-4 py-2 rounded-full font-bold text-sm sm:text-base slide-in ${
                    period === p ? "border-4" : "border-2"
                  }`}
                  style={{
                    background:
                      period === p
                        ? `linear-gradient(90deg, ${theme.colors.accent} 0%, ${theme.colors.accenttwo} 100%)`
                        : theme.colors.card,
                    color:
                      period === p
                        ? theme.colors.buttonText
                        : theme.colors.text,
                    borderColor:
                      period === p ? theme.colors.border : theme.colors.border,
                    boxShadow:
                      period === p
                        ? `0 0 15px ${theme.colors.accent}50`
                        : "none",
                    transition: "all 0.3s ease",
                    animationDelay: `${0.1 * index}s`,
                  }}
                  onClick={() =>
                    setPeriod(p as "global" | "weekly" | "monthly")
                  }
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.boxShadow = `0 0 10px ${theme.colors.accent}50`)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.boxShadow =
                      period === p
                        ? `0 0 15px ${theme.colors.accent}50`
                        : "none")
                  }
                >
                  {p === "weekly"
                    ? "Semanal"
                    : p === "monthly"
                    ? "Mensual"
                    : "Global"}
                </button>
              ))}
            </div>
            <div
              className="p-4 rounded-lg"
              style={{
                background: theme.colors.background,
                border: `4px solid ${theme.colors.border}`,
              }}
            >
              {rankings.length > 0 ? (
                <div className="grid gap-4">
                  {rankings.map((ranking, index) => (
                    <div
                      key={ranking.userId}
                      className="hero-item"
                      style={{ animationDelay: `${0.2 + index * 0.1}s` }}
                    >
                      <div
                        className="flex flex-wrap items-center p-4 rounded-lg gap-3 hover:scale-105 transition-transform"
                        style={{
                          background: ranking.isCurrentUser
                            ? `linear-gradient(135deg, ${theme.colors.accent}20 0%, ${theme.colors.accenttwo}20 100%)`
                            : theme.colors.card,
                          border: `4px solid ${
                            ranking.isCurrentUser
                              ? theme.colors.accent
                              : theme.colors.border
                          }`,
                          boxShadow: `0 4px 14px rgba(0, 0, 0, 0.2)`,
                          ...(ranking.isCurrentUser
                            ? {
                                animation:
                                  "border-pulse 2s ease-in-out infinite",
                              }
                            : {}),
                        }}
                      >
                        <div
                          className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full medal-spin"
                          style={{
                            background: getMedalColor(ranking.rank),
                            boxShadow: `0 0 10px ${getMedalColor(
                              ranking.rank
                            )}50`,
                          }}
                        >
                          <Trophy
                            className="w-6 h-6 sm:w-8 sm:h-8"
                            style={{
                              color: theme.colors.buttonText,
                            }}
                          />
                        </div>
                        <div
                          className="text-lg sm:text-xl font-bold"
                          style={{ color: theme.colors.text }}
                        >
                          #{ranking.rank}
                        </div>
                        <BorderPreview border={ranking.activeBorder} size={48}>
                          <div
                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden ${
                              ranking.isCurrentUser ? "glow-pulse" : ""
                            }`}
                          >
                            {ranking.profilePicture ? (
                              <img
                                src={ranking.profilePicture}
                                alt={`${ranking.name}'s profile`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src =
                                    "/images/default-profile.jpg";
                                }}
                              />
                            ) : (
                              <User
                                className="w-10 h-10 sm:w-12 sm:h-12 p-2"
                                style={{ color: theme.colors.accent }}
                              />
                            )}
                          </div>
                        </BorderPreview>
                        <div
                          className="flex-grow flex items-center gap-2 text-sm sm:text-base truncate"
                          style={{ color: theme.colors.text }}
                        >
                          <span className="truncate font-bold">
                            {ranking.name}
                          </span>
                          <span
                            className="text-xs sm:text-sm"
                            style={{ color: theme.colors.secondaryText }}
                          >
                            (Lv. {ranking.level})
                          </span>
                        </div>
                        <div
                          className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold"
                          style={{
                            background: theme.colors.background,
                            color: theme.colors.accent,
                          }}
                        >
                          <Zap className="w-4 h-4 icon-pulse" />
                          {ranking.xp.toLocaleString()} XP
                        </div>
                        <button
                          onClick={() => handleViewProfile(ranking.userId)}
                          className="px-4 py-2 rounded-lg font-bold text-sm spark-button"
                          style={{
                            background: theme.colors.success,
                            color: theme.colors.buttonText,
                            border: `2px solid ${theme.colors.border}`,
                            transition: "all 0.3s ease",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.boxShadow = `0 0 10px ${theme.colors.success}50`)
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.boxShadow = "none")
                          }
                        >
                          Ver
                        </button>
                      </div>
                      {index === 4 && rankings.length > 5 && (
                        <div
                          className="w-full text-center py-2 text-sm"
                          style={{ color: theme.colors.secondaryText }}
                        >
                          ...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  className="text-base text-center py-4"
                  style={{ color: theme.colors.secondaryText }}
                >
                  No hay rankings disponibles.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Footer Personalizado */}
      <footer
        className="py-8 px-4 sm:px-6 lg:px-8 text-center"
        style={{ background: theme.colors.card, color: theme.colors.text }}
      >
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <img
            src="/images/bitzi2.png"
            alt="Bitzi Footer"
            className="w-10 h-10 mb-4 rounded-full object-contain"
            style={{ border: `2px solid ${theme.colors.accent}` }}
            onError={(e) => {
              e.currentTarget.src = "/images/default-bitzi.jpg";
            }}
          />
          <p
            className="text-sm md:text-base mb-2"
            style={{ color: theme.colors.text }}
          >
            Creado con pasión por Jhon Sebastian Pai
            <a
              href="https://www.linkedin.com/in/sebastian-pai"
              target="_blank"
              rel="noopener noreferrer"
              className="linkedin-link ml-1"
              style={{ color: theme.colors.accent }}
            >
              Conéctate
            </a>
          </p>
          <p
            className="text-xs md:text-sm"
            style={{ color: theme.colors.secondaryText }}
          >
            © 2025 CodeBuddies. ¡Hecho para inspirar programadores!
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Rankings;
