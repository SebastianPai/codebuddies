"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "react-toastify";
import Navbar from "@/components/common/Navbar";
import { useParams, useNavigate } from "react-router-dom";
import { User, Trophy } from "lucide-react";

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

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon?: string;
  image?: string;
}

interface Power {
  id: string;
  name: string;
  description: string;
  effect: {
    type: string;
    value: number | string;
    duration: number;
    durationType: string;
  };
  image: string;
  emoji: string;
  usesLeft?: number;
  remainingDuration?: number;
}

interface PublicUser {
  _id: string;
  name: string;
  university?: string;
  profilePicture?: string;
  profileBackground?: string;
  coins: number;
  streak: number;
  lives: number;
  xp: number;
  level: number;
  achievements: Achievement[];
  powers: Power[];
  activePowers: Power[];
}

const PublicProfile: React.FC = () => {
  const { fetchWithAuth } = useAuth();
  const { theme } = useTheme();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [publicUser, setPublicUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicProfile = async () => {
      try {
        setLoading(true);
        if (!userId) {
          throw new Error("ID de usuario inválido");
        }
        const response = await fetchWithAuth(`/api/users/profile/${userId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Error al obtener perfil público"
          );
        }
        const data = await response.json();
        setPublicUser(data.profile);
      } catch (err: any) {
        setError(err.message || "Error desconocido");
        toast.error("No se pudo cargar el perfil");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfile();
  }, [userId, fetchWithAuth]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col font-mono"
        style={{ background: theme.colors.background }}
      >
        <Navbar />
        <div className="flex justify-center items-center flex-grow">
          <div
            className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"
            style={{ borderColor: theme.colors.accent }}
          ></div>
        </div>
      </div>
    );
  }

  if (error || !publicUser) {
    return (
      <div
        className="min-h-screen flex flex-col font-mono"
        style={{ background: theme.colors.background }}
      >
        <Navbar />
        <div className="flex justify-center items-center flex-grow">
          <p style={{ color: theme.colors.error }}>
            {error || "Perfil no encontrado"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col font-mono"
      style={{
        background: theme.colors.background,
        backgroundImage: `url(${
          publicUser.profileBackground || "/images/default-background.jpg"
        })`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: theme.colors.text,
      }}
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
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full overflow-hidden mb-4">
                {publicUser.profilePicture ? (
                  <img
                    src={publicUser.profilePicture}
                    alt={`${publicUser.name}'s profile`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/images/default-profile.jpg";
                    }}
                  />
                ) : (
                  <User
                    className="w-32 h-32 p-4"
                    style={{ color: theme.colors.accent }}
                  />
                )}
              </div>
              <h2
                className="text-2xl font-bold"
                style={{ color: theme.colors.text }}
              >
                {publicUser.name}
              </h2>
              {publicUser.university && (
                <p style={{ color: theme.colors.secondaryText }}>
                  {publicUser.university}
                </p>
              )}
            </div>
            <div className="flex-grow">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div
                  className="p-4 rounded-md"
                  style={{ background: theme.colors.background }}
                >
                  <p style={{ color: theme.colors.secondaryText }}>Monedas</p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: theme.colors.accent }}
                  >
                    💰 {publicUser.coins}
                  </p>
                </div>
                <div
                  className="p-4 rounded-md"
                  style={{ background: theme.colors.background }}
                >
                  <p style={{ color: theme.colors.secondaryText }}>Racha</p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: theme.colors.accent }}
                  >
                    🔥 {publicUser.streak} días
                  </p>
                </div>
                <div
                  className="p-4 rounded-md"
                  style={{ background: theme.colors.background }}
                >
                  <p style={{ color: theme.colors.secondaryText }}>Vidas</p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: theme.colors.accent }}
                  >
                    ❤️ {publicUser.lives}
                  </p>
                </div>
                <div
                  className="p-4 rounded-md"
                  style={{ background: theme.colors.background }}
                >
                  <p style={{ color: theme.colors.secondaryText }}>Nivel</p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: theme.colors.accent }}
                  >
                    🎮 {publicUser.level} (XP: {publicUser.xp})
                  </p>
                </div>
              </div>
              <h3
                className="text-xl font-bold mb-4"
                style={{ color: theme.colors.text }}
              >
                Logros
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {publicUser.achievements.length > 0 ? (
                  publicUser.achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="p-4 rounded-md"
                      style={{
                        background: theme.colors.background,
                        border: `2px solid ${theme.colors.border}`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {achievement.icon || achievement.image ? (
                          <img
                            src={achievement.icon || achievement.image}
                            alt={achievement.name}
                            className="w-8 h-8"
                            onError={(e) => {
                              e.currentTarget.src =
                                "/images/achievements/default-trophy.png";
                            }}
                          />
                        ) : (
                          <Trophy
                            className="w-8 h-8"
                            style={{ color: theme.colors.accent }}
                          />
                        )}
                        <div>
                          <p style={{ color: theme.colors.text }}>
                            {achievement.name}
                          </p>
                          <p style={{ color: theme.colors.secondaryText }}>
                            {achievement.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: theme.colors.secondaryText }}>
                    No hay logros aún.
                  </p>
                )}
              </div>
              <h3
                className="text-xl font-bold mb-4"
                style={{ color: theme.colors.text }}
              >
                Poderes
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {publicUser.powers.length > 0 ? (
                  publicUser.powers.map((power) => (
                    <div
                      key={power.id}
                      className="p-4 rounded-md"
                      style={{
                        background: theme.colors.background,
                        border: `2px solid ${theme.colors.border}`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {power.image ? (
                          <img
                            src={power.image}
                            alt={power.name}
                            className="w-8 h-8"
                          />
                        ) : (
                          <span className="text-2xl">{power.emoji}</span>
                        )}
                        <div>
                          <p style={{ color: theme.colors.text }}>
                            {power.name}
                          </p>
                          <p style={{ color: theme.colors.secondaryText }}>
                            {power.description}
                          </p>
                          <p style={{ color: theme.colors.accent }}>
                            Usos: {power.usesLeft}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: theme.colors.secondaryText }}>
                    No hay poderes aún.
                  </p>
                )}
              </div>
              <h3
                className="text-xl font-bold mb-4"
                style={{ color: theme.colors.text }}
              >
                Poderes Activos
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {publicUser.activePowers.length > 0 ? (
                  publicUser.activePowers.map((power) => (
                    <div
                      key={power.id}
                      className="p-4 rounded-md"
                      style={{
                        background: theme.colors.background,
                        border: `2px solid ${theme.colors.border}`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {power.image ? (
                          <img
                            src={power.image}
                            alt={power.name}
                            className="w-8 h-8"
                          />
                        ) : (
                          <span className="text-2xl">{power.emoji}</span>
                        )}
                        <div>
                          <p style={{ color: theme.colors.text }}>
                            {power.name}
                          </p>
                          <p style={{ color: theme.colors.secondaryText }}>
                            {power.description}
                          </p>
                          <p style={{ color: theme.colors.accent }}>
                            Duración: {power.remainingDuration}{" "}
                            {power.effect.durationType}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: theme.colors.secondaryText }}>
                    No hay poderes activos.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;
