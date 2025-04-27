// frontend/src/pages/UserProfile.tsx

"use client";

import { useState, useEffect, JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  Star,
  Zap,
  Shield,
  Flame,
  Wind,
  Edit,
  LogOut,
  Trophy,
  User,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPost } from "../api";

// Definir tipos para los datos
interface UserData {
  name: string;
  email: string;
  profilePicture: string;
  university: string;
  isUniversityStudent: boolean;
  level: number;
  xp: number;
  maxXp: number;
  powers: { name: string; icon: string }[];
  achievements: { name: string; description: string }[];
}

interface EditForm {
  name: string;
  profilePicture: string;
  university: string;
  isUniversityStudent: boolean;
}

interface ApiResponse {
  user: UserData;
  message?: string;
}

interface Ranking {
  rank: number;
  name: string;
  points: number;
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
}

interface ThemeContext {
  theme: { colors: ThemeColors };
}

export default function UserProfile() {
  const { theme } = useTheme() as ThemeContext;
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [user, setUser] = useState<UserData>({
    name: "",
    email: "",
    profilePicture: "",
    university: "",
    isUniversityStudent: false,
    level: 1,
    xp: 0,
    maxXp: 100,
    powers: [],
    achievements: [],
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    profilePicture: "",
    university: "",
    isUniversityStudent: false,
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const rankings: Ranking[] = [
    { rank: 1, name: "MEGA_GAMER", points: 9800 },
    {
      rank: 2,
      name: user.name || "PIXEL_MASTER",
      points: 9500,
      isCurrentUser: true,
    },
    { rank: 3, name: "ARCADE_PRO", points: 9200 },
    { rank: 4, name: "RETRO_KING", points: 8900 },
    { rank: 5, name: "8BIT_QUEEN", points: 8700 },
  ];

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No se encontró el token de autenticación");

        const data = await apiGet<ApiResponse>("/api/users/me", token);

        setUser({
          name: data.user.name || "",
          email: data.user.email || "",
          profilePicture: data.user.profilePicture || "",
          university: data.user.university || "",
          isUniversityStudent: data.user.isUniversityStudent || false,
          level: data.user.level || 1,
          xp: data.user.xp || 0,
          maxXp: data.user.maxXp || 100,
          powers: Array.isArray(data.user.powers) ? data.user.powers : [],
          achievements: Array.isArray(data.user.achievements)
            ? data.user.achievements
            : [],
        });
        setEditForm({
          name: data.user.name || "",
          profilePicture: data.user.profilePicture || "",
          university: data.user.university || "",
          isUniversityStudent: data.user.isUniversityStudent || false,
        });
      } catch (err: any) {
        setError(err.message || "Error al cargar el perfil");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Handle profile update
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No se encontró el token de autenticación");

      const data = await apiPost<ApiResponse>(
        "/api/users/update",
        editForm,
        "PUT",
        token
      );

      setUser((prev) => ({
        ...prev,
        ...data.user,
        powers: prev.powers,
        achievements: prev.achievements,
      }));
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || "Error al actualizar perfil");
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    localStorage.removeItem("token");
    navigate("/login");
  };

  const xpPercentage = user.maxXp ? (user.xp / user.maxXp) * 100 : 0;

  const iconMap: { [key: string]: JSX.Element } = {
    Flame: <Flame className="w-6 h-6" style={{ color: theme.colors.accent }} />,
    Wind: <Wind className="w-6 h-6" style={{ color: theme.colors.primary }} />,
    Zap: <Zap className="w-6 h-6" style={{ color: theme.colors.success }} />,
    Shield: (
      <Shield className="w-6 h-6" style={{ color: theme.colors.accent }} />
    ),
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex flex-col font-mono"
        style={{
          background: theme.colors.background,
          color: theme.colors.text,
        }}
      >
        <Navbar />
        <div className="flex justify-center items-center flex-grow">
          <div className="text-center" style={{ color: theme.colors.text }}>
            Cargando perfil...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col font-mono"
      style={{ background: theme.colors.background, color: theme.colors.text }}
    >
      <Navbar />
      <div className="flex justify-center items-center flex-grow p-4">
        <div
          className="w-full max-w-4xl rounded-xl shadow-lg p-6 md:p-8"
          style={{
            background: theme.colors.card,
            border: `4px solid ${theme.colors.border}`,
          }}
        >
          {error && (
            <div
              className="p-2 rounded text-center mb-4"
              style={{
                background: theme.colors.error,
                color: theme.colors.buttonText,
              }}
            >
              {error}
            </div>
          )}

          <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
            <div className="relative">
              <div
                className="w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden flex items-center justify-center"
                style={{
                  border: `4px solid ${theme.colors.accent}`,
                  background: theme.colors.border,
                }}
              >
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User
                    className="w-16 h-16 md:w-20 md:h-20"
                    style={{ color: theme.colors.accent }}
                  />
                )}
              </div>
              <div
                className="absolute -bottom-2 -right-2 text-xs rounded-md px-2 py-1"
                style={{
                  background: theme.colors.primary,
                  color: theme.colors.buttonText,
                  border: `2px solid ${theme.colors.border}`,
                }}
              >
                LVL {user.level}
              </div>
            </div>

            <div className="flex flex-col items-center md:items-start">
              <h1
                className="text-3xl md:text-4xl font-bold tracking-wider"
                style={{ color: theme.colors.text }}
              >
                {user.name}
              </h1>
              <div
                className="text-lg mt-1"
                style={{ color: theme.colors.secondaryText }}
              >
                Nivel {user.level}
              </div>
              {user.isUniversityStudent && user.university && (
                <div
                  className="text-sm mt-1"
                  style={{ color: theme.colors.secondaryText }}
                >
                  Estudiante en {user.university}
                </div>
              )}
              {!user.isUniversityStudent && user.university && (
                <div
                  className="text-sm mt-1"
                  style={{ color: theme.colors.secondaryText }}
                >
                  {user.university}
                </div>
              )}

              <div className="w-full mt-3">
                <div
                  className="flex justify-between text-sm mb-1"
                  style={{ color: theme.colors.secondaryText }}
                >
                  <span>
                    XP: {user.xp}/{user.maxXp}
                  </span>
                  <span>{Math.round(xpPercentage)}%</span>
                </div>
                <div
                  className="w-full h-4 rounded-md overflow-hidden"
                  style={{
                    background: theme.colors.border,
                    border: `2px solid ${theme.colors.border}`,
                  }}
                >
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${xpPercentage}%`,
                      background: theme.colors.accent,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4 md:mt-0 md:ml-auto">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-md font-bold flex items-center gap-2 hover:brightness-110 transition-all"
                style={{
                  background: theme.colors.success,
                  color: theme.colors.buttonText,
                }}
              >
                <Edit className="w-4 h-4" />
                <span>Editar Perfil</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-md font-bold flex items-center gap-2 hover:brightness-110 transition-all"
                style={{
                  background: theme.colors.error,
                  color: theme.colors.buttonText,
                }}
              >
                <LogOut className="w-4 h-4" />
                <span>Salir</span>
              </button>
            </div>
          </div>

          {isEditing && (
            <div
              className="mb-8 p-4 rounded-md"
              style={{ background: theme.colors.card }}
            >
              <h2
                className="text-xl font-bold mb-4"
                style={{ color: theme.colors.text }}
              >
                Editar Perfil
              </h2>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block mb-2"
                    style={{ color: theme.colors.text }}
                  >
                    Nombre
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                    style={{
                      background: theme.colors.background,
                      border: `2px solid ${theme.colors.border}`,
                      color: theme.colors.text,
                    }}
                    required
                    onFocus={(e) =>
                      (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                    }
                  />
                </div>
                <div>
                  <label
                    htmlFor="profilePicture"
                    className="block mb-2"
                    style={{ color: theme.colors.text }}
                  >
                    URL de Foto de Perfil
                  </label>
                  <input
                    id="profilePicture"
                    type="text"
                    value={editForm.profilePicture}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        profilePicture: e.target.value,
                      })
                    }
                    className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                    style={{
                      background: theme.colors.background,
                      border: `2px solid ${theme.colors.border}`,
                      color: theme.colors.text,
                    }}
                    placeholder="https://example.com/image.jpg"
                    onFocus={(e) =>
                      (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                    }
                  />
                </div>
                <div>
                  <label
                    htmlFor="university"
                    className="block mb-2"
                    style={{ color: theme.colors.text }}
                  >
                    Universidad o Institución
                  </label>
                  <input
                    id="university"
                    type="text"
                    value={editForm.university}
                    onChange={(e) =>
                      setEditForm({ ...editForm, university: e.target.value })
                    }
                    className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                    style={{
                      background: theme.colors.background,
                      border: `2px solid ${theme.colors.border}`,
                      color: theme.colors.text,
                    }}
                    placeholder="Nombre de la universidad"
                    onFocus={(e) =>
                      (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="isUniversityStudent"
                    type="checkbox"
                    checked={editForm.isUniversityStudent}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        isUniversityStudent: e.target.checked,
                      })
                    }
                    style={{ accentColor: theme.colors.accent }}
                  />
                  <label
                    htmlFor="isUniversityStudent"
                    style={{ color: theme.colors.text }}
                  >
                    ¿Estudiante universitario?
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md font-bold hover:brightness-110 transition-all"
                    style={{
                      background: theme.colors.success,
                      color: theme.colors.buttonText,
                    }}
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-md font-bold hover:brightness-110 transition-all"
                    style={{
                      background: theme.colors.error,
                      color: theme.colors.buttonText,
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="mb-8">
            <h2
              className="text-xl font-bold mb-4 pb-2"
              style={{
                borderBottom: `2px solid ${theme.colors.border}`,
                color: theme.colors.text,
              }}
            >
              PODERES Y HABILIDADES
            </h2>
            {user.powers.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {user.powers.map((power, index) => (
                  <div
                    key={index}
                    className="rounded-md p-3 flex items-center gap-2"
                    style={{
                      background: theme.colors.border,
                      border: `2px solid ${theme.colors.border}`,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                    }
                  >
                    {iconMap[power.icon] || (
                      <Star
                        className="w-6 h-6"
                        style={{ color: theme.colors.accent }}
                      />
                    )}
                    <span style={{ color: theme.colors.text }}>
                      {power.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: theme.colors.secondaryText }}>
                No hay poderes disponibles.
              </p>
            )}
          </div>

          <div className="mb-8">
            <h2
              className="text-xl font-bold mb-4 pb-2"
              style={{
                borderBottom: `2px solid ${theme.colors.border}`,
                color: theme.colors.text,
              }}
            >
              RANKINGS SEMANALES
            </h2>
            <div className="grid gap-2">
              {rankings.map((player) => (
                <div
                  key={player.rank}
                  className="flex items-center p-3 rounded-md"
                  style={{
                    background: player.isCurrentUser
                      ? theme.colors.card
                      : theme.colors.background,
                    border: `2px solid ${
                      player.isCurrentUser
                        ? theme.colors.accent
                        : theme.colors.border
                    }`,
                  }}
                >
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-md mr-3"
                    style={{ background: theme.colors.background }}
                  >
                    <Trophy
                      className="w-5 h-5"
                      style={{
                        color:
                          player.rank === 1
                            ? theme.colors.accent
                            : player.rank === 2
                            ? theme.colors.secondaryText
                            : player.rank === 3
                            ? theme.colors.primary
                            : theme.colors.text,
                      }}
                    />
                  </div>
                  <div
                    className="text-xl font-bold mr-3"
                    style={{ color: theme.colors.text }}
                  >
                    #{player.rank}
                  </div>
                  <div
                    className="flex-grow"
                    style={{ color: theme.colors.text }}
                  >
                    {player.name}
                  </div>
                  <div
                    className="font-bold"
                    style={{ color: theme.colors.accent }}
                  >
                    {player.points} PTS
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2
              className="text-xl font-bold mb-4 pb-2"
              style={{
                borderBottom: `2px solid ${theme.colors.border}`,
                color: theme.colors.text,
              }}
            >
              LOGROS DESBLOQUEADOS
            </h2>
            {user.achievements.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {user.achievements.map((achievement, index) => (
                  <div
                    key={index}
                    className="rounded-md p-4"
                    style={{
                      background: theme.colors.border,
                      border: `2px solid ${theme.colors.border}`,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                    }
                  >
                    <div className="flex justify-center mb-2">
                      <Star
                        className="w-8 h-8"
                        style={{ color: theme.colors.accent }}
                      />
                    </div>
                    <h3
                      className="font-bold text-center"
                      style={{ color: theme.colors.text }}
                    >
                      {achievement.name}
                    </h3>
                    <p
                      className="text-xs text-center"
                      style={{ color: theme.colors.secondaryText }}
                    >
                      {achievement.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: theme.colors.secondaryText }}>
                No hay logros desbloqueados.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
